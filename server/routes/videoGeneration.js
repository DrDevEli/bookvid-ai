/**
 * Video Generation Workflow Routes
 * Handles complete video generation workflow requests
 */

const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const videoGenerationWorkflow = require('../services/videoGenerationWorkflow');
const { addServiceInfo } = require('../utils/apiKeyValidation');

const router = express.Router();

// Add service availability info to all requests
router.use(addServiceInfo);

/**
 * Validation rules for video generation
 */
const generateVideoValidation = [
  body('bookId')
    .notEmpty()
    .withMessage('Book ID is required'),
  
  body('templateId')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Template ID must be less than 50 characters'),
  
  body('options.duration')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Duration must be between 30 and 300 seconds'),
  
  body('options.tone')
    .optional()
    .isIn(['engaging', 'professional', 'casual', 'dramatic', 'informative'])
    .withMessage('Invalid tone specified'),
  
  body('options.voiceId')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Voice ID must be less than 50 characters')
];

/**
 * POST /api/video-generation/start
 * Start complete video generation workflow
 */
router.post('/start', authenticateToken, generateVideoValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { bookId, templateId, options = {} } = req.body;

    // Check service availability
    if (!req.services.openai.available) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'OpenAI service is not available',
        details: req.services.openai.error
      });
    }

    if (!req.services.resemble.available) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Resemble service is not available',
        details: req.services.resemble.error
      });
    }

    // Start workflow
    const result = await videoGenerationWorkflow.startVideoGeneration({
      bookId,
      userId: req.user.id,
      templateId,
      options
    });

    res.json({
      success: true,
      message: 'Video generation workflow started',
      workflow: result
    });

  } catch (error) {
    console.error('Start video generation error:', error);
    
    res.status(400).json({
      error: 'Video Generation Failed',
      message: error.message
    });
  }
});

/**
 * GET /api/video-generation/status/:workflowId
 * Get workflow status
 */
router.get('/status/:workflowId', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const status = videoGenerationWorkflow.getWorkflowStatus(workflowId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Workflow not found'
      });
    }

    // If workflow has a render job, get detailed render status
    if (status.results?.video?.renderJobId) {
      const videoRenderer = require('../services/videoRenderer');
      const renderStatus = videoRenderer.getRenderJobStatus(status.results.video.renderJobId);
      
      if (renderStatus) {
        status.renderProgress = {
          jobId: renderStatus.jobId,
          status: renderStatus.status,
          progress: renderStatus.progress,
          currentStep: renderStatus.currentStepName,
          estimatedTimeRemaining: renderStatus.estimatedTimeRemaining
        };
      }
    }

    res.json({
      success: true,
      workflow: status
    });

  } catch (error) {
    console.error('Get workflow status error:', error);
    res.status(500).json({
      error: 'Failed to get workflow status',
      message: error.message
    });
  }
});

/**
 * POST /api/video-generation/cancel/:workflowId
 * Cancel workflow
 */
router.post('/cancel/:workflowId', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const cancelled = videoGenerationWorkflow.cancelWorkflow(workflowId);
    
    if (!cancelled) {
      return res.status(400).json({
        error: 'Workflow cannot be cancelled or does not exist'
      });
    }

    res.json({
      success: true,
      message: 'Workflow cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel workflow error:', error);
    res.status(500).json({
      error: 'Failed to cancel workflow',
      message: error.message
    });
  }
});

/**
 * GET /api/video-generation/templates
 * Get available templates
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { category, genre, limit = 20 } = req.query;
    
    const templateRepo = require('../models/Template');
    const repo = new templateRepo();
    
    let templates;
    
    if (genre) {
      templates = repo.getTemplatesForGenre(genre, { limit: parseInt(limit) });
    } else if (category) {
      templates = repo.getTemplatesByCategory(category, { limit: parseInt(limit) });
    } else {
      templates = repo.getAllTemplates({ limit: parseInt(limit) });
    }

    res.json({
      success: true,
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

/**
 * GET /api/video-generation/templates/:templateId
 * Get specific template details
 */
router.get('/templates/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const templateRepo = require('../models/Template');
    const repo = new templateRepo();
    
    const template = repo.getTemplateWithConfig(templateId);
    
    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    // Get template statistics
    const stats = repo.getTemplateStats(templateId);

    res.json({
      success: true,
      template: {
        ...template,
        stats
      }
    });

  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      error: 'Failed to get template',
      message: error.message
    });
  }
});

/**
 * GET /api/video-generation/voices
 * Get available voices for voiceover
 */
