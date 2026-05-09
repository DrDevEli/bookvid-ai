/**
 * Script Generation Service
 * Uses OpenAI API to generate video scripts from book content
 */

const { requireApiKey, ApiKeyError } = require('../utils/apiKeyValidation');

class ScriptGenerationService {
  constructor() {
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-3.5-turbo';
    this.isDeepSeek = false;
  }

  /**
   * Detect if using DeepSeek API key and adjust configuration
   * @private
   */
  _detectProvider() {
    try {
      const apiKey = requireApiKey('openai');
      // DeepSeek keys are typically shorter than OpenAI keys
      // OpenAI keys are usually 51 chars, DeepSeek keys are usually 35-40 chars
      this.isDeepSeek = apiKey.length < 45;
      
      if (this.isDeepSeek) {
        this.baseUrl = 'https://api.deepseek.com/v1';
        this.model = 'deepseek-chat';
        console.log('🔍 Detected DeepSeek API key, using DeepSeek endpoint');
      } else {
        console.log('🔍 Detected OpenAI API key, using OpenAI endpoint');
      }
    } catch (error) {
      // If API key is not available, assume OpenAI
      this.isDeepSeek = false;
    }
  }

  /**
   * Generate a video script from book content
   * @param {Object} bookData - Book information
   * @param {string} bookData.title - Book title
   * @param {string} bookData.author - Book author
   * @param {string} bookData.genre - Book genre
   * @param {string} bookData.description - Book description
   * @param {string} bookData.content - Book content excerpt
   * @param {Object} options - Generation options
   * @param {number} options.duration - Target video duration in seconds (default: 60)
   * @param {string} options.tone - Script tone (default: 'engaging')
   * @returns {Promise<Object>} Generated script data
   */
  async generateScript(bookData, options = {}) {
    try {
      // Detect provider (OpenAI vs DeepSeek) and adjust configuration
      this._detectProvider();
      
      const apiKey = requireApiKey('openai');
      
      const {
        duration = 60,
        tone = 'engaging'
      } = options;

      const prompt = this.buildPrompt(bookData, { duration, tone });
      
      const response = await this.callOpenAI(apiKey, prompt);
      
      return this.parseScriptResponse(response, bookData);
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw error;
      }
      
      console.error('Script generation error:', error);
      throw new Error(`Failed to generate script: ${error.message}`);
    }
  }

  /**
   * Build the prompt for script generation
   * @param {Object} bookData - Book information
   * @param {Object} options - Generation options
   * @returns {string} Generated prompt
   */
  buildPrompt(bookData, options) {
    const { title, author, genre, description, content } = bookData;
    const { duration, tone } = options;

    return `Create a compelling ${duration}-second video script for promoting the book "${title}" by ${author}.

Book Details:
- Genre: ${genre}
- Description: ${description}
- Content excerpt: ${content ? content.substring(0, 500) + '...' : 'No content provided'}

Requirements:
- Script should be ${tone} and compelling
- Target duration: ${duration} seconds (approximately ${Math.floor(duration / 60)} minutes)
- Include a strong hook in the first 5 seconds
- Highlight the book's unique value proposition
- End with a clear call-to-action
- Format as a structured script with timing cues

Please provide the response in the following JSON format:
{
  "title": "Video title",
  "hook": "Opening hook (0-5 seconds)",
  "main_content": "Main promotional content",
  "call_to_action": "Closing call-to-action",
  "estimated_duration": ${duration},
  "key_points": ["point1", "point2", "point3"],
  "tone": "${tone}",
  "script_sections": [
    {
      "timestamp": "0:00-0:05",
      "content": "Hook content",
      "visual_cue": "Suggested visual"
    }
  ]
}`;
  }

  /**
   * Call OpenAI API
   * @param {string} apiKey - OpenAI API key
   * @param {string} prompt - Generation prompt
   * @returns {Promise<Object>} API response
   */
  async callOpenAI(apiKey, prompt) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional video script writer specializing in book promotion videos. Create engaging, compelling scripts that capture the essence of books and motivate viewers to read them.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        throw new ApiKeyError('Invalid OpenAI API key', 'openai', 'INVALID_API_KEY');
      }
      
      if (response.status === 429) {
        throw new ApiKeyError('OpenAI API quota exceeded', 'openai', 'QUOTA_EXCEEDED');
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Parse OpenAI response and extract script data
   * @param {Object} response - OpenAI API response
   * @param {Object} bookData - Original book data
   * @returns {Object} Parsed script data
   */
  parseScriptResponse(response, bookData) {
    try {
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Try to parse as JSON first
      let scriptData;
      try {
        scriptData = JSON.parse(content);
      } catch (parseError) {
        // If JSON parsing fails, create a basic structure
        scriptData = {
          title: `${bookData.title} - Book Trailer`,
          hook: content.substring(0, 200),
          main_content: content,
          call_to_action: 'Get your copy today!',
          estimated_duration: 60,
          key_points: [],
          tone: 'engaging',
          script_sections: []
        };
      }

      // Ensure required fields exist
      return {
        id: this.generateScriptId(),
        bookId: bookData.id,
        title: scriptData.title || `${bookData.title} - Book Trailer`,
        hook: scriptData.hook || '',
        mainContent: scriptData.main_content || scriptData.mainContent || content,
        callToAction: scriptData.call_to_action || scriptData.callToAction || 'Get your copy today!',
        estimatedDuration: scriptData.estimated_duration || scriptData.estimatedDuration || 60,
        keyPoints: scriptData.key_points || scriptData.keyPoints || [],
        tone: scriptData.tone || 'engaging',
        scriptSections: scriptData.script_sections || scriptData.scriptSections || [],
        generatedAt: new Date().toISOString(),
        model: this.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('Error parsing script response:', error);
      throw new Error('Failed to parse script generation response');
    }
  }

  /**
   * Generate a unique script ID
   * @returns {string} Unique script ID
   */
  generateScriptId() {
    return `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate script generation request
   * @param {Object} bookData - Book data to validate
   * @throws {Error} If validation fails
   */
  validateRequest(bookData) {
    const required = ['title', 'author', 'description'];
    const missing = required.filter(field => !bookData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (bookData.description.length < 10) {
      throw new Error('Book description must be at least 10 characters long');
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    try {
      requireApiKey('openai');
      // Detect provider to show correct status
      this._detectProvider();
      
      return {
        available: true,
        model: this.model,
        baseUrl: this.baseUrl,
        provider: this.isDeepSeek ? 'DeepSeek' : 'OpenAI'
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        model: this.model,
        baseUrl: this.baseUrl,
        provider: this.isDeepSeek ? 'DeepSeek' : 'OpenAI'
      };
    }
  }
}

module.exports = new ScriptGenerationService();