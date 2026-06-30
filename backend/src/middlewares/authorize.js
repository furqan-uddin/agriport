import AppError from '../utils/AppError.js';

/**
 * Middleware to restrict route access to specific user roles
 * 
 * @param {...string} roles - The roles allowed to access this route (e.g. 'admin', 'manager')
 * @returns {Function} Express middleware function
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before authorization.', 500));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};

export default authorize;
