import express from 'express';
import * as salesController from './sales.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';

const router = express.Router();

// Protect all routes with authentication
router.use(authenticate);

// Executive specific routes
router.get('/executive/stats', authorize('executive'), salesController.getExecutiveStats);
router.get('/executive/incentives', authorize('executive'), salesController.getIncentiveSeries);
router.get('/executive/records', authorize('executive'), salesController.getSalesRecords);

// Manager specific routes
router.get('/manager/stats', authorize('manager'), salesController.getManagerStats);
router.get('/manager/executives', authorize('manager'), salesController.getExecutives);
router.get('/manager/records', authorize('manager'), salesController.getManagerSalesRecords);

export default router;
