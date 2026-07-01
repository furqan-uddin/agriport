import mongoose from 'mongoose';
import Order from './order.model.js';
import Product from '../products/product.model.js';
import Transaction from '../payments/transaction.model.js';
import User from '../users/user.model.js';
import CRMCustomer from '../crm/crmCustomer.model.js';
import eventBus from '../../events/index.js';
import SystemSetting from '../sales/systemSetting.model.js';
import { paginate } from '../../utils/paginate.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import { generateInvoice } from './invoice.service.js';
import notificationService from '../notifications/notification.service.js';

// Helper to resolve unit price based on price slabs
const resolveUnitPrice = (priceSlabs, quantity) => {
  if (!priceSlabs || priceSlabs.length === 0) {
    throw new AppError('Product has no defined pricing slabs.', 500);
  }
  // Sort slabs by minQty descending to find the highest threshold the quantity matches
  const sortedSlabs = [...priceSlabs].sort((a, b) => b.minQty - a.minQty);
  const matchingSlab = sortedSlabs.find((slab) => quantity >= slab.minQty);
  return matchingSlab ? matchingSlab.unitPrice : priceSlabs[0].unitPrice;
};

// 1. Create a new Order (Checkout)
export const createOrder = asyncWrapper(async (req, res, next) => {
  const { lines, paymentMode, deliveryAddress, pickupAddress, customerId, quotedPrices, quotedShipping } = req.body;

  if (!lines || lines.length === 0) {
    return next(new AppError('Order must contain at least one line item.', 400));
  }

  let finalCustomerId = req.user._id;
  let finalExecutiveId = null;
  let customerUser = req.user;

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (_sessionErr) {
    // Session creation failed (likely standalone local database without replica set support)
    // Fall back to non-transactional execution (still performs atomic `$inc` updates)
    session = null;
  }

  try {
    // If the order is placed by staff on behalf of a customer
    if (['executive', 'admin', 'manager'].includes(req.user.role)) {
      if (!customerId) {
        throw new AppError('Customer ID is required when placing an order as staff.', 400);
      }
      let cust = session 
        ? await User.findById(customerId).session(session)
        : await User.findById(customerId);
      
      if (!cust) {
        const crmCust = session
          ? await CRMCustomer.findById(customerId).session(session)
          : await CRMCustomer.findById(customerId);
        
        if (crmCust) {
          if (crmCust.platformUserId) {
            cust = session
              ? await User.findById(crmCust.platformUserId).session(session)
              : await User.findById(crmCust.platformUserId);
          }
          
          if (!cust) {
            const normalizedPhone = crmCust.phone ? crmCust.phone.trim() : '';
            if (normalizedPhone) {
              cust = session
                ? await User.findOne({ mobile: normalizedPhone, role: 'customer' }).session(session)
                : await User.findOne({ mobile: normalizedPhone, role: 'customer' });
            }
            
            if (!cust) {
              const uniqueMobile = normalizedPhone || `9${Math.random().toString().slice(2, 11)}`;
              const dummyEmail = `crm_${crmCust._id}@agriport.in`;
              
              const createdUsers = await User.create([{
                name: crmCust.name,
                email: dummyEmail,
                mobile: uniqueMobile,
                role: 'customer',
                status: 'active',
                companyName: crmCust.company || crmCust.name,
                city: crmCust.city || 'Mumbai',
                businessType: 'Wholesaler'
              }], session ? { session } : {});
              
              cust = createdUsers[0];
            }
            
            crmCust.platformUserId = cust._id;
            await crmCust.save(session ? { session } : {});
          }
        }
      }

      if (!cust) {
        throw new AppError('Customer not found.', 404);
      }
      finalCustomerId = cust._id;
      finalExecutiveId = req.user.role === 'executive' ? req.user._id : null;
      customerUser = cust;
    }

    const resolvedLines = [];
    let subtotal = 0;

    // Process and validate each line item
    for (const item of lines) {
      const product = session
        ? await Product.findById(item.productId).session(session)
        : await Product.findById(item.productId);
      if (!product) {
        throw new AppError(`Product with ID "${item.productId}" not found.`, 404);
      }

      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity < 1) {
        throw new AppError(`Invalid quantity for product: ${product.name}`, 400);
      }

      // Only decrement stock during order creation if placed by staff/executive (direct sales)
      const isDirectSale = ['executive', 'admin', 'manager'].includes(req.user.role);
      if (isDirectSale) {
        // Perform atomic check-and-decrement to prevent overselling
        const updateQuery = { _id: item.productId, stock: { $gte: quantity } };
        const updateDoc = { $inc: { stock: -quantity } };
        const updateOptions = session ? { session } : {};

        const updateResult = await Product.updateOne(updateQuery, updateDoc, updateOptions);

        if (updateResult.modifiedCount === 0) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Available: ${product.stock || 0}, Requested: ${quantity}`,
            400
          );
        }

        // Also decrement the specific sizeVariant.stock if variant info provided
        if (item.variantSize) {
          const freshProduct = session
            ? await Product.findById(item.productId).session(session)
            : await Product.findById(item.productId);
          if (freshProduct) {
            const variant = freshProduct.sizeVariants.find(
              (v) => v.size === item.variantSize &&
                (v.packingType || 'Cartoon') === (item.variantPackingType || 'Cartoon')
            );
            if (variant) {
              variant.stock = Math.max(0, (variant.stock || 0) - quantity);
              // Use updateOne to avoid re-triggering stock sum in pre-save
              // We skip the pre-save hook by using findByIdAndUpdate with $set on specific variant
              await Product.updateOne(
                { _id: freshProduct._id, 'sizeVariants._id': variant._id },
                { $set: { 'sizeVariants.$.stock': variant.stock } },
                session ? { session } : {}
              );
            }
          }
        }
      }

      // Resolve pricing: check for staff quoted price first, then fall back to lot priceSlabs if present
      let unitPrice = 0;
      if (['executive', 'admin', 'manager'].includes(req.user.role) && quotedPrices && quotedPrices[product._id.toString()] !== undefined) {
        unitPrice = Number(quotedPrices[product._id.toString()]);
      } else if (product.priceSlabs && product.priceSlabs.length > 0) {
        const resolveUnitPriceHelper = (priceSlabs, qty) => {
          const sorted = [...priceSlabs].sort((a, b) => b.minQty - a.minQty);
          const match = sorted.find((s) => qty >= s.minQty);
          return match ? match.unitPrice : priceSlabs[0].unitPrice;
        };
        unitPrice = resolveUnitPriceHelper(product.priceSlabs, quantity);
      }
      const lineTotal = unitPrice * quantity;

      resolvedLines.push({
        productId: product._id,
        name: product.name,
        image: '',
        quantity,
        unit: product.unit || 'pcs',
        unitPrice,
        lineTotal,
        specifications: item.specifications || {},
        variantSize: item.variantSize || '',
        variantPackingType: item.variantPackingType || '',
      });

      subtotal += lineTotal;
    }

    // Financial calculations
    const tax = 0;
    const shipping = 0;
    const total = subtotal;

    // Build order object
    const orderData = {
      customerId: finalCustomerId,
      executiveId: finalExecutiveId,
      paymentMode: paymentMode || 'offline',
      lines: resolvedLines,
      subtotal,
      tax,
      shipping,
      total,
      deliveryAddress,
      pickupAddress: pickupAddress || '',
      customerName: customerUser.name,
      companyName: customerUser.companyName || '',
      customerPhone: customerUser.mobile,
      customerCity: customerUser.city || '',
      quotedPrices: req.user.role === 'executive' ? quotedPrices : {},
      quotedShipping: req.user.role === 'executive' ? quotedShipping : undefined,
    };

    let orderDoc;
    if (session) {
      const orders = await Order.create([orderData], { session });
      orderDoc = orders[0];
    } else {
      orderDoc = await Order.create(orderData);
    }

    // Automatically create a corresponding Transaction for tracking
    const transactionData = {
      orderId: orderDoc._id,
      orderRef: orderDoc.reference,
      customerId: finalCustomerId,
      amount: orderDoc.total,
      mode: orderDoc.paymentMode,
      status: 'pending',
    };

    if (session) {
      await Transaction.create([transactionData], { session });
    } else {
      await Transaction.create(transactionData);
    }

    // Commit the transaction
    if (session) {
      await session.commitTransaction();
    }

    // Emit order.placed event asynchronously after successful transaction commit
    eventBus.emit('order.placed', orderDoc);
    if (orderDoc.paymentMode === 'offline' || orderDoc.paymentMode === 'bank_transfer') {
      eventBus.emit('payment.submitted', { order: orderDoc, amount: orderDoc.total });
    }

    // ── WhatsApp Invoice Notification (for direct staff sales only) ──────────
    // Fire-and-forget: errors here must NOT fail the API response
    if (['executive', 'admin', 'manager'].includes(req.user.role)) {
      (async () => {
        try {
          // Fetch the freshly saved order (includes shareToken from pre-save hook)
          const savedOrder = await Order.findById(orderDoc._id);
          if (!savedOrder) return;

          await generateInvoice(savedOrder);

          const phone = savedOrder.customerPhone;
          if (phone) {
            const backendBase = process.env.BASE_URL || 'http://localhost:5000';
            const invoiceUrl = `${backendBase}/api/v1/orders/${savedOrder._id}/invoice?shareToken=${savedOrder.shareToken}`;
            const lineItems = (savedOrder.lines || []).map(l =>
              `  • ${l.name} — ${l.quantity} ${l.unit} @ ₹${l.unitPrice} = ₹${l.lineTotal}`
            ).join('\n');
            const whatsappMessage =
              `Dear ${savedOrder.customerName},\n` +
              `Thank you for your purchase from Agriport!\n\n` +
              `Order: ${savedOrder.reference}\n` +
              `${lineItems ? lineItems + '\n' : ''}` +
              `Total: ₹${savedOrder.total.toFixed(2)}\n\n` +
              `Your invoice is attached below. Thank you for choosing Agriport!`;
            notificationService.sendWhatsApp(phone, whatsappMessage, invoiceUrl);
          }
        } catch (notifErr) {
          // Non-critical — log and continue
          const loggerMod = await import('../../config/logger.js');
          loggerMod.default.error('[createOrder] WhatsApp/PDF notification error:', notifErr);
        }
      })();
    }
    // ────────────────────────────────────────────────────────────────────────

    return successResponse(res, orderDoc, 201, 'Order placed successfully.');
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    return next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// 2. Get orders (with filters and pagination)
export const getOrders = asyncWrapper(async (req, res) => {
  const { status } = req.query;

  let queryObj = {};
  if (req.user.role === 'customer') {
    queryObj.customerId = req.user._id;
  } else if (req.user.role === 'executive') {
    // Executives see all orders (shared pick-up queue)
    queryObj = {};
  } else if (req.user.role === 'admin' || req.user.role === 'manager') {
    queryObj = {};
  } else {
    queryObj = { _id: null };
  }

  if (status) {
    queryObj.status = status;
  }

  const result = await paginate(Order, queryObj, req.query, {
    sort: { createdAt: -1 },
    populate: [
      { path: 'executiveId', select: 'name email role' }
    ]
  });

  return successResponse(
    res,
    {
      orders: result.docs,
      pagination: result.pagination,
    },
    200,
    'Orders retrieved successfully.'
  );
});

// 3. Get specific order details
export const getOrderById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  // Restrict access based on role-based ownership boundaries
  let isAuthorized = false;

  if (req.user.role === 'admin' || req.user.role === 'manager') {
    isAuthorized = true;
  } else if (req.user.role === 'customer') {
    isAuthorized = order.customerId.toString() === req.user._id.toString();
  } else if (req.user.role === 'executive') {
    isAuthorized = true; // Executives can view all orders/enquiries in the shared pool
  }

  if (!isAuthorized) {
    return next(new AppError('You are not authorized to view this order.', 403));
  }

  return successResponse(res, order, 200, 'Order retrieved successfully.');
});

// 4. Get all orders (Admin/Manager only)
export const getAdminOrders = asyncWrapper(async (req, res) => {
  const { status, paymentStatus, customerId, search } = req.query;

  const queryObj = {};

  if (status) queryObj.status = status;
  if (paymentStatus) queryObj.paymentStatus = paymentStatus;
  if (customerId) queryObj.customerId = customerId;

  if (search) {
    queryObj.$or = [
      { reference: new RegExp(search, 'i') },
      { customerName: new RegExp(search, 'i') },
      { companyName: new RegExp(search, 'i') },
      { customerPhone: new RegExp(search, 'i') },
    ];
  }

  const result = await paginate(Order, queryObj, req.query, {
    sort: { createdAt: -1 },
    populate: [
      { path: 'executiveId', select: 'name email role' }
    ]
  });

  return successResponse(
    res,
    {
      orders: result.docs,
      pagination: result.pagination,
    },
    200,
    'Admin orders retrieved successfully.'
  );
});

// 5. Update order status (Admin only)
export const updateOrderStatus = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!status) {
    return next(new AppError('Status is required.', 400));
  }

  const order = await Order.findById(id);
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  // Prevent modifications if already finalized
  if (['completed', 'cancelled'].includes(order.status)) {
    return next(new AppError(`Cannot change status of a finalized "${order.status}" order.`, 400));
  }

  order.status = status;

  // Update tracking timeline
  const trackingLabelMap = {
    confirmed: 'Confirmed',
    completed: 'Delivered',
  };

  if (trackingLabelMap[status]) {
    const timelineItem = order.trackingTimeline.find((t) => t.label === trackingLabelMap[status]);
    if (timelineItem) {
      timelineItem.at = new Date();
      timelineItem.done = true;
    }
  } else if (status === 'cancelled') {
    order.cancellationReason = reason || 'Cancelled by Admin';

    // Restore flat stock levels for each product in the order
    for (const line of order.lines) {
      const product = await Product.findById(line.productId);
      if (product) {
        product.stock += line.quantity;
        // Also restore specific variant stock if variant info present
        if (line.variantSize) {
          const variant = product.sizeVariants.find(
            (v) => v.size === line.variantSize &&
              (v.packingType || 'Cartoon') === (line.variantPackingType || 'Cartoon')
          );
          if (variant) {
            variant.stock = (variant.stock || 0) + line.quantity;
          }
        }
        await product.save();
      }
    }
  }

  await order.save();

  if (status === 'confirmed') {
    eventBus.emit('order.confirmed', order);
  } else if (status === 'completed') {
    eventBus.emit('order.delivered', order);
  } else if (status === 'cancelled') {
    eventBus.emit('order.cancelled', { order, cancelledBy: req.user, reason: order.cancellationReason });
  }

  return successResponse(res, order, 200, `Order status updated to "${status}" successfully.`);
});

// 6. Download order invoice PDF (Authenticated OR via Share Token)
export const downloadInvoice = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { shareToken } = req.query;

  const order = await Order.findById(id);
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  // Security Check: Authorized if standard auth user is owner/staff, OR if valid shareToken is provided
  let isAuthorized = false;

  // 1. Try Share Token verification first
  if (shareToken && order.shareToken && shareToken === order.shareToken) {
    isAuthorized = true;
  }

  // 2. Fallback: Try JWT manual verification if not verified by shareToken
  if (!isAuthorized) {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const authUser = await User.findById(decoded.id);
        if (authUser && authUser.status === 'active') {
          if (authUser.role === 'admin' || authUser.role === 'manager') {
            isAuthorized = true;
          } else if (authUser.role === 'customer') {
            isAuthorized = order.customerId.toString() === authUser._id.toString();
          } else if (authUser.role === 'executive') {
            isAuthorized = true; // Executives can view invoices for any order/enquiry in the shared pool
          }
        }
      } catch (err) {
        // Token verification failed or user suspended, isAuthorized remains false
      }
    }
  }

  if (!isAuthorized) {
    return next(new AppError('You are not authorized to view this invoice.', 403));
  }

  // Ensure invoice directory and file exist
  const secureDir = path.join(process.cwd(), 'uploads', 'secure_invoices');
  const filePath = path.join(secureDir, `${order.reference}.pdf`);

  if (!fs.existsSync(filePath)) {
    // Generate invoice on demand
    try {
      await generateInvoice(order);
    } catch (err) {
      return next(new AppError('Failed to generate invoice PDF.', 500));
    }
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice_${order.invoiceNo || order.reference}.pdf"`);
  return fs.createReadStream(filePath).pipe(res);
});

// 7. Executive quote or cancel order
export const quoteOrder = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { status, quotedPrices, quotedShipping, reason } = req.body;

  if (!status) {
    return next(new AppError('Status is required.', 400));
  }

  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    return next(new AppError('Invalid status update for quote.', 400));
  }

  const order = await Order.findById(id);
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }
  const wasPlaced = order.status === 'placed';

  // Check authorization: only admin, manager, or assigned executive / crm owner
  if (req.user.role === 'executive') {
    // Any executive can quote. If the order doesn't have an assigned handler, assign them
    if (!order.executiveId) {
      order.executiveId = req.user._id;
    }
  }

  // Prevent modifications if already finalized
  if (['completed', 'cancelled'].includes(order.status)) {
    return next(new AppError(`Cannot change status of a finalized "${order.status}" order.`, 400));
  }

  if (status === 'confirmed') {
    // If the order is not already confirmed, check and decrement stock
    if (order.status !== 'confirmed') {
      for (const line of order.lines) {
        const product = await Product.findById(line.productId);
        if (!product) {
          return next(new AppError(`Product "${line.name}" not found.`, 404));
        }
        if (product.stock < line.quantity) {
          return next(new AppError(`Insufficient stock for "${product.name}". Available: ${product.stock || 0}, Requested: ${line.quantity}`, 400));
        }
        product.stock -= line.quantity;
        // Also decrement specific variant stock if variant info is present
        if (line.variantSize) {
          const variant = product.sizeVariants.find(
            (v) => v.size === line.variantSize &&
              (v.packingType || 'Cartoon') === (line.variantPackingType || 'Cartoon')
          );
          if (variant) {
            variant.stock = Math.max(0, (variant.stock || 0) - line.quantity);
          }
        }
        await product.save();
      }
    }

    order.status = 'confirmed';
    
    // Save quoted prices and shipping overrides
    if (quotedPrices) {
      const pricesMap = new Map(Object.entries(quotedPrices));
      order.quotedPrices = pricesMap;
      
      // Update line items
      let subtotal = 0;
      for (const line of order.lines) {
        const prodIdStr = line.productId.toString();
        if (quotedPrices[prodIdStr] !== undefined) {
          line.unitPrice = Number(quotedPrices[prodIdStr]);
        }
        line.lineTotal = line.unitPrice * line.quantity;
        subtotal += line.lineTotal;
      }
      order.subtotal = subtotal;
      order.tax = 0;
    }

    order.quotedShipping = 0;
    order.shipping = 0;
    
    order.total = order.subtotal;

    // Update tracking timeline Confirmed item
    const confirmedItem = order.trackingTimeline.find((t) => t.label === 'Confirmed');
    if (confirmedItem) {
      confirmedItem.at = new Date();
      confirmedItem.done = true;
    }
  } else if (status === 'cancelled') {
    // Only restore stock levels if the order was previously confirmed (stock was decremented)
    if (order.status === 'confirmed') {
      for (const line of order.lines) {
        const product = await Product.findById(line.productId);
        if (product) {
          product.stock += line.quantity;
          // Also restore specific variant stock
          if (line.variantSize) {
            const variant = product.sizeVariants.find(
              (v) => v.size === line.variantSize &&
                (v.packingType || 'Cartoon') === (line.variantPackingType || 'Cartoon')
            );
            if (variant) {
              variant.stock = (variant.stock || 0) + line.quantity;
            }
          }
          await product.save();
        }
      }
    }
    order.status = 'cancelled';
    order.cancellationReason = reason || 'Cancelled by Sales Executive';
    order.paymentStatus = 'refunded';
  } else if (status === 'completed') {
    order.status = 'completed';
    order.paymentStatus = 'paid';

    // Update tracking timeline Delivered item
    const deliveredItem = order.trackingTimeline.find((t) => t.label === 'Delivered');
    if (deliveredItem) {
      deliveredItem.at = new Date();
      deliveredItem.done = true;
    }
  }

  await order.save();

  if (status === 'confirmed') {
    if (wasPlaced) {
      eventBus.emit('order.quoted', order);
    }
    eventBus.emit('order.confirmed', order);
  } else if (status === 'completed') {
    eventBus.emit('order.delivered', order);
  } else if (status === 'cancelled') {
    eventBus.emit('order.cancelled', { order, cancelledBy: req.user, reason: order.cancellationReason });
  }

  return successResponse(res, order, 200, `Order status updated to "${status}" successfully.`);
});