router.get('/voices', authenticateToken, async (req, res) => {
  try {
    if (!req.services.resemble.available) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Resemble service is not available',
        details: req.services.resemble.error
      });
    }

    const voiceSynthesisService = require('../services/voiceSynthesis');
    const voices = await voiceSynthesisService.getAvailableVoices();
    
    return res.json({
      success: true,
      voices,
      count: voices.length
    });

  } catch (error) {
    console.error('Get voices error:', error);
    
    // Handle API key errors
    if (error.service === 'resemble' && error.code === 'INVALID_API_KEY') {
      return res.status(401).json({
        error: 'Invalid API Key',
        message: error.message,
        code: error.code
      });
    }
    
    // Handle other service errors
    if (error.code === 'QUOTA_EXCEEDED') {
      return res.status(429).json({
        error: 'Quota Exceeded',
        message: error.message,
        code: error.code
      });
    }
    
    return res.status(500).json({
      error: 'Failed to get voices',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

/**
 * POST /api/video-generation/preview-script
 * Generate script preview without starting full workflow
 */
router.post('/preview-script', authenticateToken, async (req, res) => {
  try {
    const { bookId, options = {} } = req.body;
    
    if (!bookId) {
      return res.status(400).json({
        error: 'Book ID is required'
      });
    }

    if (!req.services.openai.available) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'OpenAI service is not available',
        details: req.services.openai.error
      });
    }

    const BookRepository = require('../models/Book');
    const bookRepo = new BookRepository();
    
    const book = bookRepo.findById(bookId);
    if (!book) {
      return res.status(404).json({
        error: 'Book not found'
      });
    }

    if (book.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const scriptGenerationService = require('../services/scriptGeneration');
    
    const bookData = {
      id: book.id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      description: book.description,
      content: book.content
    };

    const script = await scriptGenerationService.generateScript(bookData, options);

    res.json({
      success: true,
      script,
      message: 'Script preview generated successfully'
    });

  } catch (error) {
    console.error('Preview script error:', error);
    
    if (error.code === 'INVALID_API_KEY' || error.code === 'QUOTA_EXCEEDED') {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: error.message,
        code: error.code
      });
    }
    
    res.status(400).json({
      error: 'Script Preview Failed',
      message: error.message
    });
  }
});

/**
 * GET /api/video-generation/service-status
 * Get overall service status
 */
router.get('/service-status', authenticateToken, async (req, res) => {
  try {
    const status = videoGenerationWorkflow.getStatus();
    
    res.json({
      success: true,
      status: {
        ...status,
        serviceInfo: {
        openai: req.services.openai,
        resemble: req.services.resemble
        }
      }
    });

  } catch (error) {
    console.error('Get service status error:', error);
    res.status(500).json({
      error: 'Failed to get service status',
      message: error.message
    });
  }
});

/**
 * GET /api/video-generation/stats
 * Get workflow statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = videoGenerationWorkflow.getStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/video-generation/render/:jobId
 * Get render job status
 */
router.get('/render/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const videoRenderer = require('../services/videoRenderer');
    const renderStatus = videoRenderer.getRenderJobStatus(jobId);
    
    if (!renderStatus) {
      return res.status(404).json({
        error: 'Render job not found'
      });
    }

    res.json({
      success: true,
      render: renderStatus
    });

  } catch (error) {
    console.error('Get render status error:', error);
    res.status(500).json({
      error: 'Failed to get render status',
      message: error.message
    });
  }
});

/**
 * POST /api/video-generation/render/:jobId/cancel
 * Cancel render job
 */
router.post('/render/:jobId/cancel', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const videoRenderer = require('../services/videoRenderer');
    const cancelled = videoRenderer.cancelRenderJob(jobId);
    
    if (!cancelled) {
      return res.status(400).json({
        error: 'Render job cannot be cancelled or does not exist'
      });
    }

    res.json({
      success: true,
      message: 'Render job cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel render job error:', error);
    res.status(500).json({
      error: 'Failed to cancel render job',
      message: error.message
    });
  }
});

/**
 * POST /api/video-generation/cleanup
 * Clean up old completed workflows
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    
    const workflowCleaned = videoGenerationWorkflow.cleanupCompletedWorkflows(maxAgeHours);
    
    const videoRenderer = require('../services/videoRenderer');
    const renderCleaned = videoRenderer.cleanupCompletedJobs(maxAgeHours);
    
    res.json({
      success: true,
      message: `Cleaned up ${workflowCleaned} workflows and ${renderCleaned} render jobs`,
      cleanedCount: {
        workflows: workflowCleaned,
        renderJobs: renderCleaned
      }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: 'Cleanup failed',
      message: error.message
    });
  }
});

module.exports = router;