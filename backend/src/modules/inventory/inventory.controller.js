import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import StockRequest from './stockRequest.model.js';
import VendorPurchase from './vendorPurchase.model.js';
import Product from '../products/product.model.js';
import { paginate } from '../../utils/paginate.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';
import eventBus from '../../events/index.js';
import notificationService from '../notifications/notification.service.js';
import { generatePurchasePdf } from './purchase.service.js';

// Helper to look up or dynamically create a brand-specific product cloned from a base product
const getOrCreateBrandedProduct = async (baseProductId, brandName, session) => {
  const queryOpts = session ? { session } : {};
  const baseProduct = session
    ? await Product.findById(baseProductId).session(session)
    : await Product.findById(baseProductId);
  if (!baseProduct) {
    throw new AppError('Base product not found.', 404);
  }

  const cleanBrand = (brandName || '').trim();

  // If no brand is specified, or it matches the base product's brand, return base product
  if (!cleanBrand || (baseProduct.brand || '').trim().toLowerCase() === cleanBrand.toLowerCase()) {
    return baseProduct;
  }

  // Look for a product with the same name and the requested brand
  const query = {
    name: baseProduct.name,
    brand: cleanBrand,
    isArchived: { $ne: true }
  };
  let brandedProduct = await Product.findOne(query, null, queryOpts);

  if (!brandedProduct) {
    // Generate new SKU for cloned branded product
    const cleanName = (baseProduct.name || 'PROD').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newSku = `SKU-${cleanName.substring(0, 10)}-${rand}`;

    // Auto-create/clone the base product under the new brand!
    const newProductData = {
      name: baseProduct.name,
      sku: newSku,
      category: baseProduct.category,
      origin: baseProduct.origin,
      grade: baseProduct.grade,
      brand: cleanBrand,
      stock: 0,
      unit: baseProduct.unit || 'pcs',
      isExecutiveOnly: baseProduct.isExecutiveOnly,
      images: baseProduct.images || [],
      description: baseProduct.description || '',
      moq: baseProduct.moq || 1,
      status: 'out_of_stock',
      priceSlabs: baseProduct.priceSlabs || [],
      sizeVariants: [],
      specifications: {},
    };

    if (session) {
      const created = await Product.create([newProductData], { session });
      brandedProduct = created[0];
    } else {
      brandedProduct = await Product.create(newProductData);
    }

    // Set specifications safely on the map
    brandedProduct.specifications.set('Grade', baseProduct.specifications.get('Grade') || baseProduct.grade);
    brandedProduct.specifications.set('Origin', baseProduct.specifications.get('Origin') || baseProduct.origin);
    brandedProduct.specifications.set('Brand Name', cleanBrand);
    await brandedProduct.save(queryOpts);
  }

  return brandedProduct;
};

