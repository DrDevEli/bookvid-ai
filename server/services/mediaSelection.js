/**
 * Media Selection Service
 * Handles selection and processing of media assets for video generation
 */

const fs = require('fs').promises;
const path = require('path');
const fileStorage = require('../utils/fileStorage');

class MediaSelectionService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.mediaLibraryPath = path.join(this.uploadPath, 'library');
    
    // Default media assets for templates
    this.defaultAssets = {
      backgroundImages: [
        'library/backgrounds/gradient-blue.jpg',
        'library/backgrounds/gradient-purple.jpg',
        'library/backgrounds/gradient-orange.jpg',
        'library/backgrounds/bokeh-lights.jpg',
        'library/backgrounds/abstract-waves.jpg'
      ],
      backgroundVideos: [
        'library/videos/particles-floating.mp4',
        'library/videos/smooth-gradient.mp4',
        'library/videos/geometric-shapes.mp4'
      ],
      musicTracks: [
        'library/music/upbeat-corporate.mp3',
        'library/music/inspiring-piano.mp3',
        'library/music/modern-electronic.mp3',
        'library/music/cinematic-ambient.mp3'
      ]
    };
  }

  /**
   * Initialize media library directories
   */
  async initialize() {
    try {
      await fs.mkdir(path.join(this.mediaLibraryPath, 'backgrounds'), { recursive: true });
      await fs.mkdir(path.join(this.mediaLibraryPath, 'videos'), { recursive: true });
      await fs.mkdir(path.join(this.mediaLibraryPath, 'music'), { recursive: true });
      
      // Create placeholder files if they don't exist
      await this.createPlaceholderAssets();
    } catch (error) {
      console.error('Failed to initialize media library:', error);
    }
  }

  /**
   * Create placeholder media assets for development
   */
  async createPlaceholderAssets() {
    const placeholders = [
      ...this.defaultAssets.backgroundImages,
      ...this.defaultAssets.backgroundVideos,
      ...this.defaultAssets.musicTracks
    ];

    for (const assetPath of placeholders) {
      const fullPath = path.join(this.uploadPath, assetPath);
      
      try {
        await fs.access(fullPath);
      } catch (error) {
        // File doesn't exist, create placeholder
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        const placeholderContent = `Placeholder media file: ${path.basename(assetPath)}
Created: ${new Date().toISOString()}
Type: ${this.getMediaType(assetPath)}
Usage: Template media asset`;
        
        await fs.writeFile(fullPath, placeholderContent);
      }
    }
  }

  /**
   * Select media assets based on book genre and template
   * @param {Object} book - Book data
   * @param {Object} template - Template configuration
   * @param {Object} script - Generated script
   * @returns {Promise<Object>} Selected media assets
   */
  async selectMediaAssets(book, template, script) {
    const assets = {
      backgroundImages: [],
      backgroundVideos: [],
      musicTrack: null,
      coverImage: null
    };

    // Use book cover if available
    if (book.cover_image_path) {
      const coverInfo = await fileStorage.getFileInfo(book.cover_image_path);
      if (coverInfo.exists) {
        assets.coverImage = {
          path: book.cover_image_path,
          type: 'image',
          usage: 'cover',
          timing: { start: 0, duration: 5 }
        };
      }
    }

    // Select assets based on template configuration
    if (template && template.config) {
      assets.backgroundImages = await this.selectBackgroundImages(book, template, script);
      assets.backgroundVideos = await this.selectBackgroundVideos(book, template, script);
      assets.musicTrack = await this.selectMusicTrack(book, template, script);
    } else {
      // Use default selections
      assets.backgroundImages = await this.getDefaultBackgroundImages(book.genre);
      assets.musicTrack = await this.getDefaultMusicTrack(book.genre);
    }

    return assets;
  }

  /**
   * Select background images based on criteria
   * @param {Object} book - Book data
   * @param {Object} template - Template configuration
   * @param {Object} script - Generated script
   * @returns {Promise<Array>} Selected background images
   */
  async selectBackgroundImages(book, template, script) {
    const images = [];
    const config = template.config;
    
    // Use template-specified images if available
    if (config.backgroundImages && config.backgroundImages.length > 0) {
      for (const imageConfig of config.backgroundImages) {
        const imageInfo = await fileStorage.getFileInfo(imageConfig.path);
        if (imageInfo.exists) {
          images.push({
            path: imageConfig.path,
            type: 'image',
            usage: 'background',
            timing: imageConfig.timing || { start: 0, duration: 10 }
          });
        }
      }
    }

    // If no template images or they don't exist, use defaults
    if (images.length === 0) {
      const defaultImages = await this.getDefaultBackgroundImages(book.genre);
      images.push(...defaultImages);
    }

    return images;
  }

  /**
   * Select background videos based on criteria
   * @param {Object} book - Book data
   * @param {Object} template - Template configuration
   * @param {Object} script - Generated script
   * @returns {Promise<Array>} Selected background videos
   */
  async selectBackgroundVideos(book, template, script) {
    const videos = [];
    const config = template.config;
    
    // Use template-specified videos if available
    if (config.backgroundVideos && config.backgroundVideos.length > 0) {
      for (const videoConfig of config.backgroundVideos) {
        const videoInfo = await fileStorage.getFileInfo(videoConfig.path);
        if (videoInfo.exists) {
          videos.push({
            path: videoConfig.path,
            type: 'video',
            usage: 'background',
            timing: videoConfig.timing || { start: 0, duration: 15 }
          });
        }
      }
    }

    // If no template videos or they don't exist, use defaults
    if (videos.length === 0) {
      const defaultVideos = await this.getDefaultBackgroundVideos(book.genre);
      videos.push(...defaultVideos);
    }

    return videos;
  }

  /**
   * Select music track based on criteria
   * @param {Object} book - Book data
   * @param {Object} template - Template configuration
   * @param {Object} script - Generated script
   * @returns {Promise<Object|null>} Selected music track
   */
  async selectMusicTrack(book, template, script) {
    const config = template.config;
    
    // Use template-specified music if available
    if (config.musicTrack && config.musicTrack.path) {
      const musicInfo = await fileStorage.getFileInfo(config.musicTrack.path);
      if (musicInfo.exists) {
        return {
          path: config.musicTrack.path,
          type: 'audio',
          usage: 'background_music',
          volume: config.musicTrack.volume || 0.3,
          timing: { start: 0, duration: script.estimatedDuration || 60 }
        };
      }
    }

    // Use default music selection
    return await this.getDefaultMusicTrack(book.genre);
  }

  /**
   * Get default background images for a genre
   * @param {string} genre - Book genre
   * @returns {Promise<Array>} Default background images
   */
  async getDefaultBackgroundImages(genre) {
    const genreMapping = {
      'fiction': ['library/backgrounds/gradient-blue.jpg', 'library/backgrounds/abstract-waves.jpg'],
      'non-fiction': ['library/backgrounds/gradient-purple.jpg', 'library/backgrounds/bokeh-lights.jpg'],
      'mystery': ['library/backgrounds/gradient-blue.jpg'],
      'romance': ['library/backgrounds/gradient-orange.jpg'],
      'sci-fi': ['library/backgrounds/abstract-waves.jpg'],
      'fantasy': ['library/backgrounds/gradient-purple.jpg'],
      'biography': ['library/backgrounds/bokeh-lights.jpg'],
      'business': ['library/backgrounds/gradient-blue.jpg']
    };

    const selectedPaths = genreMapping[genre?.toLowerCase()] || this.defaultAssets.backgroundImages.slice(0, 2);
    const images = [];

    for (let i = 0; i < selectedPaths.length; i++) {
      const imagePath = selectedPaths[i];
      
      try {
        const imageInfo = await fileStorage.getFileInfo(imagePath);
        
        if (imageInfo.exists) {
          images.push({
            path: imagePath,
            type: 'image',
            usage: 'background',
            timing: { start: i * 10, duration: 10 }
          });
        } else {
          // Add placeholder image even if file doesn't exist
          images.push({
            path: imagePath,
            type: 'image',
            usage: 'background',
            timing: { start: i * 10, duration: 10 }
          });
        }
      } catch (error) {
        // Add placeholder image on error
        images.push({
          path: imagePath,
          type: 'image',
          usage: 'background',
          timing: { start: i * 10, duration: 10 }
        });
      }
    }

    return images;
  }

  /**
   * Get default background videos for a genre
   * @param {string} genre - Book genre
   * @returns {Promise<Array>} Default background videos
   */
  async getDefaultBackgroundVideos(genre) {
    const genreMapping = {
      'sci-fi': ['library/videos/particles-floating.mp4'],
      'fantasy': ['library/videos/geometric-shapes.mp4'],
      'business': ['library/videos/smooth-gradient.mp4']
    };

    const selectedPaths = genreMapping[genre?.toLowerCase()] || [];
    const videos = [];

    for (let i = 0; i < selectedPaths.length; i++) {
      const videoPath = selectedPaths[i];
      const videoInfo = await fileStorage.getFileInfo(videoPath);
      
      if (videoInfo.exists) {
        videos.push({
          path: videoPath,
          type: 'video',
          usage: 'background',
          timing: { start: i * 15, duration: 15 }
        });
      }
    }

    return videos;
  }

  /**
   * Get default music track for a genre
   * @param {string} genre - Book genre
   * @returns {Promise<Object|null>} Default music track
   */
  async getDefaultMusicTrack(genre) {
    const genreMapping = {
      'fiction': 'library/music/inspiring-piano.mp3',
      'non-fiction': 'library/music/upbeat-corporate.mp3',
      'mystery': 'library/music/cinematic-ambient.mp3',
      'romance': 'library/music/inspiring-piano.mp3',
      'sci-fi': 'library/music/modern-electronic.mp3',
      'fantasy': 'library/music/cinematic-ambient.mp3',
      'biography': 'library/music/upbeat-corporate.mp3',
      'business': 'library/music/upbeat-corporate.mp3'
    };

    const selectedPath = genreMapping[genre?.toLowerCase()] || this.defaultAssets.musicTracks[0];
    const musicInfo = await fileStorage.getFileInfo(selectedPath);
    
    if (musicInfo.exists) {
      return {
        path: selectedPath,
        type: 'audio',
        usage: 'background_music',
        volume: 0.3,
        timing: { start: 0, duration: 60 }
      };
    }

    return null;
  }

  /**
   * Get media type from file path
   * @param {string} filePath - File path
   * @returns {string} Media type
   */
  getMediaType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return 'image';
    } else if (['.mp4', '.avi', '.mov', '.webm'].includes(ext)) {
      return 'video';
    } else if (['.mp3', '.wav', '.aac', '.ogg'].includes(ext)) {
      return 'audio';
    }
    
    return 'unknown';
  }

  /**
   * Validate media asset
   * @param {string} assetPath - Path to media asset
   * @returns {Promise<Object>} Validation result
   */
  async validateMediaAsset(assetPath) {
    try {
      const fileInfo = await fileStorage.getFileInfo(assetPath);
      
      if (!fileInfo.exists) {
        return {
          valid: false,
          error: 'File does not exist'
        };
      }

      const mediaType = this.getMediaType(assetPath);
      
      if (mediaType === 'unknown') {
        return {
          valid: false,
          error: 'Unsupported media type'
        };
      }

      return {
        valid: true,
        type: mediaType,
        size: fileInfo.size,
        path: assetPath
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get available media assets in library
   * @param {string} type - Media type filter (image, video, audio)
   * @returns {Promise<Array>} Available media assets
   */
  async getAvailableAssets(type = null) {
    const assets = [];
    
    try {
      const assetPaths = [
        ...this.defaultAssets.backgroundImages,
        ...this.defaultAssets.backgroundVideos,
        ...this.defaultAssets.musicTracks
      ];

      for (const assetPath of assetPaths) {
        const mediaType = this.getMediaType(assetPath);
        
        if (type && mediaType !== type) {
          continue;
        }

        const validation = await this.validateMediaAsset(assetPath);
        
        if (validation.valid) {
          assets.push({
            path: assetPath,
            name: path.basename(assetPath),
            type: mediaType,
            size: validation.size,
            category: this.getAssetCategory(assetPath)
          });
        }
      }
    } catch (error) {
      console.error('Error getting available assets:', error);
    }

    return assets;
  }

  /**
   * Get asset category from path
   * @param {string} assetPath - Asset path
   * @returns {string} Asset category
   */
  getAssetCategory(assetPath) {
    if (assetPath.includes('/backgrounds/')) {
      return 'background-image';
    } else if (assetPath.includes('/videos/')) {
      return 'background-video';
    } else if (assetPath.includes('/music/')) {
      return 'background-music';
    }
    
    return 'other';
  }

  /**
   * Get service status
   * @returns {Promise<Object>} Service status
   */
  async getStatus() {
    try {
      await this.initialize();
      
      const assets = await this.getAvailableAssets();
      const assetsByType = {
        images: assets.filter(a => a.type === 'image').length,
        videos: assets.filter(a => a.type === 'video').length,
        audio: assets.filter(a => a.type === 'audio').length
      };

      return {
        available: true,
        mediaLibraryPath: this.mediaLibraryPath,
        totalAssets: assets.length,
        assetsByType,
        defaultAssets: {
          backgroundImages: this.defaultAssets.backgroundImages.length,
          backgroundVideos: this.defaultAssets.backgroundVideos.length,
          musicTracks: this.defaultAssets.musicTracks.length
        }
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }
}

module.exports = new MediaSelectionService();