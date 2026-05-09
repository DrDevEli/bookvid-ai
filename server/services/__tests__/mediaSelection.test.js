/**
 * Media Selection Service Tests
 */

const mediaSelectionService = require('../mediaSelection');
const fileStorage = require('../../utils/fileStorage');

// Mock dependencies
jest.mock('../../utils/fileStorage');

describe('MediaSelectionService', () => {
  let mockBook, mockTemplate, mockScript;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock data
    mockBook = {
      id: 'book-123',
      title: 'Test Book',
      author: 'Test Author',
      genre: 'fiction',
      description: 'A test book description',
      cover_image_path: 'uploads/covers/test-cover.jpg'
    };

    mockTemplate = {
      id: 'template-123',
      name: 'Test Template',
      config: {
        backgroundImages: [
          {
            path: 'library/backgrounds/template-bg.jpg',
            timing: { start: 0, duration: 10 }
          }
        ],
        backgroundVideos: [
          {
            path: 'library/videos/template-video.mp4',
            timing: { start: 0, duration: 15 }
          }
        ],
        musicTrack: {
          path: 'library/music/template-music.mp3',
          volume: 0.4
        }
      }
    };

    mockScript = {
      id: 'script-123',
      estimatedDuration: 60
    };

    // Mock file storage
    fileStorage.getFileInfo.mockResolvedValue({
      exists: true,
      size: 1024
    });
  });

  describe('selectMediaAssets', () => {
    it('should select media assets based on template configuration', async () => {
      const assets = await mediaSelectionService.selectMediaAssets(mockBook, mockTemplate, mockScript);

      expect(assets).toHaveProperty('backgroundImages');
      expect(assets).toHaveProperty('backgroundVideos');
      expect(assets).toHaveProperty('musicTrack');
      expect(assets).toHaveProperty('coverImage');

      expect(assets.coverImage).toEqual({
        path: mockBook.cover_image_path,
        type: 'image',
        usage: 'cover',
        timing: { start: 0, duration: 5 }
      });

      expect(assets.backgroundImages).toHaveLength(1);
      expect(assets.backgroundImages[0]).toEqual({
        path: 'library/backgrounds/template-bg.jpg',
        type: 'image',
        usage: 'background',
        timing: { start: 0, duration: 10 }
      });

      expect(assets.backgroundVideos).toHaveLength(1);
      expect(assets.backgroundVideos[0]).toEqual({
        path: 'library/videos/template-video.mp4',
        type: 'video',
        usage: 'background',
        timing: { start: 0, duration: 15 }
      });

      expect(assets.musicTrack).toEqual({
        path: 'library/music/template-music.mp3',
        type: 'audio',
        usage: 'background_music',
        volume: 0.4,
        timing: { start: 0, duration: 60 }
      });
    });

    it('should use default assets when template has no configuration', async () => {
      const templateWithoutConfig = { id: 'template-123', config: null };
      
      const assets = await mediaSelectionService.selectMediaAssets(mockBook, templateWithoutConfig, mockScript);

      expect(assets.backgroundImages.length).toBeGreaterThan(0);
      expect(assets.musicTrack).toBeTruthy();
    });

    it('should handle missing book cover', async () => {
      const bookWithoutCover = { ...mockBook, cover_image_path: null };
      
      const assets = await mediaSelectionService.selectMediaAssets(bookWithoutCover, mockTemplate, mockScript);

      expect(assets.coverImage).toBeNull();
    });

    it('should handle non-existent template files', async () => {
      fileStorage.getFileInfo.mockResolvedValue({
        exists: false,
        size: 0
      });

      const assets = await mediaSelectionService.selectMediaAssets(mockBook, mockTemplate, mockScript);

      // Should fall back to default assets
      expect(assets.backgroundImages.length).toBeGreaterThan(0);
    });
  });

  describe('getDefaultBackgroundImages', () => {
    it('should return genre-specific images for fiction', async () => {
      const images = await mediaSelectionService.getDefaultBackgroundImages('fiction');

      expect(images).toHaveLength(2);
      expect(images[0].path).toContain('gradient-blue.jpg');
      expect(images[1].path).toContain('abstract-waves.jpg');
    });

    it('should return default images for unknown genre', async () => {
      const images = await mediaSelectionService.getDefaultBackgroundImages('unknown-genre');

      expect(images.length).toBeGreaterThan(0);
    });

    it('should handle case-insensitive genre matching', async () => {
      const images1 = await mediaSelectionService.getDefaultBackgroundImages('FICTION');
      const images2 = await mediaSelectionService.getDefaultBackgroundImages('fiction');

      expect(images1).toEqual(images2);
    });
  });

  describe('getDefaultMusicTrack', () => {
    it('should return genre-specific music for business', async () => {
      const music = await mediaSelectionService.getDefaultMusicTrack('business');

      expect(music).toBeTruthy();
      expect(music.path).toContain('upbeat-corporate.mp3');
      expect(music.type).toBe('audio');
      expect(music.usage).toBe('background_music');
      expect(music.volume).toBe(0.3);
    });

    it('should return default music for unknown genre', async () => {
      const music = await mediaSelectionService.getDefaultMusicTrack('unknown-genre');

      expect(music).toBeTruthy();
      expect(music.type).toBe('audio');
    });

    it('should return null when music file does not exist', async () => {
      fileStorage.getFileInfo.mockResolvedValue({
        exists: false,
        size: 0
      });

      const music = await mediaSelectionService.getDefaultMusicTrack('business');

      expect(music).toBeNull();
    });
  });

  describe('getMediaType', () => {
    it('should identify image files correctly', () => {
      expect(mediaSelectionService.getMediaType('test.jpg')).toBe('image');
      expect(mediaSelectionService.getMediaType('test.png')).toBe('image');
      expect(mediaSelectionService.getMediaType('test.gif')).toBe('image');
      expect(mediaSelectionService.getMediaType('test.webp')).toBe('image');
    });

    it('should identify video files correctly', () => {
      expect(mediaSelectionService.getMediaType('test.mp4')).toBe('video');
      expect(mediaSelectionService.getMediaType('test.avi')).toBe('video');
      expect(mediaSelectionService.getMediaType('test.mov')).toBe('video');
      expect(mediaSelectionService.getMediaType('test.webm')).toBe('video');
    });

    it('should identify audio files correctly', () => {
      expect(mediaSelectionService.getMediaType('test.mp3')).toBe('audio');
      expect(mediaSelectionService.getMediaType('test.wav')).toBe('audio');
      expect(mediaSelectionService.getMediaType('test.aac')).toBe('audio');
      expect(mediaSelectionService.getMediaType('test.ogg')).toBe('audio');
    });

    it('should return unknown for unsupported files', () => {
      expect(mediaSelectionService.getMediaType('test.txt')).toBe('unknown');
      expect(mediaSelectionService.getMediaType('test.pdf')).toBe('unknown');
    });

    it('should handle case insensitive extensions', () => {
      expect(mediaSelectionService.getMediaType('test.JPG')).toBe('image');
      expect(mediaSelectionService.getMediaType('test.MP4')).toBe('video');
      expect(mediaSelectionService.getMediaType('test.MP3')).toBe('audio');
    });
  });

  describe('validateMediaAsset', () => {
    it('should validate existing media asset', async () => {
      const validation = await mediaSelectionService.validateMediaAsset('test.jpg');

      expect(validation.valid).toBe(true);
      expect(validation.type).toBe('image');
      expect(validation.size).toBe(1024);
      expect(validation.path).toBe('test.jpg');
    });

    it('should reject non-existent file', async () => {
      fileStorage.getFileInfo.mockResolvedValue({
        exists: false,
        size: 0
      });

      const validation = await mediaSelectionService.validateMediaAsset('nonexistent.jpg');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('File does not exist');
    });

    it('should reject unsupported file type', async () => {
      const validation = await mediaSelectionService.validateMediaAsset('test.txt');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Unsupported media type');
    });

    it('should handle file system errors', async () => {
      fileStorage.getFileInfo.mockRejectedValue(new Error('File system error'));

      const validation = await mediaSelectionService.validateMediaAsset('test.jpg');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('File system error');
    });
  });

  describe('getAvailableAssets', () => {
    it('should return all available assets', async () => {
      const assets = await mediaSelectionService.getAvailableAssets();

      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBeGreaterThan(0);
      
      const asset = assets[0];
      expect(asset).toHaveProperty('path');
      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('type');
      expect(asset).toHaveProperty('size');
      expect(asset).toHaveProperty('category');
    });

    it('should filter assets by type', async () => {
      const imageAssets = await mediaSelectionService.getAvailableAssets('image');

      expect(imageAssets.every(asset => asset.type === 'image')).toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      fileStorage.getFileInfo.mockResolvedValue({
        exists: false,
        size: 0
      });

      const assets = await mediaSelectionService.getAvailableAssets();

      expect(Array.isArray(assets)).toBe(true);
      expect(assets).toHaveLength(0);
    });
  });

  describe('getAssetCategory', () => {
    it('should categorize background images', () => {
      const category = mediaSelectionService.getAssetCategory('library/backgrounds/test.jpg');
      expect(category).toBe('background-image');
    });

    it('should categorize background videos', () => {
      const category = mediaSelectionService.getAssetCategory('library/videos/test.mp4');
      expect(category).toBe('background-video');
    });

    it('should categorize background music', () => {
      const category = mediaSelectionService.getAssetCategory('library/music/test.mp3');
      expect(category).toBe('background-music');
    });

    it('should return other for unknown paths', () => {
      const category = mediaSelectionService.getAssetCategory('unknown/path/test.jpg');
      expect(category).toBe('other');
    });
  });

  describe('getStatus', () => {
    it('should return service status', async () => {
      const status = await mediaSelectionService.getStatus();

      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('mediaLibraryPath');
      expect(status).toHaveProperty('totalAssets');
      expect(status).toHaveProperty('assetsByType');
      expect(status).toHaveProperty('defaultAssets');

      expect(status.available).toBe(true);
      expect(typeof status.totalAssets).toBe('number');
      expect(status.assetsByType).toHaveProperty('images');
      expect(status.assetsByType).toHaveProperty('videos');
      expect(status.assetsByType).toHaveProperty('audio');
    });

    it('should handle service errors', async () => {
      // Mock initialization failure
      const originalInitialize = mediaSelectionService.initialize;
      mediaSelectionService.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));

      const status = await mediaSelectionService.getStatus();

      expect(status.available).toBe(false);
      expect(status.error).toBe('Init failed');

      // Restore original method
      mediaSelectionService.initialize = originalInitialize;
    });
  });
});