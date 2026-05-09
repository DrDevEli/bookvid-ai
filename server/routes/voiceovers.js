/**
 * Voiceover Generation Routes
 * Handles voiceover generation requests using Resemble AI
 */

const express = require('express');
const voiceSynthesisService = require('../services/voiceSynthesis');
const { requireService, addServiceInfo } = require('../utils/apiKeyValidation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Add service availability info to all requests
router.use(addServiceInfo);

/**
 * POST /api/voiceovers/generate
 * Generate a voiceover from script text
 */
router.post('/generate', authenticateToken, requireService('resemble'), async (req, res) => {
  try {
    const { scriptData, options = {} } = req.body;
    
    // Validate request
    voiceSynthesisService.validateRequest(scriptData);
    
    // Generate voiceover
    const voiceover = await voiceSynthesisService.generateVoiceover(scriptData, options);
    
    res.json({
      success: true,
      voiceover,
      message: 'Voiceover generated successfully'
    });
  } catch (error) {
    console.error('Voiceover generation error:', error);
    
    if (error.code === 'INVALID_API_KEY' || error.code === 'QUOTA_EXCEEDED') {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: error.message,
        code: error.code
      });
    }
    
    res.status(400).json({
      error: 'Voiceover Generation Failed',
      message: error.message
    });
  }
});

/**
 * GET /api/voiceovers/voices
 * Get available voices from Resemble AI
 */
router.get('/voices', authenticateToken, requireService('resemble'), async (req, res) => {
  try {
    const voices = await voiceSynthesisService.getAvailableVoices();
    
    return res.json({
      success: true,
      voices,
      count: voices.length
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    
    // Handle API key errors
    if (error.service === 'resemble' && error.code === 'INVALID_API_KEY') {
      return res.status(401).json({
        error: 'Invalid API Key',
        message: error.message,
        code: error.code
      });
    }
    
    // Handle quota errors
    if (error.code === 'QUOTA_EXCEEDED') {
      return res.status(429).json({
        error: 'Quota Exceeded',
        message: error.message,
        code: error.code
      });
    }
    
    return res.status(500).json({
      error: 'Failed to Fetch Voices',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/voiceovers/analyze
 * Analyze text for character count and cost estimation
 */
router.post('/analyze', authenticateToken, (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required'
      });
    }
    
    const analysis = voiceSynthesisService.getTextAnalysis(text);
    
    res.json({
      success: true,
      analysis,
      serviceAvailable: req.services.resemble.available
    });
  } catch (error) {
    console.error('Error analyzing text:', error);
    res.status(500).json({
      error: 'Analysis Failed',
      message: error.message
    });
  }
});

/**
 * GET /api/voiceovers/status
 * Get voiceover service status
 */
router.get('/status', authenticateToken, (req, res) => {
  try {
    const status = voiceSynthesisService.getStatus();
    
    res.json({
      service: 'voice-synthesis',
      ...status,
      serviceInfo: req.services.resemble
    });
  } catch (error) {
    console.error('Error getting voiceover service status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get service status'
    });
  }
});

/**
 * POST /api/voiceovers/validate
 * Validate script data for voiceover generation
 */
router.post('/validate', authenticateToken, (req, res) => {
  try {
    const { scriptData } = req.body;
    
    voiceSynthesisService.validateRequest(scriptData);
    
    const analysis = voiceSynthesisService.getTextAnalysis(scriptData.text);
    
    res.json({
      valid: true,
      message: 'Script data is valid for voiceover generation',
      analysis,
      serviceAvailable: req.services.resemble.available
    });
  } catch (error) {
    res.status(400).json({
      valid: false,
      error: error.message,
      serviceAvailable: req.services.resemble.available
    });
  }
});

/**
 * DELETE /api/voiceovers/:id
 * Delete a voiceover file
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'File path is required'
      });
    }
    
    const deleted = await voiceSynthesisService.deleteAudioFile(filePath);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Voiceover file deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Voiceover file not found or could not be deleted'
      });
    }
  } catch (error) {
    console.error('Error deleting voiceover:', error);
    res.status(500).json({
      error: 'Deletion Failed',
      message: error.message
    });
  }
});

module.exports = router;