// Helper to update product stock, size variants, specifications, origin, images and leadTimeDays
// NOTE: stockChange is now the CARTON COUNT (not kg weight).
// product.stock is automatically recomputed from sizeVariants sum by the Product pre-save hook.
const updateProductStockAndDetails = async (productId, { type, sizeVariants, specifications, images, origin, leadTimeDays }, session) => {
  const queryOpts = session ? { session } : {};
  const product = session
    ? await Product.findById(productId).session(session)
    : await Product.findById(productId);
  if (!product) {
    throw new AppError('Product associated with this stock request/purchase not found.', 404);
  }

  // 1. Update sizeVariants
  if (sizeVariants && sizeVariants.length > 0) {
    if (type === 'add') {
      product.sizeVariants = product.sizeVariants || [];
      for (const newVar of sizeVariants) {
        const existingVar = product.sizeVariants.find(
          (v) => v.size === newVar.size && (v.packingType || 'Cartoon') === (newVar.packingType || 'Cartoon')
        );
        if (existingVar) {
          // Add carton counts
          existingVar.stock = (existingVar.stock || 0) + newVar.stock;
          if (newVar.price) existingVar.price = newVar.price;
          if (newVar.netWeight) existingVar.netWeight = newVar.netWeight;
          if (newVar.grossWeight) existingVar.grossWeight = newVar.grossWeight;
        } else {
          product.sizeVariants.push(newVar);
        }
      }
    } else {
      // For update/new_product, replace variants entirely
      product.sizeVariants = sizeVariants;
    }
  } else if (type === 'new_product') {
    product.sizeVariants = [];
  }

  // 2. product.stock is auto-recomputed in pre-save hook from sizeVariants sum
  //    But for products with no sizeVariants (legacy), handle gracefully:
  if (!product.sizeVariants || product.sizeVariants.length === 0) {
    if (type === 'update' || type === 'new_product') {
      product.stock = 0;
    }
  }

  // 3. Update specifications
  if (specifications) {
    const specsMap = specifications instanceof Map ? specifications : new Map(Object.entries(specifications));
    for (const [key, val] of specsMap.entries()) {
      product.specifications.set(key, val);
    }
  }

  // 4. Update images
  if (images && images.length > 0) {
    product.images = images;
  }

  // 5. Update origin
  if (origin) {
    product.origin = origin;
  }

  // 6. Update leadTimeDays if present
  if (leadTimeDays) {
    product.specifications.set('Lead Time', leadTimeDays.toString());
  }

  await product.save(queryOpts);
  return product;
};

// 1. Get all stock requests (Admin/Manager only)
export const getAdminStockRequests = asyncWrapper(async (req, res) => {
  const { status, requesterId, category } = req.query;

  const queryObj = {};

  if (status) queryObj.status = status;
  if (category) queryObj.category = category;

  if (req.user.role === 'executive') {
    queryObj.requesterId = req.user._id;
  } else if (requesterId) {
    queryObj.requesterId = requesterId;
  }

  const result = await paginate(StockRequest, queryObj, req.query, {
    sort: { createdAt: -1 },
    populate: [
      { path: 'requesterId', select: 'name email mobile role' },
      { path: 'reviewedBy', select: 'name email role' }
    ]
  });

  return successResponse(
    res,
    {
      stockRequests: result.docs,
      pagination: result.pagination,
    },
    200,
    'Stock requests retrieved successfully.'
  );
});

