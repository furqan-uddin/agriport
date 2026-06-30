import mongoose from 'mongoose';
import StockRequest from './stockRequest.model.js';
import VendorPurchase from './vendorPurchase.model.js';
import Product from '../products/product.model.js';
import { paginate } from '../../utils/paginate.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';
import eventBus from '../../events/index.js';

// Helper to update product stock, size variants, specifications, origin, images and leadTimeDays
const updateProductStockAndDetails = async (productId, { stockChange, type, sizeVariants, specifications, images, origin, leadTimeDays }, session) => {
  const queryOpts = session ? { session } : {};
  const product = session
    ? await Product.findById(productId).session(session)
    : await Product.findById(productId);
  if (!product) {
    throw new AppError('Product associated with this stock request/purchase not found.', 404);
  }

  // 1. Update stock
  if (type === 'add') {
    product.stock = (product.stock || 0) + stockChange;
  } else if (type === 'update' || type === 'new_product') {
    product.stock = stockChange;
  } else {
    throw new AppError('Invalid update type.', 400);
  }

  if (product.stock < 0) {
    throw new AppError('Stock operation would result in negative product stock.', 400);
  }

  // 2. Update sizeVariants
  if (sizeVariants && sizeVariants.length > 0) {
    if (type === 'add') {
      product.sizeVariants = product.sizeVariants || [];
      for (const newVar of sizeVariants) {
        const existingVar = product.sizeVariants.find(
          (v) => v.size === newVar.size && (v.packingType || 'Cartoon') === (newVar.packingType || 'Cartoon')
        );
        if (existingVar) {
          existingVar.stock = (existingVar.stock || 0) + newVar.stock;
          if (newVar.price) existingVar.price = newVar.price;
          if (newVar.netWeight) existingVar.netWeight = newVar.netWeight;
          if (newVar.grossWeight) existingVar.grossWeight = newVar.grossWeight;
        } else {
          product.sizeVariants.push(newVar);
        }
      }
    } else {
      product.sizeVariants = sizeVariants;
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

    // If approved:
    const product = await updateProductStockAndDetails(
      stockRequest.productId,
      {
        stockChange: stockRequest.requestedChange,
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

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  const stockRequest = await StockRequest.create({
    productId,
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
  const { vendorName, productId, quantity, unit, buyPrice, purchaseDate, notes, status, specifications } = req.body;

  if (!vendorName || !productId || !quantity || !buyPrice || !purchaseDate) {
    return next(new AppError('Vendor name, Product ID, quantity, buy price, and purchase date are required.', 400));
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (_sessionErr) {
    session = null;
  }

  try {
    const product = session
      ? await Product.findById(productId).session(session)
      : await Product.findById(productId);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const qty = Number(quantity);
    const price = Number(buyPrice);
    const total = qty * price;
    const purchaseStatus = status || 'pending';

    const purchaseData = {
      purchasedBy: req.user._id,
      vendorName,
      productId,
      productName: product.name,
      quantity: qty,
      unit: unit || product.unit || 'kg',
      buyPrice: price,
      total,
      purchaseDate: new Date(purchaseDate),
      status: purchaseStatus,
      notes: notes || '',
    };

    let purchaseDoc;
    if (session) {
      const purchases = await VendorPurchase.create([purchaseData], { session });
      purchaseDoc = purchases[0];
    } else {
      purchaseDoc = await VendorPurchase.create(purchaseData);
    }

    // Update product images if provided
    if (req.body.images && req.body.images.length > 0) {
      const imgUpdateOpts = session ? { session } : {};
      await Product.findByIdAndUpdate(
        productId,
        { $set: { images: req.body.images } },
        imgUpdateOpts
      );
    }

    // If already received, immediately add to stock and update specifications atomically
    if (purchaseStatus === 'received') {
      await updateProductStockAndDetails(
        productId,
        {
          stockChange: qty,
          type: 'add',
          sizeVariants: req.body.sizeVariants,
          specifications,
          images: req.body.images,
          origin: req.body.origin,
          leadTimeDays: req.body.leadTimeDays,
        },
        session
      );
    }

    if (session) {
      await session.commitTransaction();
    }

    eventBus.emit('vendorPurchase.created', { purchase: purchaseDoc, purchaser: req.user });

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
