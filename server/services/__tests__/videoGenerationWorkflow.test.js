const fs = require('fs').promises;
const path = require('path');
const videoGenerationWorkflow = require('../videoGenerationWorkflow');

// Mock all the service dependencies
jest.mock('../scriptGeneration', () => ({
  generateScript: jest.fn(),
  validateRequest: jest.fn()
}));

jest.mock('../voiceSynthesis', () => ({
  generateVoiceover: jest.fn(),
  validateRequest: jest.fn()
}));

jest.mock('../mediaSelection', () => ({
  selectMediaAssets: jest.fn(),
  initialize: jest.fn()
}));

jest.mock('../videoRenderer', () => ({
  renderVideo: jest.fn(),
  initialize: jest.fn()
}));

jest.mock('../../models/Video', () => {
  return jest.fn().mockImplementation(() => ({
    createVideo: jest.fn(),
    updateVideoStatus: jest.fn(),
    getVideoById: jest.fn()
  }));
});

jest.mock('../../models/Book', () => {
  return jest.fn().mockImplementation(() => ({
    getBookById: jest.fn()
  }));
});

jest.mock('../../models/Template', () => {
  return jest.fn().mockImplementation(() => ({
    getTemplateById: jest.fn()
  }));
});

const scriptGeneration = require('../scriptGeneration');
const voiceSynthesis = require('../voiceSynthesis');
const mediaSelection = require('../mediaSelection');
const videoRenderer = require('../videoRenderer');
const VideoRepository = require('../../models/Video');
const BookRepository = require('../../models/Book');
const TemplateRepository = require('../../models/Template');

