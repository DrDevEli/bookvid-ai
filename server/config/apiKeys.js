/**
 * API Key Configuration and Validation Service
 * Manages personal API keys for AI services
 */

/**
 * API Key validators for different services
 */
class ApiKeyValidators {
  /**
   * Validate API key format for OpenAI
   * @param {string} key - API key to validate
   * @returns {boolean} True if format is valid
   */
  static validateOpenAI(key) {
    if (!key) return false;
    // OpenAI keys start with 'sk-' and are typically 51 characters
    // DeepSeek keys are also compatible and may have different formats
    return (key.startsWith('sk-') && key.length >= 20) || 
           (key.startsWith('sk_') && key.length >= 20) ||
           (key.length >= 20); // Allow other formats for DeepSeek compatibility
  }

  /**
   * Validate API key format for ElevenLabs
   * @param {string} key - API key to validate
   * @returns {boolean} True if format is valid
   */
  static validateElevenLabs(key) {
    if (!key) return false;
    // ElevenLabs keys start with 'sk_' and are typically 50+ characters
    return key.startsWith('sk_') && key.length >= 40;
  }

  /**
   * Validate API key format for Resemble AI
   * @param {string} key - API key to validate
   * @returns {boolean} True if format is valid
   */
  static validateResemble(key) {
    if (!key) return false;
    // Resemble tokens are typically alphanumeric strings
    // Accept keys that are at least 20 characters long
    return key.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(key);
  }

  /**
   * Validate API key format for Stability AI
   * @param {string} key - API key to validate
   * @returns {boolean} True if format is valid
   */
  static validateStability(key) {
    if (!key) return false;
    // Stability AI keys start with 'sk-' and are typically longer
    return key.startsWith('sk-') && key.length >= 20;
  }

  /**
   * Validate API key format for Shotstack
   * @param {string} key - API key to validate
   * @returns {boolean} True if format is valid
   */
  static validateShotstack(key) {
    if (!key) return false;
    // Shotstack keys are alphanumeric strings, typically 32+ characters
    return key.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(key);
  }

  /**
   * Get validator function for a service
   * @param {string} service - Service name
   * @returns {Function} Validator function
   */
  static getValidator(service) {
    const validators = {
      openai: this.validateOpenAI,
      elevenlabs: this.validateElevenLabs,
      stability: this.validateStability,
      resemble: this.validateResemble,
      shotstack: this.validateShotstack
    };
    
    return validators[service] || (() => false);
  }
}

/**
 * Utility class for API key operations
 */
class ApiKeyUtils {
  /**
   * Get masked version of API key for logging/display
   * @param {string} key - API key to mask
   * @returns {string} Masked API key
   */
  static maskKey(key) {
    if (!key) return 'Not configured';
    if (key.length <= 8) return '***';
    return key.substring(0, 4) + '***' + key.substring(key.length - 4);
  }
}

class ApiKeyManager {
  constructor() {
    this.services = ['openai', 'stability', 'resemble', 'shotstack'];
    this.apiKeys = null;
    this.initialized = false;
  }

  /**
   * Initialize the API key manager (lazy initialization)
   * @private
   */
  _initialize() {
    if (this.initialized) return;
    
    this.apiKeys = this._loadApiKeys();
    this._validateEnvironment();
    this.initialized = true;
  }

  /**
   * Load API keys from environment
   * @private
   */
  _loadApiKeys() {
    return {
      openai: process.env.OPENAI_API_KEY,
      stability: process.env.STABILITY_API_KEY,
      resemble: process.env.RESEMBLE_API_KEY,
      shotstack: process.env.SHOTSTACK_API_KEY
    };
  }

  /**
   * Validate that required API keys are present
   * @private
   */
  _validateEnvironment() {
    const missing = this.services
      .filter(service => !this.apiKeys[service])
      .map(service => service.toUpperCase() + '_API_KEY');
    
    if (missing.length > 0) {
      console.warn(`Warning: Missing API keys: ${missing.join(', ')}`);
      console.warn('Some AI features may not work properly.');
    }
  }

  /**
   * Get API key for a specific service
   * @param {string} service - Service name (openai, elevenlabs, stability)
   * @returns {string} API key
   * @throws {Error} If service is unknown or API key is not configured
   */
  getApiKey(service) {
    this._initialize();
    
    if (!this.services.includes(service)) {
      throw new Error(`Unknown service: ${service}. Supported services: ${this.services.join(', ')}`);
    }
    
    const key = this.apiKeys[service];
    if (!key) {
      throw new Error(`API key for ${service} is not configured. Please set ${service.toUpperCase()}_API_KEY environment variable.`);
    }
    
    return key;
  }

  /**
   * Validate all configured API keys
   * @returns {Object} Validation results for each service
   */
  validateAllKeys() {
    this._initialize();
    
    const results = {};
    
    for (const service of this.services) {
      const key = this.apiKeys[service];
      const validator = ApiKeyValidators.getValidator(service);
      
      results[service] = {
        configured: !!key,
        valid: key ? validator(key) : false
      };
    }

    return results;
  }

  /**
   * Check if a service is available (has valid API key)
   * @param {string} service - Service name
   * @returns {boolean} True if service is available
   */
  isServiceAvailable(service) {
    this._initialize();
    
    const key = this.apiKeys[service];
    if (!key) return false;

    const validator = ApiKeyValidators.getValidator(service);
    return validator(key);
  }

  /**
   * Get masked version of API key for logging/display
   * @param {string} service - Service name
   * @returns {string} Masked API key
   */
  getMaskedKey(service) {
    this._initialize();
    
    const key = this.apiKeys[service];
    return ApiKeyUtils.maskKey(key);
  }

  /**
   * Get configuration status for all services
   * @returns {Object} Status information for each service
   */
  getStatus() {
    this._initialize();
    
    const validation = this.validateAllKeys();
    const status = {};
    
    for (const service of this.services) {
      status[service] = {
        configured: validation[service].configured,
        valid: validation[service].valid,
        masked: this.getMaskedKey(service),
        available: this.isServiceAvailable(service)
      };
    }
    
    return status;
  }
}

// Create singleton instance
const apiKeyManager = new ApiKeyManager();

// Expose validator helpers for external consumers (primarily tests/utility wrappers)
apiKeyManager.validateOpenAIKey = ApiKeyValidators.validateOpenAI;
apiKeyManager.validateElevenLabsKey = ApiKeyValidators.validateElevenLabs;
apiKeyManager.validateResembleKey = ApiKeyValidators.validateResemble;
apiKeyManager.validateStabilityKey = ApiKeyValidators.validateStability;
apiKeyManager.validateShotstackKey = ApiKeyValidators.validateShotstack;

module.exports = apiKeyManager;