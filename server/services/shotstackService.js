/**
 * Shotstack Video Rendering Service
 * Wrapper for Shotstack SDK with logging, authentication, and retry logic
 */

const Shotstack = require('shotstack-sdk');
const { requireApiKey, ApiKeyError } = require('../utils/apiKeyValidation');

class ShotstackService {
  constructor() {
    this.client = null;
    this.apiKey = null;
    this.host = process.env.SHOTSTACK_HOST || 'https://api.shotstack.io/stage/v1';
    this.environment = process.env.SHOTSTACK_ENV || 'stage';
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
    this.initialized = false;
  }

  /**
   * Initialize Shotstack client
   * @private
   */
  _initialize() {
    if (this.initialized) return;

    try {
      this.apiKey = requireApiKey('shotstack');
      
      // Configure Shotstack SDK
      const defaultClient = Shotstack.ApiClient.instance;
      const DeveloperKey = defaultClient.authentications['DeveloperKey'];
      DeveloperKey.apiKey = this.apiKey;
      
      // Set the API host based on environment
      // Note: SDK automatically adds /v1, so we should not include it in basePath
      if (this.environment === 'production') {
        defaultClient.basePath = 'https://api.shotstack.io';
      } else {
        // Remove /v1 if present, SDK will add it
        const baseHost = this.host.replace(/\/v1$/, '');
        defaultClient.basePath = baseHost || 'https://api.shotstack.io/stage';
      }

      this.client = defaultClient;
      this.initialized = true;
      
      console.log(`✅ Shotstack SDK initialized (${this.environment} environment)`);
      console.log(`📍 API Host: ${defaultClient.basePath}`);
    } catch (error) {
      console.error('❌ Failed to initialize Shotstack:', error.message);
      throw error;
    }
  }

  /**
   * Render a video using Shotstack
   * @param {Object} edit - Shotstack edit configuration
   * @param {Object} options - Rendering options
   * @returns {Promise<Object>} Render response with render ID
   */
  async renderVideo(edit, options = {}) {
    this._initialize();

    const startTime = Date.now();
    console.log('🎬 [Shotstack] Starting video render...');
    
    try {
      const api = new Shotstack.EditApi();
      const response = await this._executeWithRetry(() => 
        api.postRender(edit)
      );

      const duration = Date.now() - startTime;
      console.log(`✅ [Shotstack] Render queued successfully in ${duration}ms`);
      console.log(`📊 [Shotstack] Render ID: ${response.response.id}`);
      console.log(`🔗 [Shotstack] Status URL: ${response.response.url}`);

      return {
        success: true,
        renderId: response.response.id,
        message: response.response.message,
        statusUrl: response.response.url,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [Shotstack] Render failed after ${duration}ms:`, error);
      
      if (error instanceof ApiKeyError) {
        throw error;
      }
      
      // Better error message extraction
      const errorMessage = error.message || 
                          error.response?.text || 
                          error.response?.body?.message ||
                          JSON.stringify(error);
      
      throw new Error(`Shotstack render failed: ${errorMessage}`);
    }
  }

  /**
   * Get render status
   * @param {string} renderId - Shotstack render ID
   * @returns {Promise<Object>} Render status information
   */
  async getRenderStatus(renderId) {
    this._initialize();

    console.log(`🔍 [Shotstack] Checking render status: ${renderId}`);
    
    try {
      const api = new Shotstack.EditApi();
      const response = await this._executeWithRetry(() => 
        api.getRender(renderId, { data: false, merged: true })
      );

      const status = response.response.status;
      const progress = response.response.data?.progress || 0;

      console.log(`📊 [Shotstack] Render ${renderId}: ${status} (${progress}%)`);

      return {
        success: true,
        renderId: response.response.id,
        status: status,
        progress: progress,
        url: response.response.url,
        error: response.response.error,
        data: response.response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ [Shotstack] Failed to get render status:`, error.message);
      
      if (error instanceof ApiKeyError) {
        throw error;
      }
      
      throw new Error(`Failed to get render status: ${error.message}`);
    }
  }

