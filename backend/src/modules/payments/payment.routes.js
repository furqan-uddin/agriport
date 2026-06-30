import express from 'express';
import * as paymentController from './payment.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';

const router = express.Router();

// All payment routes require authentication
router.use(authenticate);

router.get('/transactions', paymentController.getTransactions);
router.post('/admin/:transactionId/verify', authorize('admin'), paymentController.verifyOfflinePayment);

export default router;
