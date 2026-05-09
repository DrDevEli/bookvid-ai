/**
 * API Key Validation Utilities
 * Provides validation and error handling for AI service API keys
 */

// Lazy import to ensure environment variables are loaded first
let apiKeyManager = null;
function getApiKeyManager() {
  if (!apiKeyManager) {
    apiKeyManager = require('../config/apiKeys');
  }
  return apiKeyManager;
}

/**
 * Custom error class for API key related errors
 */
class ApiKeyError extends Error {
  constructor(message, service, code = 'API_KEY_ERROR') {
    super(message);
    this.name = 'ApiKeyError';
    this.service = service;
    this.code = code;
  }
}

/**
 * Validate and get API key for a service
 * @param {string} service - Service name (openai, elevenlabs, stability)
 * @returns {string} Valid API key
 * @throws {ApiKeyError} If key is missing or invalid
 */
function requireApiKey(service) {
  const manager = getApiKeyManager();
  if (!manager.isServiceAvailable(service)) {
    const status = manager.getStatus()[service];
    
    if (!status.configured) {
      throw new ApiKeyError(
        `${service.toUpperCase()} API key is not configured. Please set ${service.toUpperCase()}_API_KEY in your environment variables.`,
        service,
        'API_KEY_MISSING'
      );
    }
    
    if (!status.valid) {
      throw new ApiKeyError(
        `${service.toUpperCase()} API key format is invalid. Please check your ${service.toUpperCase()}_API_KEY environment variable.`,
        service,
        'API_KEY_INVALID'
      );
    }
  }
  
  return manager.getApiKey(service);
}

/**
 * Check if a service is available without throwing errors
 * @param {string} service - Service name
 * @returns {Object} Service availability status
 */
function checkServiceAvailability(service) {
  const manager = getApiKeyManager();
  const status = manager.getStatus()[service];
  
  return {
    available: status.available,
    configured: status.configured,
    valid: status.valid,
    error: !status.available ? getServiceError(service, status) : null
  };
}

/**
 * Get appropriate error message for service status
 * @param {string} service - Service name
 * @param {Object} status - Service status object
 * @returns {string} Error message
 */
function getServiceError(service, status) {
  if (!status.configured) {
    return `${service.toUpperCase()} API key is not configured`;
  }
  
  if (!status.valid) {
    return `${service.toUpperCase()} API key format is invalid`;
  }
  
  return `${service.toUpperCase()} service is not available`;
}

/**
 * Validate API key format based on service
 * @param {string} service - Service name
 * @param {string} key - API key to validate
 * @returns {boolean} True if format is valid
 */
function validateKeyFormat(service, key) {
  switch (service) {
    case 'openai':
      return getApiKeyManager().validateOpenAIKey(key);
    case 'elevenlabs':
      return getApiKeyManager().validateElevenLabsKey(key);
    case 'resemble':
      return getApiKeyManager().validateResembleKey(key);
    case 'stability':
      return getApiKeyManager().validateStabilityKey(key);
    case 'shotstack':
      return getApiKeyManager().validateShotstackKey(key);
    default:
      return false;
  }
}

/**
 * Get all service statuses for health check
 * @returns {Object} Status of all configured services
 */
function getServicesHealth() {
  const status = getApiKeyManager().getStatus();
  
  return {
    overall: Object.values(status).every(s => s.available),
    services: status,
    timestamp: new Date().toISOString()
  };
}

/**
 * Express middleware to check API key availability for a service
 * @param {string} service - Required service name
 * @returns {Function} Express middleware function
 */
function requireService(service) {
  return (req, res, next) => {
    try {
      requireApiKey(service);
      next();
    } catch (error) {
      if (error instanceof ApiKeyError) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: error.message,
          service: error.service,
          code: error.code
        });
      }
      next(error);
    }
  };
}

/**
 * Express middleware to add service availability to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function addServiceInfo(req, res, next) {
  try {
    req.services = {
      openai: checkServiceAvailability('openai'),
      resemble: checkServiceAvailability('resemble'),
      stability: checkServiceAvailability('stability'),
      shotstack: checkServiceAvailability('shotstack')
    };
    next();
  } catch (error) {
    console.error('Error adding service info:', error);
    // Provide default unavailable status if there's an error
    req.services = {
      openai: { available: false, configured: false, valid: false, error: 'Service check failed' },
      resemble: { available: false, configured: false, valid: false, error: 'Service check failed' },
      stability: { available: false, configured: false, valid: false, error: 'Service check failed' },
      shotstack: { available: false, configured: false, valid: false, error: 'Service check failed' }
    };
    next();
  }
}

module.exports = {
  ApiKeyError,
  requireApiKey,
  checkServiceAvailability,
  validateKeyFormat,
  getServicesHealth,
  requireService,
  addServiceInfo
};