// 2. Approve or reject a stock request (Admin only)
export const updateStockRequestStatus = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return next(new AppError('Status must be either "approved" or "rejected".', 400));
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (_sessionErr) {
    session = null;
  }

  try {
    const stockRequest = session
      ? await StockRequest.findById(id).session(session)
      : await StockRequest.findById(id);
    if (!stockRequest) {
      throw new AppError('Stock request not found.', 404);
    }

    if (stockRequest.status !== 'pending') {
      throw new AppError(`Stock request is already processed and is "${stockRequest.status}".`, 400);
    }

    if (status === 'rejected') {
      if (!rejectionReason) {
        throw new AppError('Rejection reason is required when status is "rejected".', 400);
      }
      stockRequest.status = 'rejected';
      stockRequest.rejectionReason = rejectionReason;
      stockRequest.reviewedBy = req.user._id;
      stockRequest.reviewedAt = new Date();
      
      if (session) {
        await stockRequest.save({ session });
        await session.commitTransaction();
      } else {
        await stockRequest.save();
      }

      eventBus.emit('stockRequest.rejected', { stockRequest, reviewerId: req.user._id, reason: rejectionReason });

      return successResponse(res, stockRequest, 200, 'Stock request rejected successfully.');
    }

    // If approved: update product stock and details
    const product = await updateProductStockAndDetails(
      stockRequest.productId,
      {
        type: stockRequest.type,
        sizeVariants: stockRequest.sizeVariants,
        specifications: stockRequest.specifications,
        images: stockRequest.images,
        origin: stockRequest.origin,
        leadTimeDays: stockRequest.leadTimeDays,
      },
      session
    );

    stockRequest.status = 'approved';
    stockRequest.reviewedBy = req.user._id;
    stockRequest.reviewedAt = new Date();
    
    if (session) {
      await stockRequest.save({ session });
      await session.commitTransaction();
    } else {
      await stockRequest.save();
    }

    eventBus.emit('stockRequest.approved', { stockRequest, reviewerId: req.user._id });

    return successResponse(
      res,
      { stockRequest, newStock: product.stock },
      200,
      'Stock request approved and product stock updated successfully.'
    );
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

// 3. Create a stock request (Executive/Manager only)
export const createStockRequest = asyncWrapper(async (req, res, next) => {
  const { productId, type, requestedChange, notes, specifications, images, sizeVariants, origin, leadTimeDays } = req.body;

  if (!productId || !type || requestedChange === undefined) {
    return next(new AppError('Product ID, request type, and requested change quantity are required.', 400));
  }

  const brand = req.body.brand || (specifications && specifications['Brand Name']) || '';
  const product = await getOrCreateBrandedProduct(productId, brand);

  // requestedChange is now the CARTON COUNT = sum of all variant stock counts
  const stockRequest = await StockRequest.create({
    productId: product._id,
    productName: product.name,
    category: product.category ? product.category.toString() : 'General',
    requesterId: req.user._id,
    requesterRole: req.user.role,
    type,
    currentStock: product.stock || 0,
    requestedChange: Number(requestedChange),
    notes: notes || '',
    status: 'pending',
    specifications: specifications || {},
    images: images || [],
    sizeVariants: sizeVariants || [],
    origin: origin || '',
    leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 0,
  });

  eventBus.emit('stockRequest.created', stockRequest);

  return successResponse(res, stockRequest, 201, 'Stock request raised successfully.');
});

// 4. Get all vendor purchases (Executive/Manager only)
export const getVendorPurchases = asyncWrapper(async (req, res) => {
  const queryObj = {};

  // Restrict list to owner if they are not admin
  if (req.user.role !== 'admin') {
    queryObj.purchasedBy = req.user._id;
  }

  const result = await paginate(VendorPurchase, queryObj, req.query, {
    sort: { purchaseDate: -1 },
    populate: [
      { path: 'purchasedBy', select: 'name email role mobile' }
    ]
  });

  return successResponse(
    res,
    {
      purchases: result.docs,
      pagination: result.pagination,
    },
    200,
    'Vendor purchases retrieved successfully.'
  );
});

// 5. Create a new vendor purchase (Executive/Manager only)
export const createVendorPurchase = asyncWrapper(async (req, res, next) => {
  const {
    vendorName, productId, unit, buyPrice, purchaseDate,
    notes, status, specifications, sizeVariants, images, origin, leadTimeDays, brand, vendorPhone
  } = req.body;

  if (!vendorName || !productId || !buyPrice || !purchaseDate) {
    return next(new AppError('Vendor name, Product ID, buy price, and purchase date are required.', 400));
  }

  if (!sizeVariants || sizeVariants.length === 0) {
    return next(new AppError('At least one size variant is required.', 400));
  }

  // Quantity is total carton count across all variants
  const qty = sizeVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  if (qty < 1) {
    return next(new AppError('Total quantity (sum of variant carton counts) must be at least 1.', 400));
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (_sessionErr) {
    session = null;
  }

  try {
    const product = await getOrCreateBrandedProduct(productId, brand, session);

    const price = Number(buyPrice);
    const total = qty * price;
    const purchaseStatus = status || 'pending';

    const purchaseData = {
      purchasedBy: req.user._id,
      vendorName,
      vendorPhone: vendorPhone || '',
      productId: product._id,
      productName: product.name,
      brand: brand || product.brand || '',
      quantity: qty,
      unit: unit || product.unit || 'pcs',
      buyPrice: price,
      total,
      purchaseDate: new Date(purchaseDate),
      status: purchaseStatus,
      notes: notes || '',
      sizeVariants: sizeVariants || [],
      specifications: specifications || {},
      images: images || [],
      origin: origin || product.origin || '',
      leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 0,
    };

    let purchaseDoc;
    if (session) {
      const purchases = await VendorPurchase.create([purchaseData], { session });
      purchaseDoc = purchases[0];
    } else {
      purchaseDoc = await VendorPurchase.create(purchaseData);
    }

    // If already received, immediately update stock and details
    if (purchaseStatus === 'received') {
      await updateProductStockAndDetails(
        product._id,
        {
          type: 'add',
          sizeVariants,
          specifications,
          images,
          origin,
          leadTimeDays,
        },
        session
      );
    }

    if (session) {
      await session.commitTransaction();
    }

    eventBus.emit('vendorPurchase.created', { purchase: purchaseDoc, purchaser: req.user });

    // ── WhatsApp + PDF notification ──────────────────────────────────────────
    // Fire-and-forget: errors here must NOT fail the API response
    (async () => {
      try {
        await generatePurchasePdf(purchaseDoc);
        const phone = purchaseDoc.vendorPhone || vendorPhone || '';
        if (phone) {
          const backendBase = process.env.BASE_URL || 'http://localhost:5000';
          const pdfUrl = `${backendBase}/api/v1/inventory/vendor-purchases/${purchaseDoc._id}/pdf?shareToken=${purchaseDoc.shareToken}`;
          const variantLines = (purchaseDoc.sizeVariants || []).map(v =>
            `  • ${v.size} — ${v.stock} cartons @ ₹${v.price || purchaseDoc.buyPrice}`
          ).join('\n');
          const whatsappMessage =
            `Dear ${purchaseDoc.vendorName},\n` +
            `Agriport has placed a Purchase Order for the following:\n\n` +
            `Product: ${purchaseDoc.productName}` +
            (purchaseDoc.brand ? ` (${purchaseDoc.brand})` : '') + `\n` +
            (variantLines ? `${variantLines}\n` : `Quantity: ${purchaseDoc.quantity} ${purchaseDoc.unit}\n`) +
            `Total Value: ₹${purchaseDoc.total.toFixed(2)}\n\n` +
            `Please find the Purchase Order attached below.`;
          notificationService.sendWhatsApp(phone, whatsappMessage, pdfUrl);
        }
      } catch (notifErr) {
        // Non-critical — log and continue
        const logger = (await import('../../config/logger.js')).default;
        logger.error('[createVendorPurchase] WhatsApp/PDF notification error:', notifErr);
      }
    })();
    // ────────────────────────────────────────────────────────────────────────

    return successResponse(res, purchaseDoc, 201, 'Vendor purchase logged successfully.');
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

// 6. Download a vendor purchase PDF (via shareToken)
export const downloadPurchasePdf = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { shareToken } = req.query;

  const purchase = await VendorPurchase.findById(id);
  if (!purchase) {
    return next(new AppError('Purchase record not found.', 404));
  }

  // Authorization: shareToken match OR authenticated admin/manager/executive
  let isAuthorized = false;

  if (shareToken && purchase.shareToken && shareToken === purchase.shareToken) {
    isAuthorized = true;
  }

  if (!isAuthorized && req.user) {
    if (['admin', 'manager', 'executive'].includes(req.user.role)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return next(new AppError('You are not authorized to view this purchase document.', 403));
  }

  const secureDir = path.join(process.cwd(), 'uploads', 'secure_purchases');
  const filePath = path.join(secureDir, `${purchase._id}.pdf`);

  if (!fs.existsSync(filePath)) {
    // Generate on demand if file is missing
    try {
      await generatePurchasePdf(purchase);
    } catch (err) {
      return next(new AppError('Failed to generate purchase PDF.', 500));
    }
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="purchase_order_${purchase._id}.pdf"`);
  return fs.createReadStream(filePath).pipe(res);
});
