import AppError from '../utils/AppError.js';

/**
 * Express middleware factory to validate request body using a Zod schema.
 * Automatically forwards Zod validation errors to the global error handler.
 * 
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware handler
 */
export const validate = (schemaOrObject) => async (req, res, next) => {
  try {
    if (schemaOrObject && typeof schemaOrObject.parseAsync === 'function') {
      const parsed = await schemaOrObject.parseAsync(req.body);
      // Replace req.body with parsed output to strip undeclared fields
      req.body = parsed;
    } else if (schemaOrObject) {
      if (schemaOrObject.body && typeof schemaOrObject.body.parseAsync === 'function') {
        req.body = await schemaOrObject.body.parseAsync(req.body);
      }
      if (schemaOrObject.params && typeof schemaOrObject.params.parseAsync === 'function') {
        req.params = await schemaOrObject.params.parseAsync(req.params);
      }
      if (schemaOrObject.query && typeof schemaOrObject.query.parseAsync === 'function') {
        req.query = await schemaOrObject.query.parseAsync(req.query);
      }
    }
    next();
  } catch (error) {
    // If Zod error, format it nicely or pass directly to global error handler
    if (error.errors) {
      const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return next(new AppError(`Validation failed: ${messages.join('. ')}`, 400));
    }
    next(error);
  }
};

export default validate;
