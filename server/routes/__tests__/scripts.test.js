/**
 * Tests for Script Routes
 */

const request = require('supertest');
const app = require('../../app');

// Mock the services
jest.mock('../../services/scriptGeneration', () => ({
  validateRequest: jest.fn(),
  generateScript: jest.fn(),
  getStatus: jest.fn()
}));

jest.mock('../../utils/apiKeyValidation', () => ({
  requireService: () => (req, res, next) => next(),
  addServiceInfo: (req, res, next) => {
    req.services = {
      openai: { available: true }
    };
    next();
  }
}));

jest.mock('../../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user' };
  next();
});

const scriptGenerationService = require('../../services/scriptGeneration');

describe('Script Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/scripts/generate', () => {
    test('should generate script successfully', async () => {
      const mockScript = {
        id: 'script-123',
        title: 'Test Script',
        mainContent: 'Test content'
      };

      scriptGenerationService.validateRequest.mockImplementation(() => {});
      scriptGenerationService.generateScript.mockResolvedValue(mockScript);

      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'A test book description'
      };

      const response = await request(app)
        .post('/api/scripts/generate')
        .send({ bookData })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.script).toEqual(mockScript);
      expect(scriptGenerationService.generateScript).toHaveBeenCalledWith(bookData, {});
    });

    test('should handle validation errors', async () => {
      scriptGenerationService.validateRequest.mockImplementation(() => {
        throw new Error('Missing required fields');
      });

      const bookData = {
        title: 'Test Book'
      };

      const response = await request(app)
        .post('/api/scripts/generate')
        .send({ bookData })
        .expect(400);

      expect(response.body.error).toBe('Script Generation Failed');
      expect(response.body.message).toBe('Missing required fields');
    });
  });

  describe('GET /api/scripts/status', () => {
    test('should return service status', async () => {
      const mockStatus = {
        available: true,
        model: 'gpt-3.5-turbo'
      };

      scriptGenerationService.getStatus.mockReturnValue(mockStatus);

      const response = await request(app)
        .get('/api/scripts/status')
        .expect(200);

      expect(response.body.service).toBe('script-generation');
      expect(response.body.available).toBe(true);
      expect(response.body.model).toBe('gpt-3.5-turbo');
    });
  });

  describe('POST /api/scripts/validate', () => {
    test('should validate book data successfully', async () => {
      scriptGenerationService.validateRequest.mockImplementation(() => {});

      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'A test book description'
      };

      const response = await request(app)
        .post('/api/scripts/validate')
        .send({ bookData })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.serviceAvailable).toBe(true);
    });

    test('should return validation errors', async () => {
      scriptGenerationService.validateRequest.mockImplementation(() => {
        throw new Error('Description too short');
      });

      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Short'
      };

      const response = await request(app)
        .post('/api/scripts/validate')
        .send({ bookData })
        .expect(400);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Description too short');
    });
  });
});