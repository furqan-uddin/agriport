/**
 * Helper to send consistent success API responses
 * @param {Object} res - Express response object
 * @param {*} data - Payload to send in response
 * @param {number} statusCode - HTTP status code (default 200)
 * @param {string} message - Response message (default 'Success')
 */
export const successResponse = (res, data = null, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

/**
 * Helper to send consistent error API responses
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {string} status - status field (default 'error' for 5xx, 'fail' for 4xx)
 */
export const errorResponse = (res, message = 'An error occurred', statusCode = 500, status = 'error') => {
  return res.status(statusCode).json({
    status,
    message,
  });
};

export default {
  success: successResponse,
  error: errorResponse,
};
