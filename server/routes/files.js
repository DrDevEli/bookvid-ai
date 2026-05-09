const express = require('express');
const router = express.Router();
const fileStorage = require('../utils/fileStorage');
const FileUploadMiddleware = require('../middleware/fileUpload');
const { authenticateToken } = require('../middleware/auth');
const path = require('path');

/**
 * @route POST /api/files/upload/cover
 * @desc Upload book cover image
 * @access Private
 */
router.post('/upload/cover', authenticateToken, FileUploadMiddleware.bookCover(), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const response = {
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        relativePath: path.relative(fileStorage.uploadPath, req.file.path),
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    };

    if (req.fileWarnings) {
      response.warnings = req.fileWarnings;
    }

    res.json(response);
  } catch (error) {
    console.error('Cover upload error:', error);
    res.status(500).json({
      error: 'Failed to upload cover image',
      details: error.message
    });
  }
});

/**
 * @route POST /api/files/upload/document
 * @desc Upload document (book content, scripts)
 * @access Private
 */
router.post('/upload/document', authenticateToken, FileUploadMiddleware.document(), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No document uploaded'
      });
    }

    const response = {
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        relativePath: path.relative(fileStorage.uploadPath, req.file.path),
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    };

    if (req.fileWarnings) {
      response.warnings = req.fileWarnings;
    }

    res.json(response);
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      error: 'Failed to upload document',
      details: error.message
    });
  }
});

/**
 * @route POST /api/files/upload/media
 * @desc Upload media files (images, videos, audio)
 * @access Private
 */
router.post('/upload/media', authenticateToken, FileUploadMiddleware.media(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No media files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      relativePath: path.relative(fileStorage.uploadPath, file.path),
      size: file.size,
      mimetype: file.mimetype,
      category: require('../utils/fileValidation').getFileCategory(file.mimetype)
    }));

    const response = {
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    };

    if (req.fileWarnings) {
      response.warnings = req.fileWarnings;
    }

    res.json(response);
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({
      error: 'Failed to upload media files',
      details: error.message
    });
  }
});

/**
 * @route POST /api/files/move
 * @desc Move file from temp to permanent location
 * @access Private
 */
router.post('/move', authenticateToken, async (req, res) => {
  try {
    const { tempPath, category, filename } = req.body;

    if (!tempPath || !category) {
      return res.status(400).json({
        error: 'Missing required parameters: tempPath and category'
      });
    }

    const result = await fileStorage.moveFile(tempPath, category, filename);

    if (result.success) {
      res.json({
        success: true,
        newPath: result.path,
        relativePath: result.relativePath
      });
    } else {
      res.status(500).json({
        error: 'Failed to move file',
        details: result.error
      });
    }
  } catch (error) {
    console.error('File move error:', error);
    res.status(500).json({
      error: 'Failed to move file',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/files/:category/:filename
 * @desc Delete a file
 * @access Private
 */
router.delete('/:category/:filename', authenticateToken, async (req, res) => {
  try {
    const { category, filename } = req.params;
    const filePath = path.join(category, filename);

    const result = await fileStorage.deleteFile(filePath);

    if (result.success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete file',
        details: result.error
      });
    }
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      details: error.message
    });
  }
});

/**
 * @route GET /api/files/info/:category/:filename
 * @desc Get file information
 * @access Private
 */
router.get('/info/:category/:filename', authenticateToken, async (req, res) => {
  try {
    const { category, filename } = req.params;
    const filePath = path.join(category, filename);

    const info = await fileStorage.getFileInfo(filePath);

    if (info.exists) {
      res.json({
        success: true,
        file: {
          path: filePath,
          size: info.size,
          created: info.created,
          modified: info.modified,
          sizeMB: Math.round(info.size / (1024 * 1024) * 100) / 100
        }
      });
    } else {
      res.status(404).json({
        error: 'File not found',
        details: info.error
      });
    }
  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      error: 'Failed to get file information',
      details: error.message
    });
  }
});

/**
 * @route GET /api/files/stats
 * @desc Get storage statistics
 * @access Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await fileStorage.getStorageStats();
    
    // Calculate total across all categories
    let totalFiles = 0;
    let totalSize = 0;
    
    Object.values(stats).forEach(categoryStats => {
      if (!categoryStats.error) {
        totalFiles += categoryStats.fileCount;
        totalSize += categoryStats.totalSize;
      }
    });

    res.json({
      success: true,
      stats: {
        ...stats,
        total: {
          fileCount: totalFiles,
          totalSize,
          totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Storage stats error:', error);
    res.status(500).json({
      error: 'Failed to get storage statistics',
      details: error.message
    });
  }
});

/**
 * @route POST /api/files/cleanup
 * @desc Clean up temporary files
 * @access Private
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    
    const result = await fileStorage.cleanupTempFiles(maxAgeHours);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount
      });
    } else {
      res.status(500).json({
        error: 'Failed to cleanup temporary files',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup temporary files',
      details: error.message
    });
  }
});

/**
 * @route GET /api/files/serve/:category/:filename
 * @desc Serve uploaded files
 * @access Private
 */
router.get('/serve/:category/:filename', authenticateToken, async (req, res) => {
  try {
    const { category, filename } = req.params;
    const filePath = path.join(fileStorage.uploadPath, category, filename);

    const info = await fileStorage.getFileInfo(filePath);
    
    if (!info.exists) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Length', info.size);
    res.setHeader('Last-Modified', info.modified.toUTCString());
    
    // Set content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf'
    };
    
    if (contentTypes[ext]) {
      res.setHeader('Content-Type', contentTypes[ext]);
    }

    // Send file
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({
      error: 'Failed to serve file',
      details: error.message
    });
  }
});

module.exports = router;