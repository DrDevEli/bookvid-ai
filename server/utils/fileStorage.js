const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * File storage utility for handling local file uploads
 */
class FileStorageService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
    this.allowedMimeTypes = {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      videos: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
      audio: ['audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg'],
      documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
  }

  /**
   * Initialize upload directories
   */
  async initializeDirectories() {
    const directories = [
      path.join(this.uploadPath, 'covers'),
      path.join(this.uploadPath, 'videos'),
      path.join(this.uploadPath, 'thumbnails'),
      path.join(this.uploadPath, 'audio'),
      path.join(this.uploadPath, 'temp'),
      path.join(this.uploadPath, 'documents')
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch (error) {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }
  }

  /**
   * Generate unique filename
   */
  generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}_${hash}${ext}`;
  }

  /**
   * Validate file type and size
   */
  validateFile(file, category = 'images') {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check MIME type
    const allowedTypes = this.allowedMimeTypes[category] || this.allowedMimeTypes.images;
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create multer storage configuration
   */
  createStorage(category = 'temp') {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(this.uploadPath, category);
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = this.generateUniqueFilename(file.originalname);
        cb(null, uniqueName);
      }
    });
  }

  /**
   * Create multer upload middleware
   */
  createUploadMiddleware(options = {}) {
    const {
      category = 'temp',
      maxFiles = 1,
      fileFilter = null
    } = options;

    const storage = this.createStorage(category);
    
    const upload = multer({
      storage,
      limits: {
        fileSize: this.maxFileSize,
        files: maxFiles
      },
      fileFilter: fileFilter || ((req, file, cb) => {
        const validation = this.validateFile(file, category);
        if (validation.isValid) {
          cb(null, true);
        } else {
          cb(new Error(validation.errors.join(', ')), false);
        }
      })
    });

    return maxFiles === 1 ? upload.single('file') : upload.array('files', maxFiles);
  }

  /**
   * Move file from temp to permanent location
   */
  async moveFile(tempPath, permanentCategory, filename = null) {
    try {
      const finalFilename = filename || path.basename(tempPath);
      const permanentPath = path.join(this.uploadPath, permanentCategory, finalFilename);
      
      await fs.rename(tempPath, permanentPath);
      
      return {
        success: true,
        path: permanentPath,
        relativePath: path.join(permanentCategory, finalFilename)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath);
      await fs.unlink(fullPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath);
      const stats = await fs.stat(fullPath);
      
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        path: fullPath
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up temporary files older than specified time
   */
  async cleanupTempFiles(maxAgeHours = 24) {
    try {
      const tempDir = path.join(this.uploadPath, 'temp');
      const files = await fs.readdir(tempDir);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      return {
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} temporary files`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const categories = ['covers', 'videos', 'thumbnails', 'audio', 'temp', 'documents'];
      const stats = {};
      
      for (const category of categories) {
        const categoryPath = path.join(this.uploadPath, category);
        try {
          const files = await fs.readdir(categoryPath);
          let totalSize = 0;
          
          for (const file of files) {
            const filePath = path.join(categoryPath, file);
            const fileStats = await fs.stat(filePath);
            totalSize += fileStats.size;
          }
          
          stats[category] = {
            fileCount: files.length,
            totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
          };
        } catch (error) {
          stats[category] = {
            fileCount: 0,
            totalSize: 0,
            totalSizeMB: 0,
            error: error.message
          };
        }
      }
      
      return stats;
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }
}

module.exports = new FileStorageService();