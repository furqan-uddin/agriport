import Category from './category.model.js';
import mongoose from 'mongoose';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import { successResponse } from '../../utils/apiResponse.js';

// 1. Get all categories sorted alphabetically by name (Public)
export const getCategories = asyncWrapper(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const matchStage = isAdmin ? {} : { isActive: { $ne: false } };

  const categories = await Category.aggregate([
    {
      $match: matchStage
    },
    {
      $lookup: {
        from: 'products',
        let: { catId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$category', '$$catId'] },
                  { $ne: ['$isArchived', true] }
                ]
              }
            }
          }
        ],
        as: 'activeProducts'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        productCount: { $size: '$activeProducts' }
      }
    },
    {
      $sort: { name: 1 }
    }
  ]);
  return successResponse(res, categories, 200, 'Categories retrieved successfully.');
});

// 2. Create category (Admin only)
export const createCategory = asyncWrapper(async (req, res, next) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return next(new AppError('Category name is required.', 400));
  }

  // Generate slug to verify uniqueness case-insensitively
  const slug = name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

  const exists = await Category.findOne({ slug });
  if (exists) {
    return next(new AppError('Category with this name already exists.', 409));
  }

  const category = await Category.create({ name: name.trim() });
  return successResponse(res, category, 201, 'Category created successfully.');
});

// 3. Update category (Admin only)
export const updateCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    return next(new AppError('Category not found.', 404));
  }

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) {
      return next(new AppError('Category name is required.', 400));
    }

    // Generate slug to verify uniqueness case-insensitively excluding current category
    const slug = trimmed
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

    const exists = await Category.findOne({ slug, _id: { $ne: id } });
    if (exists) {
      return next(new AppError('Category with this name already exists.', 409));
    }

    category.name = trimmed;
  }

  if (isActive !== undefined) {
    category.isActive = isActive;
  }

  await category.save();
  return successResponse(res, category, 200, 'Category updated successfully.');
});

// 4. Delete category (Admin only)
export const deleteCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const category = await Category.findById(id);
  if (!category) {
    return next(new AppError('Category not found.', 404));
  }

  // Check if there are active products under this category
  // Using dynamic model query to avoid circular dependency crashes
  const Product = mongoose.models.Product || mongoose.model('Product');
  if (Product) {
    const productsCount = await Product.countDocuments({ category: id });
    if (productsCount > 0) {
      return next(new AppError('Cannot delete category because it contains active products.', 400));
    }
  }

  await Category.deleteOne({ _id: id });
  return successResponse(res, null, 200, 'Category deleted successfully.');
});
