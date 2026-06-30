import express from 'express';
import * as orderController from './order.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorize from '../../middlewares/authorize.js';
import validate from '../../middlewares/validate.js';
import { createOrderSchema, orderIdParamSchema, updateOrderStatusSchema } from './order.validator.js';

const router = express.Router();

// Publicly accessible via shareToken, or privately via JWT
router.get('/:id/invoice', validate({ params: orderIdParamSchema }), orderController.downloadInvoice);

// All order endpoints require authentication
router.use(authenticate);

// Admin / Manager order management routes
router.get('/admin/list', authorize('admin', 'manager'), orderController.getAdminOrders);
router.patch(
  '/admin/:id/status',
  authorize('admin'),
  validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  orderController.updateOrderStatus
);

// Executive / Admin quoting route
router.patch(
  '/:id/quote',
  authorize('executive', 'admin', 'manager'),
  validate({ params: orderIdParamSchema }),
  orderController.quoteOrder
);

// Customer routes
router.post('/', validate(createOrderSchema), orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id', validate({ params: orderIdParamSchema }), orderController.getOrderById);


export default router;
