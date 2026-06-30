import express from 'express';
import * as reportsController from './reports.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Dashboard KPI stats (Admin/Manager only)
router.get('/dashboard-stats', authorize('admin', 'manager'), reportsController.getDashboardStats);

// Sales trends series (Admin only)
router.get('/sales-series', authorize('admin'), reportsController.getSalesSeries);

// Category Sales ratios (Admin only)
router.get('/category-sales', authorize('admin'), reportsController.getCategorySales);

// Export CSV reports (Admin only)
router.get('/export', authorize('admin'), reportsController.exportCSV);

export default router;
