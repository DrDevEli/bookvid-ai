const scriptGenerationService = require('../scriptGeneration');
const { ApiKeyError } = require('../../utils/apiKeyValidation');

// Mock the API key validation
jest.mock('../../utils/apiKeyValidation', () => ({
  requireApiKey: jest.fn(),
  ApiKeyError: class ApiKeyError extends Error {
    constructor(message, service, code) {
      super(message);
      this.service = service;
      this.code = code;
    }
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ScriptGenerationService', () => {
  const { requireApiKey } = require('../../utils/apiKeyValidation');
  
  beforeEach(() => {
    jest.clearAllMocks();
    requireApiKey.mockReturnValue('test-api-key');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateScript', () => {
    const mockBookData = {
      id: 'book-123',
      title: 'Test Book',
      author: 'Test Author',
      genre: 'Fiction',
      description: 'A fascinating test book',
      content: 'This is the content of the test book...'
    };

    it('should generate script successfully', async () => {
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Book - Book Trailer',
              hook: 'Discover an amazing story...',
              main_content: 'This book will take you on a journey...',
              call_to_action: 'Get your copy today!',
              estimated_duration: 60,
              key_points: ['Adventure', 'Mystery', 'Romance'],
              tone: 'engaging',
              script_sections: [
                {
                  timestamp: '0:00-0:05',
                  content: 'Hook content',
                  visual_cue: 'Book cover'
                }
              ]
            })
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOpenAIResponse)
      });

      const result = await scriptGenerationService.generateScript(mockBookData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('bookId', mockBookData.id);
      expect(result).toHaveProperty('title', 'Test Book - Book Trailer');
      expect(result).toHaveProperty('hook', 'Discover an amazing story...');
      expect(result).toHaveProperty('mainContent', 'This book will take you on a journey...');
      expect(result).toHaveProperty('callToAction', 'Get your copy today!');
      expect(result).toHaveProperty('estimatedDuration', 60);
      expect(result).toHaveProperty('keyPoints');
      expect(result).toHaveProperty('tone', 'engaging');
      expect(result).toHaveProperty('scriptSections');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('usage');

      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(Array.isArray(result.scriptSections)).toBe(true);
    });

    it('should handle non-JSON response from OpenAI', async () => {
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: 'This is a plain text response from OpenAI that is not JSON formatted.'
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOpenAIResponse)
      });

      const result = await scriptGenerationService.generateScript(mockBookData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('bookId', mockBookData.id);
      expect(result).toHaveProperty('title', 'Test Book - Book Trailer');
      expect(result).toHaveProperty('mainContent', 'This is a plain text response from OpenAI that is not JSON formatted.');
      expect(result).toHaveProperty('callToAction', 'Get your copy today!');
    });

    it('should handle API key errors', async () => {
      requireApiKey.mockImplementation(() => {
        throw new ApiKeyError('Invalid OpenAI API key', 'openai', 'INVALID_API_KEY');
      });

      await expect(scriptGenerationService.generateScript(mockBookData))
        .rejects.toThrow(ApiKeyError);
    });

    it('should handle OpenAI API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: { message: 'Invalid API key' }
        })
      });

      await expect(scriptGenerationService.generateScript(mockBookData))
        .rejects.toThrow(ApiKeyError);
    });

    it('should handle quota exceeded errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' }
        })
      });

      await expect(scriptGenerationService.generateScript(mockBookData))
        .rejects.toThrow(ApiKeyError);
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(scriptGenerationService.generateScript(mockBookData))
        .rejects.toThrow('Failed to generate script: Network error');
    });

    it('should use custom options', async () => {
      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Custom Script',
              estimated_duration: 120,
              tone: 'dramatic'
            })
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOpenAIResponse)
      });

      const options = {
        duration: 120,
        tone: 'dramatic'
      };

      const result = await scriptGenerationService.generateScript(mockBookData, options);

      expect(result.estimatedDuration).toBe(120);
      expect(result.tone).toBe('dramatic');

      // Verify the prompt includes the custom options
      const fetchCall = fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const prompt = requestBody.messages[1].content;
      
      expect(prompt).toContain('120-second');
      expect(prompt).toContain('dramatic');
    });
  });

  describe('buildPrompt', () => {
    it('should build a comprehensive prompt', () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        genre: 'Fiction',
        description: 'A test book',
        content: 'Book content here...'
      };

      const options = { duration: 60, tone: 'engaging' };
      const prompt = scriptGenerationService.buildPrompt(bookData, options);

      expect(prompt).toContain('Test Book');
      expect(prompt).toContain('Test Author');
      expect(prompt).toContain('Fiction');
      expect(prompt).toContain('60-second');
      expect(prompt).toContain('engaging');
      expect(prompt).toContain('JSON format');
    });
  });

  describe('validateRequest', () => {
    it('should validate required fields', () => {
      const validBookData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'A valid description that is long enough'
      };

      expect(() => {
        scriptGenerationService.validateRequest(validBookData);
      }).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      const invalidBookData = {
        title: 'Test Book'
        // missing author and description
      };

      expect(() => {
        scriptGenerationService.validateRequest(invalidBookData);
      }).toThrow('Missing required fields: author, description');
    });

    it('should throw error for short description', () => {
      const invalidBookData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Short' // too short
      };

      expect(() => {
        scriptGenerationService.validateRequest(invalidBookData);
      }).toThrow('Book description must be at least 10 characters long');
    });
  });

  describe('getStatus', () => {
    it('should return available status when API key is valid', () => {
      requireApiKey.mockReturnValue('valid-api-key');

      const status = scriptGenerationService.getStatus();

      expect(status.available).toBe(true);
      expect(status.model).toBe('gpt-3.5-turbo');
      expect(status.baseUrl).toBe('https://api.openai.com/v1');
    });

    it('should return unavailable status when API key is invalid', () => {
      requireApiKey.mockImplementation(() => {
        throw new Error('API key not configured');
      });

      const status = scriptGenerationService.getStatus();

      expect(status.available).toBe(false);
      expect(status.error).toBe('API key not configured');
    });
  });

  describe('generateScriptId', () => {
    it('should generate unique script IDs', () => {
      const id1 = scriptGenerationService.generateScriptId();
      const id2 = scriptGenerationService.generateScriptId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^script_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^script_\d+_[a-z0-9]+$/);
    });
  });
});