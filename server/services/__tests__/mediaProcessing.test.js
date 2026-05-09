const fs = require('fs').promises;
const path = require('path');

// Mock environment variables before requiring the service
process.env.UPLOAD_PATH = './test-media-uploads';

const mediaProcessing = require('../mediaProcessing');

describe('MediaProcessingService', () => {
  const testUploadPath = './test-media-uploads';
  
  beforeAll(async () => {
    // Clean up any existing test directory
    try {
      await fs.rm(testUploadPath, { recursive: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testUploadPath, { recursive: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
  });

  beforeEach(async () => {
    await mediaProcessing.initialize();
  });

  describe('initialize', () => {
    it('should create all required directories', async () => {
      await mediaProcessing.initialize();

      const expectedDirs = ['temp', 'videos', 'thumbnails', 'audio', 'covers'];
      
      for (const dir of expectedDirs) {
        const dirPath = path.join(testUploadPath, dir);
        const stats = await fs.stat(dirPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });
  });

  describe('processUploadedMedia', () => {
    it('should process valid image files', async () => {
      // Create a mock image file with proper JPEG signature
      const tempDir = path.join(testUploadPath, 'temp');
      const testFilePath = path.join(tempDir, 'test-image.jpg');
      const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      await fs.writeFile(testFilePath, jpegSignature);

      const mockFiles = [{
        originalname: 'test-image.jpg',
        filename: 'test-image.jpg',
        path: testFilePath,
        size: jpegSignature.length,
        mimetype: 'image/jpeg'
      }];

      const result = await mediaProcessing.processUploadedMedia(mockFiles, 'covers');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('covers');
      expect(result[0].originalName).toBe('test-image.jpg');
      expect(result[0].thumbnailPath).toBeDefined();
    });

    it('should handle multiple files', async () => {
      const tempDir = path.join(testUploadPath, 'temp');
      
      // Create mock files with proper signatures
      const file1Path = path.join(tempDir, 'image1.jpg');
      const file2Path = path.join(tempDir, 'audio1.mp3');
      const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const mp3Signature = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00]);
      await fs.writeFile(file1Path, jpegSignature);
      await fs.writeFile(file2Path, mp3Signature);

      const mockFiles = [
        {
          originalname: 'image1.jpg',
          filename: 'image1.jpg',
          path: file1Path,
          size: jpegSignature.length,
          mimetype: 'image/jpeg'
        },
        {
          originalname: 'audio1.mp3',
          filename: 'audio1.mp3',
          path: file2Path,
          size: mp3Signature.length,
          mimetype: 'audio/mp3'
        }
      ];

      const result = await mediaProcessing.processUploadedMedia(mockFiles);

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('covers'); // Images are mapped to covers directory
      expect(result[1].category).toBe('audio');
    });
  });

  describe('startVideoGeneration', () => {
    it('should start video generation and return job info', async () => {
      const videoData = {
        id: 'test-video-123',
        scriptText: 'This is a test script for video generation',
        audioPath: null,
        mediaFiles: [],
        template: {}
      };

      const result = await mediaProcessing.startVideoGeneration(videoData);

      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('processing');
      expect(typeof result.progress).toBe('number');

      // Check that job is tracked
      const jobStatus = mediaProcessing.getJobStatus(result.jobId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus.videoId).toBe('test-video-123');
    });

    it('should validate required inputs', async () => {
      const invalidVideoData = {
        id: 'test-video-123',
        // Missing scriptText
        audioPath: null,
        mediaFiles: [],
        template: {}
      };

      const result = await mediaProcessing.startVideoGeneration(invalidVideoData);
      
      // Wait a bit for async processing to catch the error
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const jobStatus = mediaProcessing.getJobStatus(result.jobId);
      expect(jobStatus.status).toBe('failed');
      expect(jobStatus.error).toContain('Script text is required');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      const videoData = {
        id: 'test-video-456',
        scriptText: 'Test script',
        audioPath: null,
        mediaFiles: [],
        template: {}
      };

      const result = await mediaProcessing.startVideoGeneration(videoData);
      const jobStatus = mediaProcessing.getJobStatus(result.jobId);

      expect(jobStatus).toBeDefined();
      expect(jobStatus.id).toBe(result.jobId);
      expect(jobStatus.videoId).toBe('test-video-456');
      expect(jobStatus.status).toBe('processing');
      expect(jobStatus.totalSteps).toBeGreaterThan(0);
    });

    it('should return null for non-existent job', () => {
      const jobStatus = mediaProcessing.getJobStatus('non-existent-job');
      expect(jobStatus).toBeNull();
    });
  });

  describe('cancelJob', () => {
    it('should cancel an active job', async () => {
      const videoData = {
        id: 'test-video-789',
        scriptText: 'Test script',
        audioPath: null,
        mediaFiles: [],
        template: {}
      };

      const result = await mediaProcessing.startVideoGeneration(videoData);
      const cancelled = mediaProcessing.cancelJob(result.jobId);

      expect(cancelled).toBe(true);

      const jobStatus = mediaProcessing.getJobStatus(result.jobId);
      expect(jobStatus.status).toBe('cancelled');
    });

    it('should return false for non-existent job', () => {
      const cancelled = mediaProcessing.cancelJob('non-existent-job');
      expect(cancelled).toBe(false);
    });
  });

  describe('generateImageThumbnail', () => {
    it('should generate thumbnail for image', async () => {
      const coversDir = path.join(testUploadPath, 'covers');
      const imagePath = path.join(coversDir, 'test-image.jpg');
      await fs.writeFile(imagePath, 'fake image content');

      const thumbnailPath = await mediaProcessing.generateImageThumbnail(imagePath, 'test-image.jpg');

      expect(thumbnailPath).toBeDefined();
      expect(thumbnailPath).toContain('thumb_test-image.jpg');

      // Check thumbnail file exists
      const fullThumbnailPath = path.join(testUploadPath, thumbnailPath);
      const thumbnailExists = await fs.access(fullThumbnailPath).then(() => true).catch(() => false);
      expect(thumbnailExists).toBe(true);
    });
  });

  describe('generateVideoThumbnail', () => {
    it('should generate thumbnail for video', async () => {
      const videosDir = path.join(testUploadPath, 'videos');
      const videoPath = path.join(videosDir, 'test-video.mp4');
      await fs.writeFile(videoPath, 'fake video content');

      const thumbnailPath = await mediaProcessing.generateVideoThumbnail(videoPath, 'test-video.mp4');

      expect(thumbnailPath).toBeDefined();
      expect(thumbnailPath).toContain('thumb_test-video.jpg');

      // Check thumbnail file exists
      const fullThumbnailPath = path.join(testUploadPath, thumbnailPath);
      const thumbnailExists = await fs.access(fullThumbnailPath).then(() => true).catch(() => false);
      expect(thumbnailExists).toBe(true);
    });
  });

  describe('cleanupCompletedJobs', () => {
    it('should clean up old completed jobs', async () => {
      // Create a job and mark it as completed with old timestamp
      const videoData = {
        id: 'old-video',
        scriptText: 'Test script',
        audioPath: null,
        mediaFiles: [],
        template: {}
      };

      const result = await mediaProcessing.startVideoGeneration(videoData);
      
      // Manually mark job as completed with old timestamp
      const job = mediaProcessing.processingJobs.get(result.jobId);
      job.status = 'completed';
      job.completedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago

      const cleanedCount = mediaProcessing.cleanupCompletedJobs(24);
      expect(cleanedCount).toBe(1);

      // Job should be removed
      const jobStatus = mediaProcessing.getJobStatus(result.jobId);
      expect(jobStatus).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const stats = mediaProcessing.getStats();

      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('activeJobs');
      expect(stats).toHaveProperty('completedJobs');
      expect(stats).toHaveProperty('failedJobs');
      expect(stats).toHaveProperty('cancelledJobs');
      expect(stats).toHaveProperty('paths');
      expect(stats.paths).toHaveProperty('upload');
      expect(stats.paths).toHaveProperty('temp');
      expect(stats.paths).toHaveProperty('video');
    });
  });

  describe('getStatus', () => {
    it('should return service status', async () => {
      const status = await mediaProcessing.getStatus();

      expect(status.available).toBe(true);
      expect(status).toHaveProperty('directories');
      expect(status).toHaveProperty('stats');
    });
  });
});