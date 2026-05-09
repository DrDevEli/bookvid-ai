/**
 * Video Generation Workflow Service
 * Orchestrates the complete video generation process from book content to final video
 */

const scriptGenerationService = require('./scriptGeneration');
const voiceSynthesisService = require('./voiceSynthesis');
const mediaProcessingService = require('./mediaProcessing');
const mediaSelectionService = require('./mediaSelection');
const progressTrackingService = require('./progressTracking');
const shotstackService = require('./shotstackService');
const TemplateRepository = require('../models/Template');
const BookRepository = require('../models/Book');
const VideoRepository = require('../models/Video');
const { requireApiKey, checkServiceAvailability } = require('../utils/apiKeyValidation');
const Shotstack = require('shotstack-sdk');

class VideoGenerationWorkflow {
  constructor() {
    this.templateRepo = new TemplateRepository();
    this.bookRepo = new BookRepository();
    this.videoRepo = new VideoRepository();
    
    // Workflow status tracking
    this.activeWorkflows = new Map();
  }

  /**
   * Start complete video generation workflow
   * @param {Object} params - Workflow parameters
   * @param {string} params.bookId - Book ID
   * @param {string} params.userId - User ID
   * @param {string} params.templateId - Template ID (optional)
   * @param {Object} params.options - Generation options
   * @returns {Promise<Object>} Workflow result
   */
  async startVideoGeneration(params) {
    // Validate inputs synchronously before starting workflow
    await this.validateWorkflowInputs(params);
    
    const workflowId = this.generateWorkflowId();
    
    const steps = [
      'Loading book and template data',
      'Generating video script',
      'Creating voiceover',
      'Processing media assets',
      'Rendering video',
      'Finalizing'
    ];

    // Initialize progress tracking
    const progressInfo = progressTrackingService.initializeProgress(workflowId, {
      steps,
      totalSteps: steps.length,
      metadata: {
        userId: params.userId,
        bookId: params.bookId,
        type: 'video-generation'
      }
    });

    const workflow = {
      id: workflowId,
      bookId: params.bookId,
      userId: params.userId,
      templateId: params.templateId,
      status: 'starting',
      progress: 0,
      steps,
      currentStep: 0,
      startedAt: new Date().toISOString(),
      error: null,
      results: {}
    };

    this.activeWorkflows.set(workflowId, workflow);

    try {
      // Start workflow asynchronously
      this.executeWorkflow(workflow, params).catch(error => {
        console.error('Workflow execution error:', error);
        workflow.status = 'failed';
        workflow.error = error.message;
        workflow.completedAt = new Date().toISOString();
        
        // Update progress tracking
        progressTrackingService.failProgress(workflowId, error);
      });

      return {
        workflowId,
        status: workflow.status,
        progress: workflow.progress,
        estimatedDuration: '2-5 minutes'
      };
    } catch (error) {
      this.activeWorkflows.delete(workflowId);
      progressTrackingService.failProgress(workflowId, error);
      throw error;
    }
  }

