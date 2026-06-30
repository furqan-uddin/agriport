/**
 * Wraps async Express controller functions to automatically catch thrown errors
 * and forward them to the global error handling middleware.
 * 
 * @param {Function} fn - Async controller function
 * @returns {Function} Express route handler middleware
 */
const asyncWrapper = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default asyncWrapper;
