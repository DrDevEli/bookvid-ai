/**
 * Script Generation Routes
 * Handles script generation requests using AI services
 */

const express = require('express');
const scriptGenerationService = require('../services/scriptGeneration');
const { requireService, addServiceInfo } = require('../utils/apiKeyValidation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Add service availability info to all requests
router.use(addServiceInfo);

/**
 * POST /api/scripts/generate
 * Generate a video script from book data
 */
router.post('/generate', authenticateToken, requireService('openai'), async (req, res) => {
  try {
    const { bookData, options = {} } = req.body;
    
    // Validate request
    scriptGenerationService.validateRequest(bookData);
    
    // Generate script
    const script = await scriptGenerationService.generateScript(bookData, options);
    
    res.json({
      success: true,
      script,
      message: 'Script generated successfully'
    });
  } catch (error) {
    console.error('Script generation error:', error);
    
    if (error.code === 'INVALID_API_KEY' || error.code === 'QUOTA_EXCEEDED') {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: error.message,
        code: error.code
      });
    }
    
    res.status(400).json({
      error: 'Script Generation Failed',
      message: error.message
    });
  }
});

/**
 * GET /api/scripts/status
 * Get script generation service status
 */
router.get('/status', authenticateToken, (req, res) => {
  try {
    const status = scriptGenerationService.getStatus();
    
    res.json({
      service: 'script-generation',
      ...status,
      serviceInfo: req.services.openai
    });
  } catch (error) {
    console.error('Error getting script service status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get service status'
    });
  }
});

/**
 * POST /api/scripts/validate
 * Validate book data for script generation
 */
router.post('/validate', authenticateToken, (req, res) => {
  try {
    const { bookData } = req.body;
    
    scriptGenerationService.validateRequest(bookData);
    
    res.json({
      valid: true,
      message: 'Book data is valid for script generation',
      serviceAvailable: req.services.openai.available
    });
  } catch (error) {
    res.status(400).json({
      valid: false,
      error: error.message,
      serviceAvailable: req.services.openai.available
    });
  }
});

module.exports = router;