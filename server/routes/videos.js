const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const VideoRepository = require('../models/Video');
const BookRepository = require('../models/Book');
const mediaProcessing = require('../services/mediaProcessing');
const fileCleanup = require('../services/fileCleanup');

const router = express.Router();
const videoRepo = new VideoRepository();
const bookRepo = new BookRepository();

/**
 * Validation rules for video creation
 */
const createVideoValidation = [
  body('book_id')
    .notEmpty()
    .withMessage('Book ID is required'),
  
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  
  body('template_id')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Template ID must be less than 50 characters'),
  
  body('script')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Script must be less than 10000 characters')
];

/**
 * Get all videos for authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    
    let videos;
    if (search) {
      videos = videoRepo.searchUserVideos(req.user.id, search, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } else {
      videos = videoRepo.getUserVideos(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
    }

    res.json({
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      error: 'Failed to get videos',
      message: 'Internal server error'
    });
  }
});

/**
 * Get single video by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.getVideoWithDetails(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({ video });

  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      error: 'Failed to get video',
      message: 'Internal server error'
    });
  }
});

/**
 * Create new video
 */
router.post('/', authenticateToken, createVideoValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Verify book exists and belongs to user
    const book = bookRepo.findById(req.body.book_id);
    if (!book) {
      return res.status(404).json({
        error: 'Book not found'
      });
    }

    if (book.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied to book'
      });
    }

    const videoData = {
      ...req.body,
      user_id: req.user.id,
      status: 'generating'
    };

    const video = videoRepo.createVideo(videoData);

    res.status(201).json({
      message: 'Video creation started',
      video
    });

  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({
      error: 'Failed to create video',
      message: 'Internal server error'
    });
  }
});

/**
 * Update video
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Only allow updating certain fields
    const allowedFields = ['title', 'script', 'status'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedVideo = videoRepo.updateVideo(req.params.id, updateData);

    res.json({
      message: 'Video updated successfully',
      video: updatedVideo
    });

  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      error: 'Failed to update video',
      message: 'Internal server error'
    });
  }
});

/**
 * Delete video
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const success = videoRepo.delete(req.params.id);

    if (!success) {
      return res.status(500).json({
        error: 'Failed to delete video'
      });
    }

    res.json({
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      error: 'Failed to delete video',
      message: 'Internal server error'
    });
  }
});

/**
 * Get video generation status
 */
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({
      id: video.id,
      status: video.status,
      progress: video.progress || 0,
      created_at: video.created_at,
      updated_at: video.updated_at
    });

  } catch (error) {
    console.error('Get video status error:', error);
    res.status(500).json({
      error: 'Failed to get video status',
      message: 'Internal server error'
    });
  }
});

/**
 * Start video generation process
 */
router.post('/:id/generate', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Check if video is in a state that allows generation
    if (video.status === 'generating') {
      return res.status(400).json({
        error: 'Video generation already in progress'
      });
    }

    const { audioPath, mediaFiles, template } = req.body;

    // Start video generation
    const jobResult = await mediaProcessing.startVideoGeneration({
      id: video.id,
      scriptText: video.script,
      audioPath,
      mediaFiles: mediaFiles || [],
      template: template || {}
    });

    // Update video status
    videoRepo.updateVideo(video.id, {
      status: 'generating',
      updated_at: new Date().toISOString()
    });

    res.json({
      message: 'Video generation started',
      jobId: jobResult.jobId,
      status: jobResult.status,
      progress: jobResult.progress
    });

  } catch (error) {
    console.error('Start video generation error:', error);
    res.status(500).json({
      error: 'Failed to start video generation',
      message: error.message
    });
  }
});

/**
 * Get video generation job status
 */
router.get('/:id/job/:jobId', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Try both media processing and video renderer services
    let jobStatus = mediaProcessing.getJobStatus(req.params.jobId);
    
    if (!jobStatus) {
      // Check if it's a render job
      const videoRenderer = require('../services/videoRenderer');
      const renderStatus = videoRenderer.getRenderJobStatus(req.params.jobId);
      
      if (renderStatus) {
        jobStatus = {
          id: renderStatus.jobId,
          videoId: renderStatus.videoId,
          status: renderStatus.status,
          progress: renderStatus.progress,
          currentStep: renderStatus.currentStep,
          currentStepName: renderStatus.currentStepName,
          startedAt: renderStatus.startedAt,
          completedAt: renderStatus.completedAt,
          error: renderStatus.error,
          result: renderStatus.result,
          estimatedTimeRemaining: renderStatus.estimatedTimeRemaining
        };
      }
    }
    
    if (!jobStatus) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    // Update video status if job is completed
    if (jobStatus.status === 'completed' && jobStatus.result) {
      videoRepo.updateVideo(video.id, {
        status: 'completed',
        video_path: jobStatus.result.videoPath,
        thumbnail_path: jobStatus.result.thumbnailPath,
        duration: jobStatus.result.duration,
        updated_at: new Date().toISOString()
      });
    } else if (jobStatus.status === 'failed') {
      videoRepo.updateVideo(video.id, {
        status: 'failed',
        updated_at: new Date().toISOString()
      });
    }

    res.json(jobStatus);

  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({
      error: 'Failed to get job status',
      message: error.message
    });
  }
});

/**
 * Cancel video generation job
 */
router.post('/:id/job/:jobId/cancel', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const cancelled = mediaProcessing.cancelJob(req.params.jobId);
    
    if (!cancelled) {
      return res.status(400).json({
        error: 'Job cannot be cancelled or does not exist'
      });
    }

    // Update video status
    videoRepo.updateVideo(video.id, {
      status: 'cancelled',
      updated_at: new Date().toISOString()
    });

    res.json({
      message: 'Video generation cancelled'
    });

  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({
      error: 'Failed to cancel job',
      message: error.message
    });
  }
});

/**
 * Download video file
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Check if video is completed and has a file
    if (video.status !== 'completed' || !video.video_path) {
      return res.status(400).json({
        error: 'Video not ready for download'
      });
    }

    const path = require('path');
    const fs = require('fs');
    const videoPath = path.join(__dirname, '..', video.video_path);

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        error: 'Video file not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="video-${video.id}.mp4"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(videoPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({
      error: 'Failed to download video',
      message: error.message
    });
  }
});

/**
 * Get video thumbnail
 */
router.get('/:id/thumbnail', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Check if video has a thumbnail
    if (!video.thumbnail_path) {
      return res.status(404).json({
        error: 'Thumbnail not found'
      });
    }

    const path = require('path');
    const fs = require('fs');
    const thumbnailPath = path.join(__dirname, '..', video.thumbnail_path);

    // Check if file exists
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({
        error: 'Thumbnail file not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    
    // Stream the file
    const fileStream = fs.createReadStream(thumbnailPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Get thumbnail error:', error);
    res.status(500).json({
      error: 'Failed to get thumbnail',
      message: error.message
    });
  }
});

/**
 * Clean up video files
 */
router.delete('/:id/files', authenticateToken, async (req, res) => {
  try {
    const video = videoRepo.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        error: 'Video not found'
      });
    }

    // Check if video belongs to user
    if (video.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const cleanupResult = await fileCleanup.cleanupVideoFiles(video.id);

    res.json({
      message: 'Video files cleaned up',
      deletedFiles: cleanupResult.deletedFiles,
      errors: cleanupResult.errors
    });

  } catch (error) {
    console.error('Video file cleanup error:', error);
    res.status(500).json({
      error: 'Failed to clean up video files',
      message: error.message
    });
  }
});

module.exports = router;