  /**
   * Execute the complete workflow
   * @param {Object} workflow - Workflow object
   * @param {Object} params - Parameters
   */
  async executeWorkflow(workflow, params) {
    const stepUpdater = progressTrackingService.createStepUpdater(workflow.id, workflow.steps.length);
    
    try {
      // Step 0: Load book and template data
      stepUpdater(0, 'Loading book and template data');
      const { book, template } = await this.loadWorkflowData(params);
      workflow.results.book = book;
      workflow.results.template = template;

      // Step 1: Generate video script
      stepUpdater(1, 'Generating video script');
      const script = await this.generateVideoScript(book, params.options);
      workflow.results.script = script;

      // Step 2: Create voiceover
      stepUpdater(2, 'Creating voiceover');
      const voiceover = await this.generateVoiceover(script, params.options);
      workflow.results.voiceover = voiceover;

      // Step 3: Process media assets
      stepUpdater(3, 'Processing media assets');
      const mediaAssets = await this.processMediaAssets(book, template, script);
      workflow.results.mediaAssets = mediaAssets;

      // Step 4: Render video
      stepUpdater(4, 'Rendering video');
      const video = await this.renderVideo({
        book,
        script,
        voiceover,
        mediaAssets,
        template,
        userId: params.userId
      });
      workflow.results.video = video;

      // Step 5: Finalize
      stepUpdater(5, 'Finalizing');
      await this.finalizeWorkflow(workflow, video);

      workflow.status = 'completed';
      workflow.completedAt = new Date().toISOString();
      
      // Complete progress tracking
      progressTrackingService.completeProgress(workflow.id, {
        videoId: video.id,
        videoPath: video.video_path
      });

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error.message;
      workflow.completedAt = new Date().toISOString();
      
      // Update progress tracking
      progressTrackingService.failProgress(workflow.id, error);
      throw error;
    }
  }