describe('VideoGenerationWorkflow Integration Tests', () => {
  let videoRepo, bookRepo, templateRepo;
  const testUploadPath = process.env.UPLOAD_PATH;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create repository instances
    videoRepo = new VideoRepository();
    bookRepo = new BookRepository();
    templateRepo = new TemplateRepository();
  });

  describe('Complete Video Generation Workflow', () => {
    const mockBookData = {
      id: 'book-123',
      user_id: 'user-123',
      title: 'Test Book',
      author: 'Test Author',
      genre: 'Fiction',
      description: 'A fascinating test book for integration testing',
      content: 'This is the content of the test book that will be used to generate a video script.'
    };

    const mockTemplateData = {
      id: 'template-001',
      name: 'Classic Book Trailer',
      category: 'trailer',
      config: {
        duration: 60,
        backgroundImages: [
          { path: 'library/backgrounds/gradient-blue.jpg', timing: { start: 0, duration: 30 } }
        ],
        musicTrack: { path: 'library/music/inspiring-piano.mp3', volume: 0.3 }
      }
    };

    const mockScriptData = {
      id: 'script-123',
      bookId: mockBookData.id,
      title: 'Test Book - Book Trailer',
      hook: 'Discover an amazing story...',
      mainContent: 'This book will take you on a journey through adventure and mystery.',
      callToAction: 'Get your copy today!',
      estimatedDuration: 60,
      keyPoints: ['Adventure', 'Mystery', 'Compelling characters'],
      tone: 'engaging',
      text: 'Discover an amazing story... This book will take you on a journey through adventure and mystery. Get your copy today!'
    };

    const mockVoiceoverData = {
      id: 'audio-123',
      scriptId: mockScriptData.id,
      filePath: path.join(testUploadPath, 'audio', 'voiceover_script-123_123456.mp3'),
      fileName: 'voiceover_script-123_123456.mp3',
      fileSize: 1024000,
      duration: 58,
      voiceId: 'pNInz6obpgDQGcFmaJgB'
    };

    const mockMediaAssets = {
      backgroundImages: [
        {
          path: 'library/backgrounds/gradient-blue.jpg',
          type: 'image',
          usage: 'background',
          timing: { start: 0, duration: 30 }
        }
      ],
      backgroundVideos: [],
      musicTrack: {
        path: 'library/music/inspiring-piano.mp3',
        type: 'audio',
        usage: 'background_music',
        volume: 0.3,
        timing: { start: 0, duration: 60 }
      },
      coverImage: null
    };

    const mockVideoData = {
      id: 'video-123',
      user_id: mockBookData.user_id,
      book_id: mockBookData.id,
      title: mockScriptData.title,
      script: mockScriptData.text,
      template_id: mockTemplateData.id,
      status: 'generating'
    };

    const mockRenderedVideo = {
      id: 'render-123',
      videoPath: path.join(testUploadPath, 'videos', 'video_test-book_123456.mp4'),
      thumbnailPath: path.join(testUploadPath, 'thumbnails', 'thumb_video_test-book.jpg'),
      duration: 58,
      fileSize: 15728640, // 15MB
      resolution: '1920x1080',
      format: 'mp4'
    };

    beforeEach(() => {
      // Mock repository methods
      bookRepo.getBookById.mockReturnValue(mockBookData);
      templateRepo.getTemplateById.mockReturnValue(mockTemplateData);
      videoRepo.createVideo.mockReturnValue(mockVideoData);
      videoRepo.updateVideoStatus.mockReturnValue({ ...mockVideoData, status: 'completed' });
      videoRepo.getVideoById.mockReturnValue(mockVideoData);

      // Mock service methods
      scriptGeneration.validateRequest.mockImplementation(() => {});
      scriptGeneration.generateScript.mockResolvedValue(mockScriptData);

      voiceSynthesis.validateRequest.mockImplementation(() => {});
      voiceSynthesis.generateVoiceover.mockResolvedValue(mockVoiceoverData);

      mediaSelection.initialize.mockResolvedValue();
      mediaSelection.selectMediaAssets.mockResolvedValue(mockMediaAssets);

      videoRenderer.initialize.mockResolvedValue();
      videoRenderer.renderVideo.mockResolvedValue(mockRenderedVideo);
    });

    it('should complete the entire video generation workflow successfully', async () => {
      const workflowInput = {
        userId: mockBookData.user_id,
        bookId: mockBookData.id,
        templateId: mockTemplateData.id,
        options: {
          scriptOptions: { tone: 'engaging', duration: 60 },
          voiceOptions: { voiceId: 'pNInz6obpgDQGcFmaJgB', stability: 0.5 }
        }
      };

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      // Verify the workflow completed successfully
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('videoId', mockVideoData.id);
      expect(result).toHaveProperty('video');
      expect(result.video).toHaveProperty('status', 'completed');

      // Verify all services were called in the correct order
      expect(bookRepo.getBookById).toHaveBeenCalledWith(mockBookData.id);
      expect(templateRepo.getTemplateById).toHaveBeenCalledWith(mockTemplateData.id);
      
      expect(scriptGeneration.validateRequest).toHaveBeenCalledWith(mockBookData);
      expect(scriptGeneration.generateScript).toHaveBeenCalledWith(
        mockBookData,
        workflowInput.options.scriptOptions
      );

      expect(voiceSynthesis.validateRequest).toHaveBeenCalledWith(mockScriptData);
      expect(voiceSynthesis.generateVoiceover).toHaveBeenCalledWith(
        mockScriptData,
        workflowInput.options.voiceOptions
      );

      expect(mediaSelection.selectMediaAssets).toHaveBeenCalledWith(
        mockBookData,
        mockTemplateData,
        mockScriptData
      );

      expect(videoRenderer.renderVideo).toHaveBeenCalledWith({
        script: mockScriptData,
        voiceover: mockVoiceoverData,
        mediaAssets: mockMediaAssets,
        template: mockTemplateData,
        book: mockBookData
      });

      // Verify video record was created and updated
      expect(videoRepo.createVideo).toHaveBeenCalledWith({
        user_id: workflowInput.userId,
        book_id: workflowInput.bookId,
        title: mockScriptData.title,
        script: mockScriptData.text,
        template_id: workflowInput.templateId
      });

      expect(videoRepo.updateVideoStatus).toHaveBeenCalledWith(
        mockVideoData.id,
        'completed',
        {
          video_path: mockRenderedVideo.videoPath,
          thumbnail_path: mockRenderedVideo.thumbnailPath,
          duration: mockRenderedVideo.duration
        }
      );
    });

    it('should handle script generation failures gracefully', async () => {
      scriptGeneration.generateScript.mockRejectedValue(new Error('OpenAI API error'));

      const workflowInput = {
        userId: mockBookData.user_id,
        bookId: mockBookData.id,
        templateId: mockTemplateData.id
      };

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Script generation failed');

      // Verify video status was updated to failed
      expect(videoRepo.updateVideoStatus).toHaveBeenCalledWith(
        mockVideoData.id,
        'failed',
        expect.objectContaining({
          error: expect.stringContaining('Script generation failed')
        })
      );

      // Verify subsequent services were not called
      expect(voiceSynthesis.generateVoiceover).not.toHaveBeenCalled();
      expect(videoRenderer.renderVideo).not.toHaveBeenCalled();
    });

    it('should handle voice synthesis failures gracefully', async () => {
      voiceSynthesis.generateVoiceover.mockRejectedValue(new Error('ElevenLabs API quota exceeded'));

      const workflowInput = {
        userId: mockBookData.user_id,
        bookId: mockBookData.id,
        templateId: mockTemplateData.id
      };

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Voice synthesis failed');

      // Verify script generation completed successfully
      expect(scriptGeneration.generateScript).toHaveBeenCalled();

      // Verify video status was updated to failed
      expect(videoRepo.updateVideoStatus).toHaveBeenCalledWith(
        mockVideoData.id,
        'failed',
        expect.objectContaining({
          error: expect.stringContaining('Voice synthesis failed')
        })
      );

      // Verify video rendering was not called
      expect(videoRenderer.renderVideo).not.toHaveBeenCalled();
    });

    it('should handle video rendering failures gracefully', async () => {
      videoRenderer.renderVideo.mockRejectedValue(new Error('FFmpeg rendering failed'));

      const workflowInput = {
        userId: mockBookData.user_id,
        bookId: mockBookData.id,
        templateId: mockTemplateData.id
      };

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Video rendering failed');

      // Verify all previous steps completed
      expect(scriptGeneration.generateScript).toHaveBeenCalled();
      expect(voiceSynthesis.generateVoiceover).toHaveBeenCalled();
      expect(mediaSelection.selectMediaAssets).toHaveBeenCalled();

      // Verify video status was updated to failed
      expect(videoRepo.updateVideoStatus).toHaveBeenCalledWith(
        mockVideoData.id,
        'failed',
        expect.objectContaining({
          error: expect.stringContaining('Video rendering failed')
        })
      );
    });

    it('should handle missing book data', async () => {
      bookRepo.getBookById.mockReturnValue(null);

      const workflowInput = {
        userId: 'user-123',
        bookId: 'non-existent-book',
        templateId: mockTemplateData.id
      };

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Book not found');

      // Verify no services were called
      expect(scriptGeneration.generateScript).not.toHaveBeenCalled();
      expect(voiceSynthesis.generateVoiceover).not.toHaveBeenCalled();
      expect(videoRenderer.renderVideo).not.toHaveBeenCalled();
    });

    it('should handle missing template data', async () => {
      templateRepo.getTemplateById.mockReturnValue(null);

      const workflowInput = {
        userId: mockBookData.user_id,
        bookId: mockBookData.id,
        templateId: 'non-existent-template'
      };

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Template not found');

      // Verify no services were called
      expect(scriptGeneration.generateScript).not.toHaveBeenCalled();
      expect(voiceSynthesis.generateVoiceover).not.toHaveBeenCalled();
      expect(videoRenderer.renderVideo).not.toHaveBeenCalled();
    });

    it('should validate user permissions', async () => {
      // Mock book belonging to different user
      bookRepo.getBookById.mockReturnValue({
        ...mockBookData,
        user_id: 'different-user-id'
      });

      const workflowInput = {
        userId: 'user-123',
        bookId: mockBookData.id,
        templateId: mockTemplateData.id
      };

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Access denied');

      // Verify no services were called
      expect(scriptGeneration.generateScript).not.toHaveBeenCalled();
    });

    it('should handle workflow cancellation', async () => {
      // Mock a long-running script generation
      scriptGeneration.generateScript.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockScriptData), 5000))
      );

      const workflowInput = {
        userId: mockBookData.user_id,
        bookId: mockBookData.id,
        templateId: mockTemplateData.id
      };

      // Start the workflow
      const workflowPromise = videoGenerationWorkflow.generateVideo(workflowInput);

      // Cancel it after a short delay
      setTimeout(() => {
        videoGenerationWorkflow.cancelVideo(mockVideoData.id);
      }, 100);

      const result = await workflowPromise;

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('cancelled');

      // Verify video status was updated to failed
      expect(videoRepo.updateVideoStatus).toHaveBeenCalledWith(
        mockVideoData.id,
        'failed',
        expect.objectContaining({
          error: expect.stringContaining('cancelled')
        })
      );
    });
  });

  describe('Workflow Progress Tracking', () => {
    it('should track progress through each stage', async () => {
      const mockProgressCallback = jest.fn();

      const workflowInput = {
        userId: 'user-123',
        bookId: 'book-123',
        templateId: 'template-001',
        onProgress: mockProgressCallback
      };

      // Mock successful workflow
      bookRepo.getBookById.mockReturnValue({ id: 'book-123', user_id: 'user-123' });
      templateRepo.getTemplateById.mockReturnValue({ id: 'template-001' });
      videoRepo.createVideo.mockReturnValue({ id: 'video-123' });
      scriptGeneration.generateScript.mockResolvedValue({ id: 'script-123' });
      voiceSynthesis.generateVoiceover.mockResolvedValue({ id: 'audio-123' });
      mediaSelection.selectMediaAssets.mockResolvedValue({});
      videoRenderer.renderVideo.mockResolvedValue({ id: 'render-123' });

      await videoGenerationWorkflow.generateVideo(workflowInput);

      // Verify progress was tracked
      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'script_generation',
        progress: 25,
        message: 'Generating video script...'
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'voice_synthesis',
        progress: 50,
        message: 'Generating voiceover...'
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'media_selection',
        progress: 75,
        message: 'Selecting media assets...'
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'video_rendering',
        progress: 90,
        message: 'Rendering final video...'
      });

      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'completed',
        progress: 100,
        message: 'Video generation completed successfully!'
      });
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should retry failed operations with exponential backoff', async () => {
      // Mock script generation to fail twice then succeed
      scriptGeneration.generateScript
        .mockRejectedValueOnce(new Error('Temporary API error'))
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({ id: 'script-123', text: 'Generated script' });

      const workflowInput = {
        userId: 'user-123',
        bookId: 'book-123',
        templateId: 'template-001',
        retryOptions: {
          maxRetries: 3,
          baseDelay: 100
        }
      };

      // Mock other dependencies
      bookRepo.getBookById.mockReturnValue({ id: 'book-123', user_id: 'user-123' });
      templateRepo.getTemplateById.mockReturnValue({ id: 'template-001' });
      videoRepo.createVideo.mockReturnValue({ id: 'video-123' });

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      expect(result).toHaveProperty('success', true);
      expect(scriptGeneration.generateScript).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retry attempts', async () => {
      // Mock script generation to always fail
      scriptGeneration.generateScript.mockRejectedValue(new Error('Persistent API error'));

      const workflowInput = {
        userId: 'user-123',
        bookId: 'book-123',
        templateId: 'template-001',
        retryOptions: {
          maxRetries: 2,
          baseDelay: 50
        }
      };

      // Mock other dependencies
      bookRepo.getBookById.mockReturnValue({ id: 'book-123', user_id: 'user-123' });
      templateRepo.getTemplateById.mockReturnValue({ id: 'template-001' });
      videoRepo.createVideo.mockReturnValue({ id: 'video-123' });

      const result = await videoGenerationWorkflow.generateVideo(workflowInput);

      expect(result).toHaveProperty('success', false);
      expect(result.error).toContain('Script generation failed after 2 retries');
      expect(scriptGeneration.generateScript).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});