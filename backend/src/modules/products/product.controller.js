import Product from './product.model.js';
import Category from '../categories/category.model.js';
import { paginate } from '../../utils/paginate.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';

// 1. Get all products with filtering, search, sorting and pagination (Public)
export const getProducts = asyncWrapper(async (req, res) => {
  const { search, category, isExecutive, page = 1, limit = 10 } = req.query;

  const queryObj = {};

  // Text search on indexed fields
  if (search) {
    queryObj.$text = { $search: search };
  }

  // Category filter
  if (category) {
    queryObj.category = category;
  }

  // Only return products in active categories for public users
  const isStaff = req.user && ['admin', 'manager', 'executive'].includes(req.user.role);
  if (!isStaff) {
    const activeCategories = await Category.find({ isActive: { $ne: false } }).select('_id');
    const activeCategoryIds = activeCategories.map(c => c._id);
    if (category) {
      if (!activeCategoryIds.some(id => id.toString() === category)) {
        return successResponse(
          res,
          {
            products: [],
            pagination: { totalDocs: 0, limit: Number(limit), page: Number(page), totalPages: 0 },
          },
          200,
          'Products retrieved successfully.'
        );
      }
    } else {
      queryObj.category = { $in: activeCategoryIds };
    }
  }

  // Sorting logic (Default: newest first)
  let sortObj = { createdAt: -1 };
  if (search) {
    sortObj = { score: { $meta: 'textScore' }, createdAt: -1 };
  }

  // If text search relevance is selected, project score
  const select = search ? { score: { $meta: 'textScore' } } : null;

  const result = await paginate(Product, queryObj, req.query, {
    sort: sortObj,
    populate: { path: 'category', select: 'name slug' },
    select
  });

  return successResponse(
    res,
    {
      products: result.docs,
      pagination: result.pagination,
    },
    200,
    'Products retrieved successfully.'
  );
});

// 2. Get a single product by ID (Public)
export const getProductById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate('category', 'name slug isActive');

  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  // If caller is not staff, verify product's category is active
  const isStaff = req.user && ['admin', 'manager', 'executive'].includes(req.user.role);
  if (!isStaff && product.category && product.category.isActive === false) {
    return next(new AppError('Product not found.', 404));
  }

  return successResponse(res, product, 200, 'Product retrieved successfully.');
});

// 3. Create product (Admin only)
export const createProduct = asyncWrapper(async (req, res, next) => {
  const { name, category, origin, grade, brand } = req.body;

  const product = await Product.create({
    name,
    category,
    origin,
    grade,
    brand: brand || '',
    isExecutiveOnly: false, // Set to false so it is public by default
  });

  const populatedProduct = await Product.findById(product._id).populate('category', 'name slug');
  return successResponse(res, populatedProduct, 201, 'Product created successfully.');
});

// 4. Update product (Admin only)
export const updateProduct = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name, category, origin, grade, brand } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  if (name) product.name = name;
  if (category) product.category = category;
  if (origin) product.origin = origin;
  if (grade) product.grade = grade;
  if (brand !== undefined) product.brand = brand;

  await product.save();

  const populatedProduct = await Product.findById(product._id).populate('category', 'name slug');
  return successResponse(res, populatedProduct, 200, 'Product updated successfully.');
});

// 5. Delete product (Admin only - hard-delete)
export const deleteProduct = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    return next(new AppError('Product not found.', 404));
  }

  await Product.deleteOne({ _id: id });

  return successResponse(res, null, 200, 'Product deleted successfully.');
});
