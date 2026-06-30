import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Category from '../src/modules/categories/category.model.js';
import Product from '../src/modules/products/product.model.js';

const runTest = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to DB');

  const categories = await Category.aggregate([
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
        name: 1,
        productCount: { $size: '$activeProducts' }
      }
    }
  ]);
  console.log('Categories results:', JSON.stringify(categories, null, 2));

  await mongoose.disconnect();
};

runTest();
