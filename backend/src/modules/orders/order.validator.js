import { z } from 'zod';
import mongoose from 'mongoose';

// Custom validator for Mongoose ObjectId
const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

export const createOrderSchema = z.object({
  lines: z.array(
    z.object({
      productId: objectIdSchema,
      quantity: z.preprocess(
        (val) => (val === undefined || val === '' ? 1 : Number(val)),
        z.number().int().min(1, 'Quantity must be at least 1')
      ),
      specifications: z.record(z.string()).optional(),
    })
  ).min(1, 'Order must contain at least one line item.'),
  paymentMode: z.enum(['bank_transfer', 'cash', 'offline']).default('offline'),
  deliveryAddress: z.string().min(5, 'Delivery address must be at least 5 characters long').trim(),
  pickupAddress: z.string().optional().default(''),
  customerId: z.string().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Customer ID',
  }).optional(),
  quotedPrices: z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    }
    return val || {};
  }, z.record(objectIdSchema, z.number().min(0, 'Quoted price cannot be negative')).optional()),
  quotedShipping: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z.number().min(0, 'Quoted shipping price cannot be negative').optional()
  ),
});

// Validator schema for validating order ID in URL params
export const orderIdParamSchema = z.object({
  id: objectIdSchema,
});

// Validator schema for updating order status
export const updateOrderStatusSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status must be one of: confirmed, completed, cancelled' }),
  }),
  reason: z.string().optional(),
});

