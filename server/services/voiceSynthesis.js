/**
 * Voice Synthesis Service
 * Uses Resemble AI API to generate voiceovers from text scripts
 */

const fs = require('fs').promises;
const path = require('path');
const { requireApiKey, ApiKeyError } = require('../utils/apiKeyValidation');

class VoiceSynthesisService {
  constructor() {
    this.baseUrl = 'https://app.resemble.ai/api/v2';
    this.synthesisUrl = 'https://f.cluster.resemble.ai/synthesize';
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.audioPath = path.join(this.uploadPath, 'audio');
    this.defaultProjectId = process.env.RESEMBLE_PROJECT_ID || null;
    this.defaultVoiceId = process.env.RESEMBLE_VOICE_ID || null;
  }

  /**
   * Initialize the service by creating necessary directories
   */
  async initialize() {
    try {
      await fs.mkdir(this.audioPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create audio directory:', error);
    }
  }

  /**
   * Fetch the default project UUID from environment or API
   * @returns {Promise<string>}
   */
  async getDefaultProjectId() {
    if (this.defaultProjectId) {
      return this.defaultProjectId;
    }

    const response = await this.callResemble('/projects', 'GET', null, {
      page: 1,
      page_size: 10
    });

    const items = response.items || response.data || response.projects || [];
    if (!items.length) {
      throw new Error('No projects available in your Resemble account');
    }

    const project = items[0];
    this.defaultProjectId = project.uuid || project.id;
    return this.defaultProjectId;
  }

  /**
   * Fetch the default voice UUID from environment or API
   * @param {string} projectId - Resemble project UUID
   * @returns {Promise<string>}
   */
  async getDefaultVoiceId(projectId) {
    if (this.defaultVoiceId) {
      return this.defaultVoiceId;
    }

    const voices = await this.getAvailableVoices(projectId);
    if (!voices.length) {
      throw new Error('No voices available in your Resemble project');
    }

    const firstVoice = projectId
      ? voices.find(voice => voice.projectId === projectId) || voices[0]
      : voices[0];

    if (!this.defaultProjectId && firstVoice.projectId) {
      this.defaultProjectId = firstVoice.projectId;
    }

    this.defaultVoiceId = firstVoice.id;
    return this.defaultVoiceId;
  }

  /**
   * Generate voiceover from text script using synchronous TTS
   * Automatically chunks long text if needed
   * @param {Object} scriptData - Script information
   * @param {string} scriptData.text - Text to synthesize
   * @param {string} scriptData.id - Script ID for file naming
   * @param {Object} options - Synthesis options
   * @param {string} [options.projectId] - Resemble project UUID
   * @param {string} [options.voiceId] - Resemble voice UUID
   * @param {number} [options.sampleRate] - Optional sample rate in Hz (8000, 16000, 22050, 32000, 44100, 48000)
   * @param {string} [options.outputFormat] - Output format: 'mp3' or 'wav' (default: 'mp3')
   * @param {string} [options.precision] - Bit depth for wav: 'MULAW', 'PCM_16', 'PCM_24', 'PCM_32' (default: 'PCM_32')
   * @returns {Promise<Object>} Generated audio file information
   */
  async generateVoiceover(scriptData, options = {}) {
    try {
      await this.initialize();

      const projectId = options.projectId || await this.getDefaultProjectId();
      const voiceId = options.voiceId || await this.getDefaultVoiceId(projectId);
      const sampleRate = options.sampleRate || 44100;
      const outputFormat = options.outputFormat || 'mp3';
      const precision = options.precision || 'PCM_32';

      // Clean the text: remove JSON formatting, markdown code fences, etc.
      let cleanText = scriptData.text;
      
      // Remove markdown code fences
      cleanText = cleanText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      
      // Try to parse as JSON and extract text content
      try {
        const parsed = JSON.parse(cleanText);
        // If it's a JSON object, extract the main content or relevant text fields
        if (typeof parsed === 'object') {
          cleanText = parsed.main_content || parsed.content || parsed.text || parsed.hook || JSON.stringify(parsed);
        }
      } catch (e) {
        // Not JSON, use as is
      }
      
      // Remove XML/SSML special characters that cause issues
      cleanText = cleanText
        .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, 'and')  // Replace & with 'and' unless it's a valid entity
        .replace(/<(?!\/?speak|break|phoneme|say-as)/g, '')  // Remove < unless it's SSML
        .replace(/>/g, '');  // Remove all >
      
      scriptData.text = cleanText.trim();

      // Resemble synchronous TTS has a 2000 character limit
      if (scriptData.text.length > 2000) {
        console.warn(`⚠️  Script exceeds 2000 characters (${scriptData.text.length} chars). Truncating to first 2000 characters.`);
        console.warn('   Consider implementing chunking or using async synthesis for longer scripts.');
        
        // Truncate to 2000 characters at a sentence boundary if possible
        let truncatedText = scriptData.text.substring(0, 2000);
        const lastPeriod = truncatedText.lastIndexOf('.');
        const lastExclamation = truncatedText.lastIndexOf('!');
        const lastQuestion = truncatedText.lastIndexOf('?');
        const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);
        
        if (lastSentence > 1700) { // Only trim if we find a sentence ending reasonably close
          truncatedText = scriptData.text.substring(0, lastSentence + 1);
        }
        
        scriptData.text = truncatedText;
        console.log(`✂️  Truncated to ${scriptData.text.length} characters`);
      }

      const response = await this.synthesizeAudio({
        projectId,
        voiceId,
        text: scriptData.text,
        title: scriptData.id,
        sampleRate,
        outputFormat,
        precision
      });

      const audioBuffer = Buffer.from(response.audio_content, 'base64');
      const audioFile = await this.saveAudioFile(audioBuffer, scriptData.id, outputFormat);

      return {
        id: this.generateAudioId(),
        scriptId: scriptData.id,
        filePath: audioFile.path,
        relativePath: audioFile.relativePath,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        duration: response.duration || null,
        synthDuration: response.synth_duration || null,
        voiceId,
        projectId,
        settings: {
          sampleRate: response.sample_rate || sampleRate,
          outputFormat: response.output_format || outputFormat,
          precision
        },
        generatedAt: new Date().toISOString(),
        text: scriptData.text.substring(0, 100) + '...',
        issues: response.issues || []
      };
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw error;
      }