  /**
   * Validate workflow inputs
   * @param {Object} params - Parameters to validate
   */
  async validateWorkflowInputs(params) {
    // Check required parameters
    if (!params.bookId) {
      throw new Error('Book ID is required');
    }

    if (!params.userId) {
      throw new Error('User ID is required');
    }

    // Check service availability
    const openaiStatus = checkServiceAvailability('openai');
    if (!openaiStatus.available) {
      throw new Error(`OpenAI service not available: ${openaiStatus.error}`);
    }

    const voiceServiceStatus = checkServiceAvailability('resemble');
    if (!voiceServiceStatus.available) {
      throw new Error(`Resemble service not available: ${voiceServiceStatus.error}`);
    }

    const shotstackStatus = checkServiceAvailability('shotstack');
    if (!shotstackStatus.available) {
      throw new Error(`Shotstack service not available: ${shotstackStatus.error}`);
    }

    // Verify book exists and belongs to user
    const book = this.bookRepo.findById(params.bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    if (book.user_id !== params.userId) {
      throw new Error('Access denied to book');
    }

    // Verify template if specified
    if (params.templateId) {
      const template = this.templateRepo.findById(params.templateId);
      if (!template) {
        throw new Error('Template not found');
      }
    }
  }

  /**
   * Load book and template data
   * @param {Object} params - Parameters
   * @returns {Promise<Object>} Book and template data
   */
  async loadWorkflowData(params) {
    const book = this.bookRepo.findById(params.bookId);
    
    let template = null;
    if (params.templateId) {
      template = this.templateRepo.getTemplateWithConfig(params.templateId);
    } else {
      // Auto-select template based on book genre
      const templates = this.templateRepo.getTemplatesForGenre(book.genre || 'general', { limit: 1 });
      template = templates[0] || this.getDefaultTemplate();
    }

    return { book, template };
  }

  /**
   * Generate video script from book data
   * @param {Object} book - Book data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated script
   */
  async generateVideoScript(book, options = {}) {
    const scriptOptions = {
      duration: options.duration || 60,
      tone: options.tone || 'engaging',
      ...options.scriptOptions
    };

    const bookData = {
      id: book.id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      description: book.description,
      content: book.content
    };

    return await scriptGenerationService.generateScript(bookData, scriptOptions);
  }

  /**
   * Generate voiceover from script
   * @param {Object} script - Script data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated voiceover
   */
  async generateVoiceover(script, options = {}) {
    console.log('🔍 Workflow: Starting voice generation...');
    console.log('🔍 Workflow: Resemble API configured:', !!process.env.RESEMBLE_API_KEY);
    
    const voiceOptions = {
      voiceId: options.voiceId,
      stability: options.stability || 0.5,
      similarityBoost: options.similarityBoost || 0.5,
      ...options.voiceOptions
    };

    const scriptData = {
      id: script.id,
      text: script.mainContent
    };

    console.log('🔍 Workflow: Calling voiceSynthesisService.generateVoiceover...');
    return await voiceSynthesisService.generateVoiceover(scriptData, voiceOptions);
  }

  /**
   * Process media assets for video
   * @param {Object} book - Book data
   * @param {Object} template - Template data
   * @param {Object} script - Script data
   * @returns {Promise<Object>} Processed media assets
   */
  async processMediaAssets(book, template, script) {
    // Use media selection service to intelligently select assets
    return await mediaSelectionService.selectMediaAssets(book, template, script);
  }

  /**
   * Render final video using Shotstack
   * @param {Object} components - All video components
   * @returns {Promise<Object>} Rendered video information
   */
  async renderVideo(components) {
    const { book, script, voiceover, mediaAssets, template, userId } = components;

    // Check Shotstack availability
    const shotstackStatus = checkServiceAvailability('shotstack');
    if (!shotstackStatus.available) {
      throw new Error(`Shotstack service not available: ${shotstackStatus.error}`);
    }

    // Create video record
    const videoData = {
      user_id: userId,
      book_id: book.id,
      title: script.title,
      script: script.mainContent,
      template_id: template ? template.id : null,
      status: 'generating'
    };

    const video = this.videoRepo.createVideo(videoData);

    console.log('🎬 [Workflow] Starting Shotstack video render...');
    console.log(`📹 [Workflow] Video ID: ${video.id}`);

    try {
      // Convert local paths to full URLs
      const apiUrl = process.env.API_URL || 'http://localhost:3000';
      
      // Validate that API_URL is publicly accessible (Shotstack requirement)
      this.validatePublicUrl(apiUrl);
      
      const audioUrl = this.getAssetUrl(voiceover.relativePath || voiceover.filePath, apiUrl);
      const audioDuration = voiceover.duration || voiceover.synthDuration || 60;

      // Build Shotstack timeline
      const timelineData = this.buildShotstackTimeline({
        audioUrl,
        audioDuration,
        mediaAssets,
        script,
        book,
        template,
        apiUrl
      });

      // Debug: Log timeline structure
      console.log(`📊 [Workflow] Timeline structure:`, {
        hasSoundtrack: !!timelineData.soundtrack,
        tracksCount: timelineData.tracks?.length || 0,
        tracksWithClips: timelineData.tracks?.map(t => t.clips?.length || 0) || []
      });

      // Ensure tracks property exists and is an array
      if (!timelineData.tracks) {
        timelineData.tracks = [];
      }
      
      // Ensure we have at least one track
      if (!Array.isArray(timelineData.tracks) || timelineData.tracks.length === 0) {
        throw new Error('Timeline must have at least one track');
      }

      // Log full timeline structure for debugging
      console.log(`📊 [Workflow] Full timeline data:`, JSON.stringify(timelineData, null, 2));
      console.log(`📊 [Workflow] Tracks count: ${timelineData.tracks.length}`);

      // Create output settings
      const output = new Shotstack.Output({
        format: 'mp4',
        resolution: '1080',
        fps: 30,
        quality: 'high'
      });

      // Create Edit object - pass timeline as plain object (not Timeline instance)
      // This matches the pattern used in shotstackService.createSimpleEdit
      const edit = new Shotstack.Edit(timelineData, output);

      // Submit render to Shotstack
      console.log('📤 [Workflow] Submitting render to Shotstack...');
      const renderResponse = await shotstackService.renderVideo(edit);
      
      console.log(`✅ [Workflow] Render submitted: ${renderResponse.renderId}`);
      
      // Update video record - render is in progress (keep as 'generating' since schema doesn't have 'rendering')
      this.videoRepo.update(video.id, {
        status: 'generating'
      });

      // Wait for render to complete (async, don't block)
      this.waitForShotstackRender(video.id, renderResponse.renderId).catch(error => {
        console.error(`❌ [Workflow] Render failed for video ${video.id}:`, error);
        // Update status to failed (error details are logged)
        this.videoRepo.update(video.id, {
          status: 'failed'
        });
      });

      return {
        ...video,
        shotstackRenderId: renderResponse.renderId,
        shotstackStatusUrl: renderResponse.statusUrl,
        processingStatus: 'generating',
        estimatedDuration: '30-60 seconds'
      };
    } catch (error) {
      console.error('❌ [Workflow] Video render failed:', error);
      // Update status to failed (error details are logged)
      this.videoRepo.update(video.id, {
        status: 'failed'
      });
      throw error;
    }
  }

  /**
   * Build Shotstack timeline from media assets
   * @param {Object} params - Timeline parameters
   * @returns {Object} Shotstack timeline
   */
  buildShotstackTimeline(params) {
    const { audioUrl, audioDuration, mediaAssets, script, book, template, apiUrl } = params;
    
    const timeline = {
      soundtrack: {
        src: audioUrl,
        effect: 'fadeInFadeOut'
      },
      tracks: []
    };

    // Track for images/videos
    const mediaTrack = {
      clips: []
    };

    let currentTime = 0;

    // Add cover image at the start
    if (mediaAssets.coverImage) {
      const coverUrl = this.getAssetUrl(mediaAssets.coverImage.path, apiUrl);
      const coverDuration = Math.min(5, audioDuration * 0.1); // 5 seconds or 10% of audio
      
      mediaTrack.clips.push({
        asset: {
          type: 'image',
          src: coverUrl
        },
        start: currentTime,
        length: coverDuration,
        fit: 'cover',
        transition: {
          in: 'fade',
          out: 'fade'
        }
      });
      
      currentTime += coverDuration;
    }

    // Add background images
    if (mediaAssets.backgroundImages && mediaAssets.backgroundImages.length > 0) {
      const remainingTime = audioDuration - currentTime;
      const imagesPerSecond = 3; // Show each image for 3 seconds
      const totalImageTime = mediaAssets.backgroundImages.length * imagesPerSecond;
      const imageDuration = Math.min(imagesPerSecond, remainingTime / mediaAssets.backgroundImages.length);

      mediaAssets.backgroundImages.forEach((image, index) => {
        if (currentTime >= audioDuration) return; // Don't exceed audio duration
        
        const imageUrl = this.getAssetUrl(image.path, apiUrl);
        const clipDuration = Math.min(imageDuration, audioDuration - currentTime);
        
        mediaTrack.clips.push({
          asset: {
            type: 'image',
            src: imageUrl
          },
          start: currentTime,
          length: clipDuration,
          fit: 'cover',
          scale: 1.1,
          transition: {
            in: 'fade',
            out: 'fade'
          }
        });
        
        currentTime += clipDuration;
      });
    }

    // Add background videos
    if (mediaAssets.backgroundVideos && mediaAssets.backgroundVideos.length > 0) {
      mediaAssets.backgroundVideos.forEach((video) => {
        if (currentTime >= audioDuration) return;
        
        const videoUrl = this.getAssetUrl(video.path, apiUrl);
        const clipDuration = Math.min(video.duration || 15, audioDuration - currentTime);
        
        mediaTrack.clips.push({
          asset: {
            type: 'video',
            src: videoUrl
          },
          start: currentTime,
          length: clipDuration,
          fit: 'cover',
          transition: {
            in: 'fade',
            out: 'fade'
          }
        });
        
        currentTime += clipDuration;
      });
    }

    // Add media track if it has clips, otherwise add a default color background
    if (mediaTrack.clips.length > 0) {
      timeline.tracks.push(mediaTrack);
    } else {
      // Shotstack requires at least one track - add a solid color background
      timeline.tracks.push({
        clips: [{
          asset: {
            type: 'color',
            color: '#1a1a2e' // Dark blue-gray background
          },
          start: 0,
          length: audioDuration
        }]
      });
    }

    // Add text overlay track
    const textTrack = {
      clips: []
    };

    // Title overlay at the start
    if (script.title) {
      textTrack.clips.push({
        asset: {
          type: 'html',
          html: `<div style="text-align: center; padding: 20px;">
            <h1 style="color: white; font-size: 64px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); margin: 0;">
              ${this.escapeHtml(script.title)}
            </h1>
          </div>`,
          css: 'body { margin: 0; padding: 0; }'
        },
        start: 0,
        length: Math.min(5, audioDuration * 0.1),
        position: 'center',
        opacity: 1
      });
    }

    // Author overlay
    if (book.author) {
      textTrack.clips.push({
        asset: {
          type: 'html',
          html: `<div style="text-align: center; padding: 20px;">
            <p style="color: #cccccc; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); margin: 0;">
              by ${this.escapeHtml(book.author)}
            </p>
          </div>`,
          css: 'body { margin: 0; padding: 0; }'
        },
        start: 2,
        length: Math.min(4, audioDuration * 0.08),
        position: 'center',
        opacity: 1
      });
    }

    // Add text track if it has clips
    if (textTrack.clips.length > 0) {
      timeline.tracks.push(textTrack);
    }

    // Ensure timeline has at least one track (required by Shotstack)
    if (timeline.tracks.length === 0) {
      timeline.tracks.push({
        clips: [{
          asset: {
            type: 'color',
            color: '#1a1a2e'
          },
          start: 0,
          length: audioDuration
        }]
      });
    }

    return timeline;
  }

  /**
   * Validate that API URL is publicly accessible (required by Shotstack)
   * @param {string} apiUrl - API URL to validate
   * @throws {Error} If URL is not publicly accessible
   */
  validatePublicUrl(apiUrl) {
    if (!apiUrl) {
      throw new Error('API_URL environment variable is required for Shotstack video rendering');
    }

    try {
      // Check if URL is localhost or private IP
      const url = new URL(apiUrl);
      const hostname = url.hostname.toLowerCase();
      
      // Check for localhost variants and private IP ranges
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
      const isPrivateIP = hostname.startsWith('192.168.') || 
                         hostname.startsWith('10.') || 
                         hostname.startsWith('172.') ||
                         hostname === '0.0.0.0';
      
      if (isLocalhost || isPrivateIP) {
        throw new Error(
          `❌ Shotstack requires publicly accessible HTTPS URLs.\n` +
          `   Current API_URL: ${apiUrl}\n` +
          `   This URL is not accessible from Shotstack's servers.\n\n` +
          `   Solutions:\n` +
          `   1. For development: Use ngrok or similar tunnel service\n` +
          `      - Install: npm install -g ngrok\n` +
          `      - Run: ngrok http 3000\n` +
          `      - Set: API_URL=https://your-ngrok-url.ngrok.io\n\n` +
          `   2. For production: Set API_URL to your production domain\n` +
          `      - Example: API_URL=https://your-domain.com\n`
        );
      }

      // Check if URL uses HTTPS (required for production, recommended for development)
      if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
        throw new Error(
          `Shotstack requires HTTPS URLs in production. ` +
          `Current API_URL (${apiUrl}) uses HTTP. Please set API_URL to an HTTPS URL.`
        );
      }

      // Warn if using HTTP in development (but allow it if using a public domain)
      if (url.protocol !== 'https:' && process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  [Workflow] Warning: API_URL (${apiUrl}) uses HTTP. Shotstack may require HTTPS URLs. Consider using a tunnel service with HTTPS.`);
      }
    } catch (error) {
      // If it's our custom error, re-throw it
      if (error.message.includes('Shotstack requires')) {
        throw error;
      }
      // If URL parsing failed, throw a different error
      throw new Error(`Invalid API_URL format: ${apiUrl}. Please provide a valid URL (e.g., https://your-domain.com)`);
    }
  }

  /**
   * Convert local file path to full URL
   * @param {string} filePath - Local file path
   * @param {string} apiUrl - Base API URL
   * @returns {string} Full URL
   */
  getAssetUrl(filePath, apiUrl) {
    if (!filePath) return null;
    
    // If already a full URL, return as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Remove leading ./ or / from path
    const cleanPath = filePath.replace(/^\.?\//, '');
    
    // Build full URL
    return `${apiUrl}/uploads/${cleanPath}`;
  }

  /**
   * Escape HTML for text overlays
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Wait for Shotstack render to complete and update video record
   * @param {string} videoId - Video ID
   * @param {string} renderId - Shotstack render ID
   */
  async waitForShotstackRender(videoId, renderId) {
    console.log(`⏳ [Workflow] Waiting for render ${renderId} to complete...`);
    
    try {
      const result = await shotstackService.waitForRender(renderId, {
        maxWaitTime: 300000, // 5 minutes
        pollInterval: 5000    // Check every 5 seconds
      });

      console.log(`✅ [Workflow] Render completed for video ${videoId}`);
      console.log(`🎥 [Workflow] Video URL: ${result.url}`);

      // Update video record with final URL (only use existing columns)
      this.videoRepo.update(videoId, {
        status: 'completed',
        video_path: result.url,
        duration: result.data?.duration ? Math.round(result.data.duration) : null,
        updated_at: new Date().toISOString()
      });

      console.log(`✅ [Workflow] Video ${videoId} updated successfully`);
    } catch (error) {
      console.error(`❌ [Workflow] Failed to complete render for video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Prepare media assets for the video renderer
   * @param {Object} mediaAssets - Media assets from selection service
   * @returns {Array} Formatted media assets
   */
  prepareMediaAssetsForRenderer(mediaAssets) {
    const formattedAssets = [];

    // Cover image
    if (mediaAssets.coverImage) {
      formattedAssets.push({
        type: 'cover',
        path: mediaAssets.coverImage.path,
        usage: 'cover',
        timing: {
          start: 0,
          duration: 8
        }
      });
    }

    // Background images
    if (mediaAssets.backgroundImages && mediaAssets.backgroundImages.length > 0) {
      mediaAssets.backgroundImages.forEach((image, index) => {
        formattedAssets.push({
          type: 'background_image',
          path: image.path,
          usage: 'background',
          timing: {
            start: index * 10,
            duration: 12
          }
        });
      });
    }

    // Background videos
    if (mediaAssets.backgroundVideos && mediaAssets.backgroundVideos.length > 0) {
      mediaAssets.backgroundVideos.forEach((video, index) => {
        formattedAssets.push({
          type: 'background_video',
          path: video.path,
          usage: 'background',
          duration: video.duration || 15,
          timing: {
            start: index * 15,
            duration: video.duration || 15
          }
        });
      });
    }

    // Background music
    if (mediaAssets.musicTrack) {
      formattedAssets.push({
        type: 'background_music',
        path: mediaAssets.musicTrack.path,
        usage: 'background_music',
        volume: 0.3
      });
    }

    return formattedAssets;
  }

  /**
   * Finalize workflow
   * @param {Object} workflow - Workflow object
   * @param {Object} video - Video data
   */
  async finalizeWorkflow(workflow, video) {
    // Update video status
    this.videoRepo.update(video.id, {
      status: 'generating',
      updated_at: new Date().toISOString()
    });

    // Clean up temporary files if needed
    // This would be handled by the media processing service

    workflow.results.finalVideo = video;
  }

  /**
   * Get workflow status
   * @param {string} workflowId - Workflow ID
   * @returns {Object|null} Workflow status
   */
  getWorkflowStatus(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    return {
      id: workflow.id,
      status: workflow.status,
      progress: workflow.progress,
      currentStep: workflow.currentStep,
      totalSteps: workflow.steps.length,
      currentStepName: workflow.steps[workflow.currentStep],
      startedAt: workflow.startedAt,
      completedAt: workflow.completedAt,
      error: workflow.error,
      results: {
        scriptGenerated: !!workflow.results.script,
        voiceoverGenerated: !!workflow.results.voiceover,
        videoCreated: !!workflow.results.video,
        videoId: workflow.results.video?.id
      }
    };
  }

  /**
   * Cancel workflow
   * @param {string} workflowId - Workflow ID
   * @returns {boolean} Success status
   */
  cancelWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow || workflow.status === 'completed' || workflow.status === 'failed') {
      return false;
    }

    workflow.status = 'cancelled';
    workflow.completedAt = new Date().toISOString();
    workflow.error = 'Workflow cancelled by user';

    // Cancel any ongoing media processing jobs
    if (workflow.results.video?.jobId) {
      mediaProcessingService.cancelJob(workflow.results.video.jobId);
    }

    return true;
  }

  /**
   * Get default template
   * @returns {Object} Default template
   */
  getDefaultTemplate() {
    return {
      id: 'default',
      name: 'Default Template',
      description: 'Basic video template',
      category: 'general',
      config: {
        duration: 60,
        backgroundImages: [],
        backgroundVideos: [],
        musicTrack: null,
        textOverlays: [
          {
            text: '{book.title}',
            position: 'center',
            timing: { start: 0, duration: 5 },
            style: { fontSize: 48, color: '#ffffff' }
          },
          {
            text: 'by {book.author}',
            position: 'center-bottom',
            timing: { start: 2, duration: 5 },
            style: { fontSize: 24, color: '#cccccc' }
          }
        ]
      }
    };
  }

  /**
   * Generate unique workflow ID
   * @returns {string} Unique workflow ID
   */
  generateWorkflowId() {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up completed workflows
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {number} Number of workflows cleaned up
   */
  cleanupCompletedWorkflows(maxAgeHours = 24) {
    const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [workflowId, workflow] of this.activeWorkflows.entries()) {
      if (workflow.completedAt) {
        const completedTime = new Date(workflow.completedAt).getTime();
        if (completedTime < cutoffTime) {
          this.activeWorkflows.delete(workflowId);
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    const workflows = Array.from(this.activeWorkflows.values());
    
    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.status === 'starting' || w.status === 'processing').length,
      completedWorkflows: workflows.filter(w => w.status === 'completed').length,
      failedWorkflows: workflows.filter(w => w.status === 'failed').length,
      cancelledWorkflows: workflows.filter(w => w.status === 'cancelled').length,
      averageCompletionTime: this.calculateAverageCompletionTime(workflows)
    };
  }

  /**
   * Calculate average completion time for completed workflows
   * @param {Array} workflows - Array of workflows
   * @returns {number} Average completion time in minutes
   */
  calculateAverageCompletionTime(workflows) {
    const completed = workflows.filter(w => w.status === 'completed' && w.startedAt && w.completedAt);
    
    if (completed.length === 0) {
      return 0;
    }

    const totalTime = completed.reduce((sum, workflow) => {
      const start = new Date(workflow.startedAt).getTime();
      const end = new Date(workflow.completedAt).getTime();
      return sum + (end - start);
    }, 0);

    return Math.round((totalTime / completed.length) / (1000 * 60)); // Convert to minutes
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    const openaiStatus = checkServiceAvailability('openai');
    const voiceServiceStatus = checkServiceAvailability('resemble');
    const shotstackStatus = checkServiceAvailability('shotstack');
    
    return {
      available: openaiStatus.available && voiceServiceStatus.available && shotstackStatus.available,
      services: {
        openai: openaiStatus,
        resemble: voiceServiceStatus,
        shotstack: shotstackStatus
      },
      stats: this.getStats()
    };
  }
}

module.exports = new VideoGenerationWorkflow();