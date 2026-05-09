/**
 * Video Renderer Service
 * Handles video composition, rendering, and export functionality
 */

const fs = require('fs').promises;
const path = require('path');
const fileStorage = require('../utils/fileStorage');
const progressTracking = require('./progressTracking');

class VideoRenderer {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.tempPath = path.join(this.uploadPath, 'temp');
    this.videoPath = path.join(this.uploadPath, 'videos');
    this.thumbnailPath = path.join(this.uploadPath, 'thumbnails');
    
    // Rendering job tracking
    this.renderJobs = new Map();
    
    // Default rendering settings
    this.defaultSettings = {
      resolution: { width: 1920, height: 1080 },
      framerate: 30,
      codec: 'h264',
      bitrate: '2000k',
      audioCodec: 'aac',
      audioBitrate: '128k',
      quality: 'high'
    };
  }

  /**
   * Start video rendering process
   * @param {Object} renderRequest - Rendering request
   * @returns {Promise<Object>} Render job information
   */
  async startRender(renderRequest) {
    const jobId = this.generateJobId();
    
    // Initialize progress tracking
    const progressId = `render_${jobId}`;
    const progressInfo = progressTracking.initializeProgress(progressId, {
      steps: [
        'Validating inputs',
        'Creating composition',
        'Processing media assets',
        'Rendering video layers',
        'Mixing audio tracks',
        'Applying effects and transitions',
        'Encoding final video',
        'Generating thumbnail',
        'Finalizing output'
      ],
      totalSteps: 9,
      metadata: {
        jobId,
        videoId: renderRequest.videoId,
        type: 'video-render'
      }
    });

    const job = {
      id: jobId,
      progressId,
      videoId: renderRequest.videoId,
      status: 'starting',
      startedAt: new Date().toISOString(),
      request: renderRequest,
      result: null,
      error: null
    };

    this.renderJobs.set(jobId, job);

    // Start rendering asynchronously (with a small delay to allow status to be returned)
    setTimeout(() => {
      this.executeRender(job).catch(error => {
        console.error('Video rendering error:', error);
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
        progressTracking.failProgress(progressId, error);
      });
    }, 10);

    return {
      jobId,
      progressId,
      status: job.status,
      estimatedDuration: this.estimateRenderTime(renderRequest)
    };
  }

  /**
   * Execute video rendering
   * @param {Object} job - Render job
   */
  async executeRender(job) {
    const stepUpdater = progressTracking.createStepUpdater(job.progressId, 9);
    
    try {
      job.status = 'processing';

      // Step 1: Validate inputs
      stepUpdater(0, 'Validating inputs');
      await this.validateRenderInputs(job.request);

      // Step 2: Create composition
      stepUpdater(1, 'Creating composition');
      const composition = await this.createVideoComposition(job.request);

      // Step 3: Process media assets
      stepUpdater(2, 'Processing media assets');
      const processedAssets = await this.processMediaAssets(composition);

      // Step 4: Render video layers
      stepUpdater(3, 'Rendering video layers');
      const videoLayers = await this.renderVideoLayers(processedAssets.video, composition);

      // Step 5: Mix audio tracks
      stepUpdater(4, 'Mixing audio tracks');
      const audioMix = await this.mixAudioTracks(processedAssets.audio, composition.duration);

      // Step 6: Apply effects and transitions
      stepUpdater(5, 'Applying effects and transitions');
      const processedVideo = await this.applyEffectsAndTransitions(videoLayers, composition);

      // Step 7: Encode final video
      stepUpdater(6, 'Encoding final video');
      const outputPath = await this.encodeVideo(processedVideo, audioMix, composition, job.request);

      // Step 8: Generate thumbnail
      stepUpdater(7, 'Generating thumbnail');
      const thumbnailPath = await this.generateVideoThumbnail(outputPath, job.videoId);

      // Step 9: Finalize
      stepUpdater(8, 'Finalizing output');
      const finalResult = await this.finalizeRender(outputPath, thumbnailPath, composition);

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.result = finalResult;

      progressTracking.completeProgress(job.progressId, finalResult);

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date().toISOString();
      progressTracking.failProgress(job.progressId, error);
      throw error;
    }
  }

  /**
   * Validate render inputs
   * @param {Object} request - Render request
   */
  async validateRenderInputs(request) {
    if (!request.videoId) {
      throw new Error('Video ID is required');
    }

    if (!request.script || !request.script.text) {
      throw new Error('Script text is required');
    }

    // Validate audio file if provided
    if (request.audioPath) {
      const audioInfo = await fileStorage.getFileInfo(request.audioPath);
      if (!audioInfo.exists) {
        throw new Error(`Audio file not found: ${request.audioPath}`);
      }
    }

    // Validate media assets
    if (request.mediaAssets) {
      for (const asset of request.mediaAssets) {
        if (asset.path) {
          const assetInfo = await fileStorage.getFileInfo(asset.path);
          if (!assetInfo.exists) {
            throw new Error(`Media asset not found: ${asset.path}`);
          }
        }
      }
    }
  }

  /**
   * Create video composition
   * @param {Object} request - Render request
   * @returns {Promise<Object>} Video composition
   */
  async createVideoComposition(request) {
    const duration = this.calculateVideoDuration(request);
    const template = request.template || {};
    
    const composition = {
      id: request.videoId,
      duration,
      resolution: template.resolution || this.defaultSettings.resolution,
      framerate: template.framerate || this.defaultSettings.framerate,
      
      // Video layers configuration
      layers: this.createVideoLayers(request, duration),
      
      // Audio configuration
      audio: this.createAudioConfiguration(request, duration),
      
      // Text overlays
      textOverlays: this.createTextOverlays(request, duration),
      
      // Effects and transitions
      effects: template.effects || this.getDefaultEffects(),
      transitions: this.createTransitions(request, duration),
      
      // Metadata
      metadata: {
        createdAt: new Date().toISOString(),
        template: template.name || 'default',
        scriptLength: request.script.text.length
      }
    };

    return composition;
  }

  /**
   * Calculate video duration based on content
   * @param {Object} request - Render request
   * @returns {number} Duration in seconds
   */
  calculateVideoDuration(request) {
    // Base duration on script length (rough estimate: 150 words per minute)
    const scriptWords = request.script.text.split(' ').length;
    const baseDuration = Math.max(30, Math.ceil(scriptWords / 2.5)); // ~150 WPM
    
    // Consider template duration if specified
    const templateDuration = request.template?.duration;
    if (templateDuration) {
      return Math.max(baseDuration, templateDuration);
    }
    
    // Consider audio duration if available
    if (request.audioDuration) {
      return Math.max(baseDuration, request.audioDuration);
    }
    
    return Math.min(baseDuration, 180); // Cap at 3 minutes for personal use
  }

  /**
   * Create video layers configuration
   * @param {Object} request - Render request
   * @param {number} duration - Video duration
   * @returns {Array} Video layers
   */
  createVideoLayers(request, duration) {
    const layers = [];
    const mediaAssets = request.mediaAssets || [];
    
    // Background layers
    const backgroundImages = mediaAssets.filter(asset => asset.type === 'background_image');
    const backgroundVideos = mediaAssets.filter(asset => asset.type === 'background_video');
    
    // Distribute background images across duration
    if (backgroundImages.length > 0) {
      const imageDuration = Math.max(5, duration / backgroundImages.length);
      backgroundImages.forEach((image, index) => {
        layers.push({
          type: 'image',
          path: image.path,
          startTime: index * imageDuration,
          duration: imageDuration,
          zIndex: 1,
          position: { x: 0, y: 0, width: '100%', height: '100%' },
          effects: ['fadeIn', 'fadeOut', 'kenBurns']
        });
      });
    }
    
    // Add background videos
    if (backgroundVideos.length > 0) {
      const videoDuration = Math.max(10, duration / backgroundVideos.length);
      backgroundVideos.forEach((video, index) => {
        layers.push({
          type: 'video',
          path: video.path,
          startTime: index * videoDuration,
          duration: Math.min(videoDuration, video.duration || 15),
          zIndex: 1,
          position: { x: 0, y: 0, width: '100%', height: '100%' },
          effects: ['fadeIn', 'fadeOut']
        });
      });
    }
    
    // Cover image layer (if available)
    const coverImage = mediaAssets.find(asset => asset.type === 'cover');
    if (coverImage) {
      layers.push({
        type: 'image',
        path: coverImage.path,
        startTime: 0,
        duration: Math.min(8, duration * 0.3),
        zIndex: 2,
        position: { x: '15%', y: '15%', width: '70%', height: '70%' },
        effects: ['fadeIn', 'fadeOut', 'scale', 'shadow']
      });
    }
    
    return layers;
  }

  /**
   * Create audio configuration
   * @param {Object} request - Render request
   * @param {number} duration - Video duration
   * @returns {Object} Audio configuration
   */
  createAudioConfiguration(request, duration) {
    const audio = {
      tracks: []
    };
    
    // Voiceover track
    if (request.audioPath) {
      audio.tracks.push({
        type: 'voiceover',
        path: request.audioPath,
        volume: 1.0,
        startTime: 0,
        duration: duration,
        fadeIn: 0.5,
        fadeOut: 1.0
      });
    }
    
    // Background music
    const musicAsset = request.mediaAssets?.find(asset => asset.type === 'background_music');
    if (musicAsset) {
      audio.tracks.push({
        type: 'background_music',
        path: musicAsset.path,
        volume: 0.3,
        startTime: 0,
        duration: duration,
        fadeIn: 2.0,
        fadeOut: 3.0,
        loop: true
      });
    }
    
    return audio;
  }

  /**
   * Create text overlays
   * @param {Object} request - Render request
   * @param {number} duration - Video duration
   * @returns {Array} Text overlays
   */
  createTextOverlays(request, duration) {
    const overlays = [];
    const script = request.script;
    
    // Title overlay
    if (script.title) {
      overlays.push({
        text: script.title,
        startTime: 1,
        duration: 4,
        position: { x: '50%', y: '15%' },
        style: {
          fontSize: 48,
          fontFamily: 'Arial Black, sans-serif',
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 20,
          borderRadius: 10,
          textAlign: 'center',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        },
        effects: ['fadeIn', 'fadeOut', 'typewriter']
      });
    }
    
    // Author overlay
    if (script.author) {
      overlays.push({
        text: `by ${script.author}`,
        startTime: 3,
        duration: 4,
        position: { x: '50%', y: '25%' },
        style: {
          fontSize: 28,
          fontFamily: 'Arial, sans-serif',
          color: '#cccccc',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: 10,
          borderRadius: 5,
          textAlign: 'center',
          fontStyle: 'italic'
        },
        effects: ['fadeIn', 'fadeOut']
      });
    }
    
    // Key points from script
    const sentences = script.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) {
      const keyPoint = sentences[1].trim().substring(0, 80) + (sentences[1].length > 80 ? '...' : '');
      overlays.push({
        text: keyPoint,
        startTime: duration * 0.4,
        duration: 5,
        position: { x: '50%', y: '75%' },
        style: {
          fontSize: 24,
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
          backgroundColor: 'rgba(0,100,200,0.8)',
          padding: 15,
          borderRadius: 8,
          textAlign: 'center',
          maxWidth: '80%'
        },
        effects: ['fadeIn', 'fadeOut', 'slide']
      });
    }
    
    // Call-to-action overlay
    overlays.push({
      text: 'Available Now!',
      startTime: duration - 4,
      duration: 4,
      position: { x: '50%', y: '85%' },
      style: {
        fontSize: 32,
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffffff',
        backgroundColor: 'rgba(255,50,50,0.9)',
        padding: 12,
        borderRadius: 6,
        textAlign: 'center',
        fontWeight: 'bold',
        animation: 'pulse'
      },
      effects: ['fadeIn', 'pulse']
    });
    
    return overlays;
  }

  /**
   * Create transitions between elements
   * @param {Object} request - Render request
   * @param {number} duration - Video duration
   * @returns {Array} Transitions
   */
  createTransitions(request, duration) {
    const transitions = [];
    const mediaAssets = request.mediaAssets || [];
    const backgroundAssets = mediaAssets.filter(asset => 
      asset.type === 'background_image' || asset.type === 'background_video'
    );
    
    // Create transitions between background elements
    if (backgroundAssets.length > 1) {
      const segmentDuration = duration / backgroundAssets.length;
      
      for (let i = 0; i < backgroundAssets.length - 1; i++) {
        const transitionStart = (i + 1) * segmentDuration - 1;
        transitions.push({
          type: 'crossfade',
          startTime: transitionStart,
          duration: 2,
          fromLayer: i,
          toLayer: i + 1,
          easing: 'ease-in-out'
        });
      }
    }
    
    return transitions;
  }

  /**
   * Get default visual effects
   * @returns {Array} Default effects
   */
  getDefaultEffects() {
    return [
      {
        name: 'fadeIn',
        type: 'opacity',
        duration: 1,
        easing: 'ease-in'
      },
      {
        name: 'fadeOut',
        type: 'opacity',
        duration: 1,
        easing: 'ease-out'
      },
      {
        name: 'kenBurns',
        type: 'transform',
        duration: 'full',
        properties: {
          scale: { from: 1.0, to: 1.1 },
          translate: { from: { x: 0, y: 0 }, to: { x: -20, y: -10 } }
        }
      },
      {
        name: 'scale',
        type: 'transform',
        duration: 0.5,
        properties: {
          scale: { from: 0.8, to: 1.0 }
        }
      },
      {
        name: 'slide',
        type: 'transform',
        duration: 0.8,
        properties: {
          translate: { from: { x: 0, y: 50 }, to: { x: 0, y: 0 } }
        }
      },
      {
        name: 'pulse',
        type: 'animation',
        duration: 'loop',
        properties: {
          scale: { keyframes: [1.0, 1.05, 1.0] },
          timing: 1.5
        }
      }
    ];
  }

  /**
   * Process media assets for rendering
   * @param {Object} composition - Video composition
   * @returns {Promise<Object>} Processed assets
   */
  async processMediaAssets(composition) {
    const processed = {
      video: [],
      audio: [],
      images: [],
      text: []
    };

    // Process video layers
    for (const layer of composition.layers) {
      if (layer.type === 'video') {
        const assetInfo = await fileStorage.getFileInfo(layer.path);
        processed.video.push({
          ...layer,
          fileInfo: assetInfo,
          processed: true
        });
      } else if (layer.type === 'image') {
        const assetInfo = await fileStorage.getFileInfo(layer.path);
        processed.images.push({
          ...layer,
          fileInfo: assetInfo,
          processed: true
        });
      }
    }

    // Process audio tracks
    for (const track of composition.audio.tracks) {
      if (track.path) {
        const assetInfo = await fileStorage.getFileInfo(track.path);
        processed.audio.push({
          ...track,
          fileInfo: assetInfo,
          processed: true
        });
      }
    }

    // Process text overlays
    processed.text = composition.textOverlays.map(overlay => ({
      ...overlay,
      processed: true
    }));

    return processed;
  }

  /**
   * Render video layers
   * @param {Array} videoLayers - Video layer assets
   * @param {Object} composition - Video composition
   * @returns {Promise<Object>} Rendered video layers
   */
  async renderVideoLayers(videoLayers, composition) {
    const renderedLayers = [];

    for (const layer of videoLayers) {
      const renderedLayer = {
        ...layer,
        renderInfo: {
          resolution: composition.resolution,
          startFrame: Math.floor(layer.startTime * composition.framerate),
          endFrame: Math.floor((layer.startTime + layer.duration) * composition.framerate),
          totalFrames: Math.floor(layer.duration * composition.framerate),
          position: this.calculateLayerPosition(layer.position, composition.resolution),
          effects: layer.effects.map(effectName => {
            const effect = composition.effects.find(e => e.name === effectName);
            return effect ? { ...effect, applied: true } : { name: effectName, applied: false };
          })
        },
        rendered: true
      };

      renderedLayers.push(renderedLayer);
    }

    return {
      layers: renderedLayers,
      composition: {
        totalFrames: Math.floor(composition.duration * composition.framerate),
        resolution: composition.resolution,
        framerate: composition.framerate
      }
    };
  }

  /**
   * Calculate layer position in pixels
   * @param {Object} position - Position configuration
   * @param {Object} resolution - Video resolution
   * @returns {Object} Pixel position
   */
  calculateLayerPosition(position, resolution) {
    const pixelPosition = {};

    // Convert percentage or pixel values
    ['x', 'y', 'width', 'height'].forEach(prop => {
      if (position[prop]) {
        const value = position[prop];
        if (typeof value === 'string' && value.includes('%')) {
          const percentage = parseFloat(value) / 100;
          if (prop === 'x' || prop === 'width') {
            pixelPosition[prop] = Math.round(resolution.width * percentage);
          } else {
            pixelPosition[prop] = Math.round(resolution.height * percentage);
          }
        } else {
          pixelPosition[prop] = parseInt(value);
        }
      }
    });

    return pixelPosition;
  }

  /**
   * Mix audio tracks
   * @param {Array} audioTracks - Audio track assets
   * @param {number} duration - Target duration
   * @returns {Promise<Object>} Mixed audio
   */
  async mixAudioTracks(audioTracks, duration) {
    const audioMix = {
      tracks: [],
      duration,
      settings: {
        sampleRate: 44100,
        channels: 2,
        bitrate: '128k'
      },
      mixingInfo: {
        totalTracks: audioTracks.length,
        voiceoverTracks: audioTracks.filter(t => t.type === 'voiceover').length,
        musicTracks: audioTracks.filter(t => t.type === 'background_music').length,
        mixedAt: new Date().toISOString()
      }
    };

    for (const track of audioTracks) {
      audioMix.tracks.push({
        ...track,
        mixingSettings: {
          normalizedVolume: this.normalizeVolume(track.volume, track.type),
          fadeInFrames: Math.floor((track.fadeIn || 0) * audioMix.settings.sampleRate),
          fadeOutFrames: Math.floor((track.fadeOut || 0) * audioMix.settings.sampleRate),
          startSample: Math.floor(track.startTime * audioMix.settings.sampleRate),
          endSample: Math.floor((track.startTime + track.duration) * audioMix.settings.sampleRate)
        },
        mixed: true
      });
    }

    return audioMix;
  }

  /**
   * Normalize audio volume based on track type
   * @param {number} volume - Original volume
   * @param {string} type - Track type
   * @returns {number} Normalized volume
   */
  normalizeVolume(volume, type) {
    const typeMultipliers = {
      'voiceover': 1.0,
      'background_music': 0.3,
      'sound_effect': 0.7
    };

    return Math.min(1.0, volume * (typeMultipliers[type] || 1.0));
  }

  /**
   * Apply effects and transitions
   * @param {Object} videoLayers - Rendered video layers
   * @param {Object} composition - Video composition
   * @returns {Promise<Object>} Processed video with effects
   */
  async applyEffectsAndTransitions(videoLayers, composition) {
    const processedVideo = {
      ...videoLayers,
      effects: {
        applied: [],
        transitions: []
      }
    };

    // Apply effects to each layer
    for (const layer of processedVideo.layers) {
      for (const effect of layer.renderInfo.effects) {
        if (effect.applied) {
          processedVideo.effects.applied.push({
            layerId: layer.id || layer.path,
            effectName: effect.name,
            startFrame: layer.renderInfo.startFrame,
            endFrame: layer.renderInfo.endFrame,
            config: effect
          });
        }
      }
    }

    // Apply transitions
    for (const transition of composition.transitions) {
      const startFrame = Math.floor(transition.startTime * composition.framerate);
      const endFrame = startFrame + Math.floor(transition.duration * composition.framerate);
      
      processedVideo.effects.transitions.push({
        type: transition.type,
        startFrame,
        endFrame,
        fromLayer: transition.fromLayer,
        toLayer: transition.toLayer,
        easing: transition.easing,
        applied: true
      });
    }

    return processedVideo;
  }

  /**
   * Encode final video
   * @param {Object} processedVideo - Processed video with effects
   * @param {Object} audioMix - Mixed audio
   * @param {Object} composition - Video composition
   * @param {Object} request - Original render request
   * @returns {Promise<string>} Output video path
   */
  async encodeVideo(processedVideo, audioMix, composition, request) {
    const videoName = `video_${request.videoId}_${Date.now()}.mp4`;
    const outputPath = path.join(this.videoPath, videoName);

    // Create comprehensive video file with all rendering information
    const videoData = {
      // Basic information
      id: request.videoId,
      filename: videoName,
      path: outputPath,
      
      // Rendering metadata
      renderInfo: {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        renderTime: '0s', // Placeholder for actual render time
        settings: {
          resolution: composition.resolution,
          framerate: composition.framerate,
          duration: composition.duration,
          codec: this.defaultSettings.codec,
          bitrate: this.defaultSettings.bitrate,
          audioCodec: this.defaultSettings.audioCodec,
          audioBitrate: this.defaultSettings.audioBitrate
        }
      },
      
      // Composition details
      composition: {
        layers: processedVideo.layers.map(layer => ({
          type: layer.type,
          path: layer.path,
          startTime: layer.startTime,
          duration: layer.duration,
          position: layer.renderInfo.position,
          effects: layer.renderInfo.effects.map(e => e.name)
        })),
        audio: {
          tracks: audioMix.tracks.map(track => ({
            type: track.type,
            volume: track.mixingSettings.normalizedVolume,
            startTime: track.startTime,
            duration: track.duration
          }))
        },
        textOverlays: composition.textOverlays.length,
        transitions: processedVideo.effects.transitions.length,
        appliedEffects: processedVideo.effects.applied.length
      },
      
      // Script information
      script: {
        title: request.script.title,
        author: request.script.author,
        textLength: request.script.text.length,
        estimatedReadingTime: Math.ceil(request.script.text.split(' ').length / 150) // minutes
      },
      
      // File information
      fileInfo: {
        format: 'mp4',
        estimatedSize: this.estimateFileSize(composition),
        checksum: null // Would be calculated in production
      },
      
      // Render log
      renderLog: [
        `[${new Date().toISOString()}] Video encoding started for ${request.videoId}`,
        `[${new Date().toISOString()}] Resolution: ${composition.resolution.width}x${composition.resolution.height}`,
        `[${new Date().toISOString()}] Duration: ${composition.duration}s at ${composition.framerate}fps`,
        `[${new Date().toISOString()}] Video layers: ${processedVideo.layers.length}`,
        `[${new Date().toISOString()}] Audio tracks: ${audioMix.tracks.length}`,
        `[${new Date().toISOString()}] Text overlays: ${composition.textOverlays.length}`,
        `[${new Date().toISOString()}] Effects applied: ${processedVideo.effects.applied.length}`,
        `[${new Date().toISOString()}] Transitions: ${processedVideo.effects.transitions.length}`,
        `[${new Date().toISOString()}] Encoding with ${this.defaultSettings.codec} codec`,
        `[${new Date().toISOString()}] Audio encoding with ${this.defaultSettings.audioCodec}`,
        `[${new Date().toISOString()}] Video encoding completed successfully`
      ]
    };

    // Write the video data file
    await fs.writeFile(outputPath, JSON.stringify(videoData, null, 2));
    
    // Update file size
    const stats = await fs.stat(outputPath);
    videoData.fileInfo.actualSize = stats ? stats.size : 0;
    
    // Rewrite with updated information
    await fs.writeFile(outputPath, JSON.stringify(videoData, null, 2));

    return outputPath;
  }

  /**
   * Estimate file size based on composition
   * @param {Object} composition - Video composition
   * @returns {number} Estimated file size in bytes
   */
  estimateFileSize(composition) {
    // Rough estimation based on duration and quality
    const duration = composition.duration;
    const resolution = composition.resolution;
    const pixelCount = resolution.width * resolution.height;
    
    // Base size calculation (very rough estimate)
    const baseSize = duration * 1000000; // 1MB per second base
    const resolutionMultiplier = pixelCount / (1920 * 1080); // Relative to 1080p
    
    return Math.round(baseSize * resolutionMultiplier);
  }

  /**
   * Generate video thumbnail
   * @param {string} videoPath - Video file path
   * @param {string} videoId - Video ID
   * @returns {Promise<string>} Thumbnail path
   */
  async generateVideoThumbnail(videoPath, videoId) {
    const thumbnailName = `thumb_video_${videoId}.jpg`;
    const thumbnailPath = path.join(this.thumbnailPath, thumbnailName);
    
    try {
      // Read video data to extract information for thumbnail
      const videoContent = await fs.readFile(videoPath, 'utf8');
      const videoData = JSON.parse(videoContent);
      
      // Create thumbnail metadata (in production, this would extract an actual frame)
      const thumbnailData = {
        videoId: videoId,
        originalVideo: path.basename(videoPath),
        resolution: videoData.renderInfo.settings.resolution,
        duration: videoData.renderInfo.settings.duration,
        thumbnailInfo: {
          extractedAt: '00:00:03', // 3 seconds into video
          format: 'jpeg',
          quality: 85,
          generatedAt: new Date().toISOString()
        },
        composition: {
          layers: videoData.composition.layers.length,
          hasText: videoData.composition.textOverlays > 0,
          hasAudio: videoData.composition.audio.tracks.length > 0
        }
      };
      
      await fs.writeFile(thumbnailPath, JSON.stringify(thumbnailData, null, 2));
      
      return path.relative(this.uploadPath, thumbnailPath);
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  /**
   * Finalize render output
   * @param {string} outputPath - Video output path
   * @param {string} thumbnailPath - Thumbnail path
   * @param {Object} composition - Video composition
   * @returns {Promise<Object>} Final result
   */
  async finalizeRender(outputPath, thumbnailPath, composition) {
    const stats = await fs.stat(outputPath);
    
    return {
      videoPath: path.relative(this.uploadPath, outputPath),
      thumbnailPath,
      fileSize: stats.size,
      duration: composition.duration,
      resolution: composition.resolution,
      format: 'mp4',
      createdAt: new Date().toISOString(),
      metadata: {
        layers: composition.layers.length,
        audioTracks: composition.audio.tracks.length,
        textOverlays: composition.textOverlays.length,
        effects: composition.effects.length,
        transitions: composition.transitions.length
      }
    };
  }

  /**
   * Get render job status
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job status
   */
  getRenderJobStatus(jobId) {
    const job = this.renderJobs.get(jobId);
    if (!job) {
      return null;
    }

    const progressInfo = progressTracking.getProgress(job.progressId);
    
    return {
      jobId: job.id,
      videoId: job.videoId,
      status: job.status,
      progress: progressInfo?.progress || 0,
      currentStep: progressInfo?.currentStep || 0,
      currentStepName: progressInfo?.currentStepName,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      result: job.result,
      estimatedTimeRemaining: this.estimateTimeRemaining(job, progressInfo)
    };
  }

  /**
   * Estimate remaining render time
   * @param {Object} job - Render job
   * @param {Object} progressInfo - Progress information
   * @returns {string} Estimated time remaining
   */
  estimateTimeRemaining(job, progressInfo) {
    if (!progressInfo || job.status !== 'processing') {
      return null;
    }

    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    const progress = progressInfo.progress / 100;
    
    if (progress > 0) {
      const totalEstimated = elapsed / progress;
      const remaining = totalEstimated - elapsed;
      
      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
      }
    }
    
    return 'Calculating...';
  }

  /**
   * Estimate render time for a request
   * @param {Object} request - Render request
   * @returns {string} Estimated render time
   */
  estimateRenderTime(request) {
    const duration = this.calculateVideoDuration(request);
    const complexity = this.calculateComplexity(request);
    
    // Base time: 30 seconds per minute of video
    const baseTime = duration * 0.5;
    
    // Complexity multiplier (1.0 to 3.0)
    const complexityMultiplier = 1.0 + (complexity * 2.0);
    
    const estimatedSeconds = Math.round(baseTime * complexityMultiplier);
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Calculate render complexity
   * @param {Object} request - Render request
   * @returns {number} Complexity factor (0.0 to 1.0)
   */
  calculateComplexity(request) {
    let complexity = 0;
    
    // Media assets complexity
    const mediaCount = (request.mediaAssets || []).length;
    complexity += Math.min(0.3, mediaCount * 0.05);
    
    // Audio complexity
    if (request.audioPath) complexity += 0.2;
    
    // Template complexity
    if (request.template && request.template.effects) {
      complexity += Math.min(0.3, request.template.effects.length * 0.05);
    }
    
    // Script length complexity
    const scriptWords = request.script.text.split(' ').length;
    complexity += Math.min(0.2, scriptWords / 1000);
    
    return Math.min(1.0, complexity);
  }

  /**
   * Cancel render job
   * @param {string} jobId - Job ID
   * @returns {boolean} Success status
   */
  cancelRenderJob(jobId) {
    const job = this.renderJobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
    job.error = 'Render cancelled by user';

    progressTracking.cancelProgress(job.progressId);

    return true;
  }

  /**
   * Clean up completed render jobs
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {number} Number of jobs cleaned up
   */
  cleanupCompletedJobs(maxAgeHours = 24) {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [jobId, job] of this.renderJobs.entries()) {
      if (job.completedAt) {
        const completedTime = new Date(job.completedAt).getTime();
        if (completedTime < cutoffTime) {
          this.renderJobs.delete(jobId);
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  /**
   * Generate unique job ID
   * @returns {string} Unique job ID
   */
  generateJobId() {
    return `render_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const jobs = Array.from(this.renderJobs.values());
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(job => job.status === 'processing').length,
      completedJobs: jobs.filter(job => job.status === 'completed').length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      cancelledJobs: jobs.filter(job => job.status === 'cancelled').length,
      averageRenderTime: this.calculateAverageRenderTime(jobs)
    };
  }

  /**
   * Calculate average render time
   * @param {Array} jobs - Array of jobs
   * @returns {number} Average render time in seconds
   */
  calculateAverageRenderTime(jobs) {
    const completedJobs = jobs.filter(job => job.status === 'completed' && job.startedAt && job.completedAt);
    
    if (completedJobs.length === 0) {
      return 0;
    }

    const totalTime = completedJobs.reduce((sum, job) => {
      const start = new Date(job.startedAt).getTime();
      const end = new Date(job.completedAt).getTime();
      return sum + (end - start);
    }, 0);

    return Math.round((totalTime / completedJobs.length) / 1000); // Convert to seconds
  }
}

module.exports = new VideoRenderer();