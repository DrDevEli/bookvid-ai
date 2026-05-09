/**
 * Tests for API Key Manager
 */

const apiKeyManager = require('../apiKeys');

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('ApiKeyManager', () => {
  describe('validateOpenAIKey', () => {
    test('should validate correct OpenAI key format', () => {
      expect(apiKeyManager.validateOpenAIKey('sk-1234567890abcdef1234567890abcdef1234567890abcdef123')).toBe(true);
    });

    test('should reject invalid OpenAI key format', () => {
      expect(apiKeyManager.validateOpenAIKey('invalid-key')).toBe(false);
      expect(apiKeyManager.validateOpenAIKey('sk-short')).toBe(false);
      expect(apiKeyManager.validateOpenAIKey('')).toBe(false);
      expect(apiKeyManager.validateOpenAIKey(null)).toBe(false);
    });
  });

  describe('validateElevenLabsKey', () => {
    test('should validate correct ElevenLabs key format', () => {
      expect(apiKeyManager.validateElevenLabsKey('1234567890abcdef1234567890abcdef')).toBe(true);
    });

    test('should reject invalid ElevenLabs key format', () => {
      expect(apiKeyManager.validateElevenLabsKey('invalid-key')).toBe(false);
      expect(apiKeyManager.validateElevenLabsKey('1234567890abcdef')).toBe(false); // too short
      expect(apiKeyManager.validateElevenLabsKey('')).toBe(false);
      expect(apiKeyManager.validateElevenLabsKey(null)).toBe(false);
    });
  });

  describe('validateStabilityKey', () => {
    test('should validate correct Stability AI key format', () => {
      expect(apiKeyManager.validateStabilityKey('sk-1234567890abcdef1234567890abcdef1234567890abcdef123')).toBe(true);
    });

    test('should reject invalid Stability AI key format', () => {
      expect(apiKeyManager.validateStabilityKey('invalid-key')).toBe(false);
      expect(apiKeyManager.validateStabilityKey('sk-short')).toBe(false);
      expect(apiKeyManager.validateStabilityKey('')).toBe(false);
      expect(apiKeyManager.validateStabilityKey(null)).toBe(false);
    });
  });

  describe('getMaskedKey', () => {
    test('should mask API keys correctly', () => {
      // Mock a key in the manager
      const manager = require('../apiKeys');
      manager.apiKeys = {
        openai: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef123'
      };

      const masked = manager.getMaskedKey('openai');
      expect(masked).toBe('sk-1***f123');
    });

    test('should handle missing keys', () => {
      const manager = require('../apiKeys');
      manager.apiKeys = {};

      const masked = manager.getMaskedKey('openai');
      expect(masked).toBe('Not configured');
    });

    test('should handle short keys', () => {
      const manager = require('../apiKeys');
      manager.apiKeys = {
        openai: 'short'
      };

      const masked = manager.getMaskedKey('openai');
      expect(masked).toBe('***');
    });
  });

  describe('isServiceAvailable', () => {
    test('should return true for valid configured service', () => {
      const manager = require('../apiKeys');
      manager.apiKeys = {
        openai: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef123'
      };

      expect(manager.isServiceAvailable('openai')).toBe(true);
    });

    test('should return false for missing service', () => {
      const manager = require('../apiKeys');
      manager.apiKeys = {};

      expect(manager.isServiceAvailable('openai')).toBe(false);
    });

    test('should return false for invalid key format', () => {
      const manager = require('../apiKeys');
      manager.apiKeys = {
        openai: 'invalid-key'
      };

      expect(manager.isServiceAvailable('openai')).toBe(false);
    });
  });

  describe('getStatus', () => {
    test('should return comprehensive status for all services', () => {
      const manager = require('../apiKeys');
      manager.apiKeys = {
        openai: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef123',
        elevenlabs: '1234567890abcdef1234567890abcdef',
        stability: null
      };

      const status = manager.getStatus();

      expect(status).toHaveProperty('openai');
      expect(status).toHaveProperty('elevenlabs');
      expect(status).toHaveProperty('stability');

      expect(status.openai.configured).toBe(true);
      expect(status.openai.valid).toBe(true);
      expect(status.openai.available).toBe(true);

      expect(status.elevenlabs.configured).toBe(true);
      expect(status.elevenlabs.valid).toBe(true);
      expect(status.elevenlabs.available).toBe(true);

      expect(status.stability.configured).toBe(false);
      expect(status.stability.valid).toBe(false);
      expect(status.stability.available).toBe(false);
    });
  });
});