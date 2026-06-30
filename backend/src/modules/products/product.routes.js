import express from 'express';
import * as productController from './product.controller.js';
import { createProductSchema, updateProductSchema } from './product.validator.js';
import authenticate, { optionalAuthenticate } from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';
import validate from '../../middlewares/validate.js';

const router = express.Router();

// Public routes
router.get('/', optionalAuthenticate, productController.getProducts);
router.get('/:id', optionalAuthenticate, productController.getProductById);

// Admin-only routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createProductSchema),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  productController.deleteProduct
);

export default router;