  /**
   * Wait for render to complete
   * @param {string} renderId - Shotstack render ID
   * @param {Object} options - Polling options
   * @returns {Promise<Object>} Final render result
   */
  async waitForRender(renderId, options = {}) {
    const maxWaitTime = options.maxWaitTime || 300000; // 5 minutes default
    const pollInterval = options.pollInterval || 5000; // 5 seconds default
    const startTime = Date.now();

    console.log(`⏳ [Shotstack] Waiting for render ${renderId} to complete...`);

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getRenderStatus(renderId);

      if (status.status === 'done') {
        const duration = Date.now() - startTime;
        console.log(`✅ [Shotstack] Render completed in ${Math.round(duration / 1000)}s`);
        console.log(`🎥 [Shotstack] Video URL: ${status.url}`);
        return status;
      }

      if (status.status === 'failed') {
        console.error(`❌ [Shotstack] Render failed:`, status.error);
        throw new Error(`Render failed: ${status.error}`);
      }

      // Still processing, wait before next poll
      console.log(`⏳ [Shotstack] Still processing... (${status.progress}%)`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Render timeout after ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Get available video sources (stock media)
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Available sources
   */
  async searchSources(searchParams) {
    this._initialize();

    console.log('🔍 [Shotstack] Searching for media sources...');
    
    try {
      const api = new Shotstack.SourcesApi();
      const response = await this._executeWithRetry(() => 
        api.getSources(searchParams)
      );

      console.log(`✅ [Shotstack] Found ${response.data?.length || 0} sources`);
      
      return {
        success: true,
        sources: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ [Shotstack] Source search failed:`, error.message);
      throw new Error(`Source search failed: ${error.message}`);
    }
  }

  /**
   * Execute function with retry logic
   * @private
   * @param {Function} fn - Function to execute
   * @param {number} attempt - Current attempt number
   * @returns {Promise<any>} Function result
   */
  async _executeWithRetry(fn, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry API key errors
      if (error instanceof ApiKeyError) {
        throw error;
      }

      // Don't retry if we've exceeded max retries
      if (attempt >= this.maxRetries) {
        console.error(`❌ [Shotstack] Max retries (${this.maxRetries}) exceeded`);
        throw error;
      }

      // Check if error is retryable
      const isRetryable = this._isRetryableError(error);
      if (!isRetryable) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️  [Shotstack] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      console.warn(`   Error: ${error.message}`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return this._executeWithRetry(fn, attempt + 1);
    }
  }

  /**
   * Check if error is retryable
   * @private
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  _isRetryableError(error) {
    // Retry on network errors
    if (error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('ENOTFOUND')) {
      return true;
    }

    // Retry on 5xx server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Retry on rate limiting (429)
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    try {
      const apiKey = requireApiKey('shotstack');
      return {
        available: true,
        environment: this.environment,
        host: this.host,
        apiKeyConfigured: !!apiKey,
        apiKeyMasked: apiKey ? `${apiKey.substring(0, 8)}...` : null,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay
      };
    } catch (error) {
      return {
        available: false,
        environment: this.environment,
        host: this.host,
        error: error.message,
        apiKeyConfigured: false
      };
    }
  }

  /**
   * Create a simple video edit configuration
   * Helper method for common use cases
   * @param {Object} config - Video configuration
   * @returns {Object} Shotstack Edit object
   */
  createSimpleEdit(config) {
    const {
      audioPath,
      images = [],
      text = [],
      duration = 30,
      resolution = '1080',
      fps = 25,
      format = 'mp4'
    } = config;

    const timeline = {
      soundtrack: audioPath ? {
        src: audioPath,
        effect: 'fadeInFadeOut'
      } : undefined,
      tracks: []
    };

    // Add image clips
    if (images.length > 0) {
      const imageTrack = {
        clips: images.map((img, index) => ({
          asset: {
            type: 'image',
            src: img.src
          },
          start: img.start || (index * (duration / images.length)),
          length: img.length || (duration / images.length),
          fit: img.fit || 'cover',
          scale: img.scale || 1,
          transition: img.transition || {
            in: 'fade',
            out: 'fade'
          }
        }))
      };
      timeline.tracks.push(imageTrack);
    }

    // Add text overlays
    if (text.length > 0) {
      const textTrack = {
        clips: text.map(txt => ({
          asset: {
            type: 'html',
            html: `<p>${txt.content}</p>`,
            css: txt.css || 'p { color: white; font-size: 32px; text-align: center; }'
          },
          start: txt.start || 0,
          length: txt.length || duration,
          position: txt.position || 'center'
        }))
      };
      timeline.tracks.push(textTrack);
    }

    const output = {
      format: format,
      resolution: resolution,
      fps: fps,
      quality: 'medium'
    };

    return new Shotstack.Edit(timeline, output);
  }
}

// Export singleton instance
module.exports = new ShotstackService();



