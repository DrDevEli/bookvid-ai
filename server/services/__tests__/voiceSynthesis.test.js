const fs = require('fs').promises;
const path = require('path');
const voiceSynthesisService = require('../voiceSynthesis');
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

describe('VoiceSynthesisService', () => {
  const { requireApiKey } = require('../../utils/apiKeyValidation');
  const testUploadPath = process.env.UPLOAD_PATH;
  const audioPath = path.join(testUploadPath, 'audio');
  
  beforeEach(() => {
    jest.clearAllMocks();
    requireApiKey.mockReturnValue('test-api-key');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateVoiceover', () => {
    const mockScriptData = {
      id: 'script-123',
      text: 'This is a test script for voice synthesis.'
    };

    beforeEach(async () => {
      // Ensure audio directory exists
      await fs.mkdir(audioPath, { recursive: true });
    });

    afterEach(async () => {
      // Clean up test audio files
      try {
        const files = await fs.readdir(audioPath);
        for (const file of files) {
          if (file.startsWith('voiceover_')) {
            await fs.unlink(path.join(audioPath, file));
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should generate voiceover successfully', async () => {
      const mockAudioBuffer = Buffer.from('fake audio data');
      const mockBase64Audio = mockAudioBuffer.toString('base64');

      // Mock project fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ uuid: 'project-123', name: 'Test Project' }]
        })
      });

      // Mock voices fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ uuid: 'voice-123', name: 'Test Voice' }]
        })
      });

      // Mock synthesis
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          audio_content: mockBase64Audio,
          duration: 2.5,
          synth_duration: 2.4,
          sample_rate: 44100,
          output_format: 'mp3',
          issues: []
        })
      });

      const result = await voiceSynthesisService.generateVoiceover(mockScriptData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('scriptId', mockScriptData.id);
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('fileSize');
      expect(result).toHaveProperty('voiceId');
      expect(result).toHaveProperty('duration', 2.5);
      expect(result).toHaveProperty('synthDuration', 2.4);
      expect(result).toHaveProperty('settings');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('text');

      // Verify file was created
      const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file content
      const fileContent = await fs.readFile(result.filePath);
      expect(Buffer.compare(fileContent, mockAudioBuffer)).toBe(0);
    });

    it('should use custom voice options', async () => {
      const mockAudioBuffer = Buffer.from('fake audio data');
      const mockBase64Audio = mockAudioBuffer.toString('base64');
      const customOptions = {
        projectId: 'custom-project-id',
        voiceId: 'custom-voice-id',
        sampleRate: 48000,
        outputFormat: 'wav',
        precision: 'PCM_24'
      };

      // Mock synthesis
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          audio_content: mockBase64Audio,
          duration: 2.5,
          synth_duration: 2.4,
          sample_rate: 48000,
          output_format: 'wav',
          issues: []
        })
      });

      const result = await voiceSynthesisService.generateVoiceover(mockScriptData, customOptions);

      expect(result.voiceId).toBe(customOptions.voiceId);
      expect(result.settings.sampleRate).toBe(customOptions.sampleRate);
      expect(result.settings.outputFormat).toBe(customOptions.outputFormat);
      expect(result.settings.precision).toBe(customOptions.precision);

      // Verify API call was made with correct parameters
      const fetchCall = fetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://f.cluster.resemble.ai/synthesize');
      
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.voice_uuid).toBe(customOptions.voiceId);
      expect(requestBody.project_uuid).toBe(customOptions.projectId);
      expect(requestBody.sample_rate).toBe(customOptions.sampleRate);
      expect(requestBody.output_format).toBe(customOptions.outputFormat);
      expect(requestBody.precision).toBe(customOptions.precision);
    });

    it('should handle API key errors', async () => {
      requireApiKey.mockImplementation(() => {
        throw new ApiKeyError('Invalid Resemble API key', 'resemble', 'INVALID_API_KEY');
      });

      await expect(voiceSynthesisService.generateVoiceover(mockScriptData))
        .rejects.toThrow(ApiKeyError);
    });

    it('should handle Resemble API errors', async () => {
      // Mock project fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ uuid: 'project-123', name: 'Test Project' }]
        })
      });

      // Mock voices fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ uuid: 'voice-123', name: 'Test Voice' }]
        })
      });

      // Mock synthesis failure
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      await expect(voiceSynthesisService.generateVoiceover(mockScriptData))
        .rejects.toThrow();
    });

    it('should reject text longer than 3000 characters', async () => {
      const longScriptData = {
        id: 'script-long',
        text: 'a'.repeat(3001)
      };

      await expect(voiceSynthesisService.generateVoiceover(longScriptData))
        .rejects.toThrow('Text must be less than 3000 characters for synchronous synthesis');
    });

    it('should handle network errors', async () => {
      // Mock project fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ uuid: 'project-123', name: 'Test Project' }]
        })
      });

      // Mock voices fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{ uuid: 'voice-123', name: 'Test Voice' }]
        })
      });

      // Mock network error
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(voiceSynthesisService.generateVoiceover(mockScriptData))
        .rejects.toThrow('Failed to generate voiceover: Network error');
    });
  });

  describe('getAvailableVoices', () => {
    it('should fetch available voices successfully', async () => {
      const mockVoicesResponse = {
        items: [
          {
            uuid: 'voice-1',
            name: 'Adam',
            default_language: 'en',
            description: 'A deep, authoritative voice',
            preview_audio_url: 'https://example.com/preview1.mp3',
            status: 'ready',
            voice_type: 'professional',
            supported_languages: ['en', 'es'],
            project_uuid: 'project-123',
            labels: { accent: 'american', age: 'middle_aged' }
          },
          {
            uuid: 'voice-2',
            name: 'Bella',
            default_language: 'en',
            description: 'A warm, friendly voice',
            preview_audio_url: 'https://example.com/preview2.mp3',
            status: 'ready',
            voice_type: 'rapid',
            supported_languages: ['en'],
            project_uuid: 'project-123',
            labels: { accent: 'american', age: 'young' }
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVoicesResponse)
      });

      const voices = await voiceSynthesisService.getAvailableVoices();

      expect(Array.isArray(voices)).toBe(true);
      expect(voices).toHaveLength(2);
      
      expect(voices[0]).toHaveProperty('id', 'voice-1');
      expect(voices[0]).toHaveProperty('name', 'Adam');
      expect(voices[0]).toHaveProperty('language', 'en');
      expect(voices[0]).toHaveProperty('description');
      expect(voices[0]).toHaveProperty('previewUrl');
      expect(voices[0]).toHaveProperty('status', 'ready');
      expect(voices[0]).toHaveProperty('voiceType', 'professional');
      expect(voices[0]).toHaveProperty('projectId', 'project-123');
      expect(voices[0]).toHaveProperty('labels');

      expect(voices[1]).toHaveProperty('id', 'voice-2');
      expect(voices[1]).toHaveProperty('name', 'Bella');
    });

    it('should handle API errors when fetching voices', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });

      await expect(voiceSynthesisService.getAvailableVoices())
        .rejects.toThrow();
    });

    it('should handle API key errors when fetching voices', async () => {
      requireApiKey.mockImplementation(() => {
        throw new ApiKeyError('Invalid API key', 'resemble', 'INVALID_API_KEY');
      });

      await expect(voiceSynthesisService.getAvailableVoices())
        .rejects.toThrow(ApiKeyError);
    });
  });

  describe('validateRequest', () => {
    it('should validate valid script data', () => {
      const validScriptData = {
        text: 'This is a valid script text that is long enough for processing.'
      };

      expect(() => {
        voiceSynthesisService.validateRequest(validScriptData);
      }).not.toThrow();
    });

    it('should throw error for missing text', () => {
      const invalidScriptData = {};

      expect(() => {
        voiceSynthesisService.validateRequest(invalidScriptData);
      }).toThrow('Script text is required');
    });

    it('should throw error for text too short', () => {
      const invalidScriptData = {
        text: 'Short'
      };

      expect(() => {
        voiceSynthesisService.validateRequest(invalidScriptData);
      }).toThrow('Script text must be at least 10 characters long');
    });

    it('should throw error for text too long', () => {
      const invalidScriptData = {
        text: 'a'.repeat(3001)
      };

      expect(() => {
        voiceSynthesisService.validateRequest(invalidScriptData);
      }).toThrow('Script text must be less than 3000 characters for synchronous synthesis');
    });
  });

  describe('getTextAnalysis', () => {
    it('should analyze text and estimate duration', () => {
      const text = 'This is a test text for analysis.';
      const analysis = voiceSynthesisService.getTextAnalysis(text);

      expect(analysis).toHaveProperty('characterCount', text.length);
      expect(analysis).toHaveProperty('wordCount');
      expect(analysis).toHaveProperty('estimatedDurationSeconds');
      expect(analysis).toHaveProperty('currency', 'USD');
      expect(typeof analysis.estimatedDurationSeconds).toBe('number');
      expect(analysis.estimatedDurationSeconds).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty text', () => {
      const analysis = voiceSynthesisService.getTextAnalysis('');

      expect(analysis.characterCount).toBe(0);
      expect(analysis.wordCount).toBe(0);
      expect(analysis.estimatedDurationSeconds).toBe(1); // minimum is 1
    });
  });

  describe('deleteAudioFile', () => {
    it('should delete existing audio file', async () => {
      // Create a test audio file
      const testFilePath = path.join(audioPath, 'test-audio.mp3');
      await fs.writeFile(testFilePath, 'fake audio data');

      const result = await voiceSynthesisService.deleteAudioFile(testFilePath);

      expect(result).toBe(true);

      // Verify file was deleted
      const fileExists = await fs.access(testFilePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('should handle deletion of non-existent file', async () => {
      const nonExistentPath = path.join(audioPath, 'non-existent.mp3');

      const result = await voiceSynthesisService.deleteAudioFile(nonExistentPath);

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return available status when API key is valid', () => {
      requireApiKey.mockReturnValue('valid-api-key');

      const status = voiceSynthesisService.getStatus();

      expect(status.available).toBe(true);
      expect(status.baseUrl).toBe('https://app.resemble.ai/api/v2');
      expect(status.synthesisUrl).toBe('https://f.cluster.resemble.ai/synthesize');
      expect(status.audioPath).toBe(audioPath);
    });

    it('should return unavailable status when API key is invalid', () => {
      requireApiKey.mockImplementation(() => {
        throw new Error('API key not configured');
      });

      const status = voiceSynthesisService.getStatus();

      expect(status.available).toBe(false);
      expect(status.error).toBe('API key not configured');
    });
  });

  describe('generateAudioId', () => {
    it('should generate unique audio IDs', () => {
      const id1 = voiceSynthesisService.generateAudioId();
      const id2 = voiceSynthesisService.generateAudioId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^audio_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^audio_\d+_[a-z0-9]+$/);
    });
  });
});