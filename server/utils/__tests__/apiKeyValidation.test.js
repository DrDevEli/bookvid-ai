/**
 * Tests for API Key Validation Utilities
 */

const {
  ApiKeyError,
  requireApiKey,
  checkServiceAvailability,
  validateKeyFormat,
  getServicesHealth
} = require('../apiKeyValidation');

// Mock the apiKeyManager
jest.mock('../../config/apiKeys', () => ({
  isServiceAvailable: jest.fn(),
  getApiKey: jest.fn(),
  getStatus: jest.fn(),
  validateOpenAIKey: jest.fn(),
  validateElevenLabsKey: jest.fn(),
  validateStabilityKey: jest.fn()
}));

const apiKeyManager = require('../../config/apiKeys');

describe('ApiKeyValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ApiKeyError', () => {
    test('should create error with correct properties', () => {
      const error = new ApiKeyError('Test message', 'openai', 'TEST_CODE');
      
      expect(error.message).toBe('Test message');
      expect(error.service).toBe('openai');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ApiKeyError');
    });

    test('should use default error code', () => {
      const error = new ApiKeyError('Test message', 'openai');
      
      expect(error.code).toBe('API_KEY_ERROR');
    });
  });

  describe('requireApiKey', () => {
    test('should return API key when service is available', () => {
      apiKeyManager.isServiceAvailable.mockReturnValue(true);
      apiKeyManager.getApiKey.mockReturnValue('test-api-key');

      const result = requireApiKey('openai');

      expect(result).toBe('test-api-key');
      expect(apiKeyManager.isServiceAvailable).toHaveBeenCalledWith('openai');
      expect(apiKeyManager.getApiKey).toHaveBeenCalledWith('openai');
    });

    test('should throw ApiKeyError when service is not configured', () => {
      apiKeyManager.isServiceAvailable.mockReturnValue(false);
      apiKeyManager.getStatus.mockReturnValue({
        openai: { configured: false, valid: false }
      });

      expect(() => requireApiKey('openai')).toThrow(ApiKeyError);
      expect(() => requireApiKey('openai')).toThrow('OPENAI API key is not configured');
    });

    test('should throw ApiKeyError when key format is invalid', () => {
      apiKeyManager.isServiceAvailable.mockReturnValue(false);
      apiKeyManager.getStatus.mockReturnValue({
        openai: { configured: true, valid: false }
      });

      expect(() => requireApiKey('openai')).toThrow(ApiKeyError);
      expect(() => requireApiKey('openai')).toThrow('OPENAI API key format is invalid');
    });
  });

  describe('checkServiceAvailability', () => {
    test('should return availability status for available service', () => {
      apiKeyManager.getStatus.mockReturnValue({
        openai: { available: true, configured: true, valid: true }
      });

      const result = checkServiceAvailability('openai');

      expect(result).toEqual({
        available: true,
        configured: true,
        valid: true,
        error: null
      });
    });

    test('should return error for unavailable service', () => {
      apiKeyManager.getStatus.mockReturnValue({
        openai: { available: false, configured: false, valid: false }
      });

      const result = checkServiceAvailability('openai');

      expect(result).toEqual({
        available: false,
        configured: false,
        valid: false,
        error: 'OPENAI API key is not configured'
      });
    });
  });

  describe('validateKeyFormat', () => {
    test('should validate OpenAI key format', () => {
      apiKeyManager.validateOpenAIKey.mockReturnValue(true);

      const result = validateKeyFormat('openai', 'sk-test-key');

      expect(result).toBe(true);
      expect(apiKeyManager.validateOpenAIKey).toHaveBeenCalledWith('sk-test-key');
    });

    test('should validate ElevenLabs key format', () => {
      apiKeyManager.validateElevenLabsKey.mockReturnValue(true);

      const result = validateKeyFormat('elevenlabs', 'test-key');

      expect(result).toBe(true);
      expect(apiKeyManager.validateElevenLabsKey).toHaveBeenCalledWith('test-key');
    });

    test('should validate Stability AI key format', () => {
      apiKeyManager.validateStabilityKey.mockReturnValue(true);

      const result = validateKeyFormat('stability', 'sk-test-key');

      expect(result).toBe(true);
      expect(apiKeyManager.validateStabilityKey).toHaveBeenCalledWith('sk-test-key');
    });

    test('should return false for unknown service', () => {
      const result = validateKeyFormat('unknown', 'test-key');

      expect(result).toBe(false);
    });
  });

  describe('getServicesHealth', () => {
    test('should return overall health status', () => {
      const mockStatus = {
        openai: { available: true },
        elevenlabs: { available: true },
        stability: { available: false }
      };

      apiKeyManager.getStatus.mockReturnValue(mockStatus);

      const result = getServicesHealth();

      expect(result.overall).toBe(false); // Not all services available
      expect(result.services).toBe(mockStatus);
      expect(result.timestamp).toBeDefined();
    });

    test('should return true when all services are available', () => {
      const mockStatus = {
        openai: { available: true },
        elevenlabs: { available: true },
        stability: { available: true }
      };

      apiKeyManager.getStatus.mockReturnValue(mockStatus);

      const result = getServicesHealth();

      expect(result.overall).toBe(true);
    });
  });
});