/**
 * Configuration Routes
 * Provides endpoints for checking API key status and service availability
 */

const express = require('express');
const { getServicesHealth } = require('../utils/apiKeyValidation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/config/health
 * Check the health and availability of all AI services
 */
router.get('/health', authenticateToken, (req, res) => {
  try {
    const health = getServicesHealth();
    
    res.json({
      status: health.overall ? 'healthy' : 'degraded',
      services: health.services,
      timestamp: health.timestamp
    });
  } catch (error) {
    console.error('Error checking service health:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check service health'
    });
  }
});

/**
 * GET /api/config/services
 * Get detailed information about service availability
 */
router.get('/services', authenticateToken, (req, res) => {
  try {
    const health = getServicesHealth();
    
    // Transform the data to be more user-friendly
    const services = Object.entries(health.services).map(([name, status]) => ({
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      available: status.available,
      configured: status.configured,
      valid: status.valid,
      maskedKey: status.masked,
      status: status.available ? 'ready' : 'unavailable',
      message: status.available 
        ? 'Service is ready' 
        : !status.configured 
          ? 'API key not configured' 
          : 'API key format is invalid'
    }));
    
    res.json({
      services,
      overallStatus: health.overall ? 'ready' : 'degraded',
      timestamp: health.timestamp
    });
  } catch (error) {
    console.error('Error getting service information:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get service information'
    });
  }
});

/**
 * GET /api/config/requirements
 * Get information about required environment variables
 */
router.get('/requirements', (req, res) => {
  res.json({
    required: [
      {
        name: 'OPENAI_API_KEY',
        description: 'OpenAI API key for script generation',
        format: 'sk-...',
        required: true,
        service: 'Script Generation'
      },
      {
        name: 'RESEMBLE_API_KEY',
        description: 'Resemble AI API token for voice synthesis',
        format: 'Token token="..."',
        required: true,
        service: 'Voice Synthesis'
      },
      {
        name: 'RESEMBLE_PROJECT_ID',
        description: 'Default Resemble project UUID containing your voices',
        format: 'UUID',
        required: false,
        service: 'Voice Synthesis'
      },
      {
        name: 'RESEMBLE_VOICE_ID',
        description: 'Default Resemble voice UUID to use for narration',
        format: 'UUID',
        required: false,
        service: 'Voice Synthesis'
      },
      {
        name: 'STABILITY_API_KEY',
        description: 'Stability AI API key for image generation',
        format: 'sk-...',
        required: false,
        service: 'Image Generation'
      }
    ],
    documentation: {
      openai: 'https://platform.openai.com/api-keys',
      resemble: 'https://docs.app.resemble.ai/docs/getting_started/quick_start/',
      stability: 'https://platform.stability.ai/account/keys'
    }
  });
});

module.exports = router;