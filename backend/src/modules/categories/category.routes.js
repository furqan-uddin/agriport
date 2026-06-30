import express from 'express';
import * as categoryController from './category.controller.js';
import authenticate, { optionalAuthenticate } from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';

const router = express.Router();

// Public routes
router.get('/', optionalAuthenticate, categoryController.getCategories);

// Admin-only protected routes
router.post('/', authenticate, authorize('admin'), categoryController.createCategory);
router.put('/:id', authenticate, authorize('admin'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), categoryController.deleteCategory);

export default router;