      console.error('Voice synthesis error:', error);
      throw new Error(`Failed to generate voiceover: ${error.message}`);
    }
  }

  /**
   * Retrieve available voices for the configured project
   * @param {string} [projectId]
   * @returns {Promise<Array>}
   */
  async getAvailableVoices(projectId) {
    try {
      const response = await this.callResemble('/voices', 'GET', null, {
        page: 1,
        page_size: 100,
        advanced: false
      });

      if (!response) {
        console.warn('Empty response from Resemble voices API');
        return [];
      }

      const items = response.items || response.data || response.voices || [];
      
      if (!Array.isArray(items)) {
        console.warn('Unexpected response format from Resemble voices API:', response);
        return [];
      }

      const resolvedProjectId = projectId || this.defaultProjectId;

      return items
        .filter(voice => {
          // Ensure voice object exists
          if (!voice || typeof voice !== 'object') {
            return false;
          }
          
          if (!resolvedProjectId) {
            return true;
          }
          const projectUuid = voice.project_uuid || voice.project_id || null;
          return !projectUuid || projectUuid === resolvedProjectId;
        })
        .map(voice => ({
          id: voice.uuid || voice.id || 'unknown',
          name: voice.name || 'Unnamed Voice',
          gender: voice.gender || null,
          language: voice.default_language || voice.language || null,
          description: voice.description || '',
          previewUrl: voice.preview_audio_url || voice.preview_audio || null,
          projectId: voice.project_uuid || voice.project_id || null,
          status: voice.status || null,
          voiceType: voice.voice_type || null,
          supportedLanguages: voice.supported_languages || [],
          labels: voice.labels || {}
        }));
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw error;
      }

      console.error('Error fetching Resemble voices:', error);
      throw new Error(`Failed to fetch available voices: ${error.message}`);
    }
  }

  /**
   * Synthesize audio using Resemble's synchronous TTS endpoint
   * @param {Object} params
   * @param {string} params.projectId - Project UUID
   * @param {string} params.voiceId - Voice UUID
   * @param {string} params.text - Text to synthesize (max 3000 characters)
   * @param {string} params.title - Title of the clip
   * @param {number} params.sampleRate - Sample rate (8000, 16000, 22050, 32000, 44100, 48000)
   * @param {string} params.outputFormat - Output format: 'mp3' or 'wav'
   * @param {string} params.precision - Bit depth for wav: 'MULAW', 'PCM_16', 'PCM_24', 'PCM_32'
   * @param {number} params.maxRetries - Maximum retry attempts for server errors (default: 3)
   * @param {number} params.retryDelay - Delay between retries in ms (default: 2000)
   * @returns {Promise<Object>} Response with base64 audio_content
   */
  async synthesizeAudio({ projectId, voiceId, text, title, sampleRate, outputFormat, precision, maxRetries = 3, retryDelay = 2000 }) {
    const apiKey = requireApiKey('resemble');
    
    const payload = {
      voice_uuid: voiceId,
      project_uuid: projectId,
      title: title || `Low Latency Synthesis ${Date.now()}`,
      data: text,
      sample_rate: sampleRate,
      output_format: outputFormat
    };

    // Only add precision for wav format
    if (outputFormat === 'wav') {
      payload.precision = precision;
    }

    let lastError;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(this.synthesisUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new ApiKeyError('Invalid Resemble API key', 'resemble', 'INVALID_API_KEY');
          }

          const errorText = await response.text().catch(() => '');
          const errorMessage = `Resemble synthesis error: ${response.status} - ${errorText}`;
          
          // Retry on server errors (500-599) but not client errors (400-499)
          if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
            attempt++;
            const waitTime = retryDelay * attempt; // Exponential backoff
            console.warn(`⚠️  [Resemble] Server error ${response.status}, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`);
            lastError = new Error(errorMessage);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(`Synthesis failed: ${result.issues?.join(', ') || 'Unknown error'}`);
        }

        if (!result.audio_content) {
          throw new Error('No audio content in synthesis response');
        }

        // Success! Return the result
        return result;
      } catch (error) {
        // Don't retry on non-server errors (API key errors, validation errors, etc.)
        if (error instanceof ApiKeyError || (error.message && !error.message.includes('500') && !error.message.includes('502') && !error.message.includes('503') && !error.message.includes('504'))) {
          throw error;
        }
        
        lastError = error;
        
        // If we've exhausted retries, throw
        if (attempt >= maxRetries) {
          throw error;
        }
        
        // Retry on server errors
        attempt++;
        const waitTime = retryDelay * attempt; // Exponential backoff
        console.warn(`⚠️  [Resemble] Server error, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Resemble synthesis failed after all retries');
  }

  /**
   * Save audio buffer to file
   * @param {Buffer} audioBuffer - Audio data
   * @param {string} scriptId - Script ID for naming
   * @param {string} format - File format ('mp3' or 'wav')
   * @returns {Promise<Object>} File information
   */
  async saveAudioFile(audioBuffer, scriptId, format = 'mp3') {
    const fileName = `voiceover_${scriptId}_${Date.now()}.${format}`;
    const filePath = path.join(this.audioPath, fileName);

    await fs.writeFile(filePath, audioBuffer);

    const stats = await fs.stat(filePath);

    return {
      name: fileName,
      path: filePath,
      relativePath: `audio/${fileName}`,
      size: stats.size
    };
  }

  /**
   * Generate a unique audio ID
   * @returns {string} Unique audio ID
   */
  generateAudioId() {
    return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate voiceover generation request
   * @param {Object} scriptData - Script data to validate
   * @throws {Error} If validation fails
   */
  validateRequest(scriptData) {
    if (!scriptData.text) {
      throw new Error('Script text is required');
    }

    if (scriptData.text.length < 10) {
      throw new Error('Script text must be at least 10 characters long');
    }

    // Resemble synchronous TTS has a max of 2000 characters
    // Note: The service will auto-truncate if needed, so this is just a warning
    if (scriptData.text.length > 2000) {
      console.warn(`⚠️  Script is ${scriptData.text.length} characters (limit: 2000). Will be truncated.`);
    }
  }

  /**
   * Get text analysis with estimated duration
   * @param {string} text
   * @returns {Object}
   */
  getTextAnalysis(text) {
    const characterCount = text.length;
    const wordCount = text.trim().split(/\s+/).length;
    const estimatedDurationSeconds = Math.max(1, Math.round((wordCount / 160) * 60));

    return {
      characterCount,
      wordCount,
      estimatedDurationSeconds,
      estimatedCost: null,
      currency: 'USD'
    };
  }

  /**
   * Delete audio file
   * @param {string} filePath - Path to audio file
   * @returns {Promise<boolean>} Success status
   */
  async deleteAudioFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return false;
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    try {
      requireApiKey('resemble');
      return {
        available: true,
        baseUrl: this.baseUrl,
        synthesisUrl: this.synthesisUrl,
        defaultProjectId: this.defaultProjectId,
        defaultVoice: this.defaultVoiceId,
        audioPath: this.audioPath
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        baseUrl: this.baseUrl,
        synthesisUrl: this.synthesisUrl,
        defaultProjectId: this.defaultProjectId,
        defaultVoice: this.defaultVoiceId,
        audioPath: this.audioPath
      };
    }
  }

  /**
   * Generic helper to call Resemble API
   * @param {string} endpoint
   * @param {string} method
   * @param {Object|null} body
   * @param {Object} query
   * @returns {Promise<Object>}
   */
  async callResemble(endpoint, method = 'GET', body = null, query = {}) {
    try {
      const apiKey = requireApiKey('resemble');
      const url = new URL(`${this.baseUrl}${endpoint}`);
      Object.entries(query || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });

      console.log(`[Resemble API] ${method} ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Authorization': `Token token="${apiKey}"`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new ApiKeyError('Invalid Resemble API key', 'resemble', 'INVALID_API_KEY');
        }

        const errorText = await response.text().catch(() => '');
        console.error(`[Resemble API] Error ${response.status}:`, errorText);
        throw new Error(`Resemble API error: ${response.status} - ${errorText}`);
      }

      if (response.status === 204) {
        return {};
      }

      const result = await response.json();
      console.log(`[Resemble API] Success:`, result ? 'Data received' : 'Empty response');
      return result;
    } catch (error) {
      // Re-throw ApiKeyError as-is
      if (error instanceof ApiKeyError) {
        throw error;
      }
      
      // Log and wrap other errors
      console.error('[Resemble API] Request failed:', error.message);
      throw error;
    }
  }
}

module.exports = new VoiceSynthesisService();