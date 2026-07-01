import { z } from 'zod';
import mongoose from 'mongoose';

// Custom validator for Mongoose ObjectId
const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid Category ID',
});

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters long').trim(),
  brand: z.string().optional().default(''),
  category: objectIdSchema,
  origin: z.string().min(1, 'Origin is required').trim(),
  grade: z.string().min(1, 'Grade is required').trim(),
  sizeVariants: z.array(
    z.object({
      size: z.string().min(1, 'Size is required').trim(),
      stock: z.number().default(0),
      price: z.number().default(0),
      packingType: z.string().optional().default('Cartoon'),
      netWeight: z.number().optional(),
      grossWeight: z.number().optional(),
    })
  ).optional(),
});

export const updateProductSchema = createProductSchema.partial();
