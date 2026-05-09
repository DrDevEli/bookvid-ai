/**
 * Standardized API response formatter
 * Ensures consistent response structure across all endpoints
 */

/**
 * Success response format
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata (pagination, etc.)
 * @returns {Object} Formatted success response
 */
function successResponse(data, message = 'Success', meta = null) {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
}

/**
 * Error response format
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {any} details - Additional error details
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
function errorResponse(message, code = 'INTERNAL_ERROR', details = null, statusCode = 500) {
  const response = {
    success: false,
    error: {
      message,
      code,
      statusCode
    },
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return response;
}

/**
 * Validation error response format
 * @param {Array} validationErrors - Array of validation errors
 * @param {string} message - Main error message
 * @returns {Object} Formatted validation error response
 */
function validationErrorResponse(validationErrors, message = 'Validation failed') {
  return errorResponse(message, 'VALIDATION_ERROR', validationErrors, 400);
}

/**
 * Paginated response format
 * @param {Array} data - Response data
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 * @returns {Object} Formatted paginated response
 */
function paginatedResponse(data, pagination, message = 'Success') {
  return successResponse(data, message, { pagination });
}

/**
 * Express middleware to add response formatters to res object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function addResponseFormatters(req, res, next) {
  res.success = (data, message, meta) => {
    return res.json(successResponse(data, message, meta));
  };
  
  res.error = (message, code, details, statusCode = 500) => {
    return res.status(statusCode).json(errorResponse(message, code, details, statusCode));
  };
  
  res.validationError = (validationErrors, message) => {
    const response = validationErrorResponse(validationErrors, message);
    return res.status(400).json(response);
  };
  
  res.paginated = (data, pagination, message) => {
    return res.json(paginatedResponse(data, pagination, message));
  };
  
  next();
}

/**
 * Error codes constants
 */
const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // External Services
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // File Operations
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
  
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
  addResponseFormatters,
  ERROR_CODES
};