import express from 'express';
import * as inventoryController from './inventory.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all stock requests (Admin/Manager/Executive)
router.get('/stock-requests', authorize('admin', 'manager', 'executive'), inventoryController.getAdminStockRequests);

// Approve or reject a stock request (Admin only)
router.patch('/stock-requests/:id', authorize('admin'), inventoryController.updateStockRequestStatus);

// Raise a stock request (Executive/Manager/Admin)
router.post('/stock-requests', authorize('executive', 'manager', 'admin'), inventoryController.createStockRequest);

// Vendor procurement routes (Executive/Manager/Admin)
router.get('/vendor-purchases', authorize('executive', 'manager', 'admin'), inventoryController.getVendorPurchases);
router.post('/vendor-purchases', authorize('executive', 'manager', 'admin'), inventoryController.createVendorPurchase);

export default router;
