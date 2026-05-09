/**
 * File Cleanup Service
 * Handles automatic cleanup of temporary files, orphaned files, and old media
 */

const fs = require('fs').promises;
const path = require('path');
const fileStorage = require('../utils/fileStorage');

class FileCleanupService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.cleanupIntervals = new Map();
    this.isRunning = false;
  }

  /**
   * Start automatic cleanup processes
   * @param {Object} options - Cleanup configuration
   * @param {number} options.tempFileMaxAge - Max age for temp files in hours (default: 24)
   * @param {number} options.orphanedFileMaxAge - Max age for orphaned files in hours (default: 168)
   * @param {number} options.cleanupInterval - Cleanup interval in minutes (default: 60)
   */
  startAutomaticCleanup(options = {}) {
    if (this.isRunning) {
      console.log('File cleanup service is already running');
      return;
    }

    const {
      tempFileMaxAge = 24,
      orphanedFileMaxAge = 168, // 7 days
      cleanupInterval = 60 // 1 hour
    } = options;

    this.isRunning = true;

    // Schedule regular cleanup
    const intervalId = setInterval(async () => {
      try {
        await this.performScheduledCleanup({
          tempFileMaxAge,
          orphanedFileMaxAge
        });
      } catch (error) {
        console.error('Scheduled cleanup error:', error);
      }
    }, cleanupInterval * 60 * 1000);

    this.cleanupIntervals.set('main', intervalId);

    console.log(`File cleanup service started with ${cleanupInterval}min intervals`);
  }

  /**
   * Stop automatic cleanup processes
   */
  stopAutomaticCleanup() {
    for (const [name, intervalId] of this.cleanupIntervals.entries()) {
      clearInterval(intervalId);
      this.cleanupIntervals.delete(name);
    }

    this.isRunning = false;
    console.log('File cleanup service stopped');
  }

  /**
   * Perform scheduled cleanup tasks
   * @param {Object} options - Cleanup options
   */
  async performScheduledCleanup(options) {
    const results = {
      tempFiles: 0,
      orphanedFiles: 0,
      errors: []
    };

    try {
      // Clean up temporary files
      const tempResult = await fileStorage.cleanupTempFiles(options.tempFileMaxAge);
      if (tempResult.success) {
        results.tempFiles = tempResult.deletedCount;
      } else {
        results.errors.push(`Temp cleanup failed: ${tempResult.error}`);
      }

      // Clean up orphaned files
      const orphanedResult = await this.cleanupOrphanedFiles(options.orphanedFileMaxAge);
      results.orphanedFiles = orphanedResult.deletedCount;
      if (orphanedResult.errors.length > 0) {
        results.errors.push(...orphanedResult.errors);
      }

      // Log results if any files were cleaned up
      if (results.tempFiles > 0 || results.orphanedFiles > 0) {
        console.log(`Cleanup completed: ${results.tempFiles} temp files, ${results.orphanedFiles} orphaned files removed`);
      }

      if (results.errors.length > 0) {
        console.error('Cleanup errors:', results.errors);
      }

    } catch (error) {
      console.error('Scheduled cleanup error:', error);
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Clean up orphaned files (files not referenced in database)
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupOrphanedFiles(maxAgeHours = 168) {
    const results = {
      deletedCount: 0,
      errors: []
    };

    try {
      const categories = ['covers', 'videos', 'thumbnails', 'audio', 'documents'];
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      for (const category of categories) {
        try {
          const categoryPath = path.join(this.uploadPath, category);
          const files = await fs.readdir(categoryPath);

          for (const file of files) {
            const filePath = path.join(categoryPath, file);
            const stats = await fs.stat(filePath);

            // Check if file is old enough
            if (stats.mtime.getTime() < cutoffTime) {
              // Check if file is referenced in database
              const isReferenced = await this.isFileReferenced(category, file);
              
              if (!isReferenced) {
                await fs.unlink(filePath);
                results.deletedCount++;
                console.log(`Deleted orphaned file: ${category}/${file}`);
              }
            }
          }
        } catch (error) {
          results.errors.push(`Error cleaning ${category}: ${error.message}`);
        }
      }

    } catch (error) {
      results.errors.push(`Orphaned file cleanup error: ${error.message}`);
    }

    return results;
  }

  /**
   * Check if a file is referenced in the database
   * @param {string} category - File category
   * @param {string} filename - File name
   * @returns {Promise<boolean>} True if file is referenced
   */
  async isFileReferenced(category, filename) {
    try {
      // This is a simplified check - in a real implementation,
      // you would query the database to check if the file is referenced
      // in books, videos, or other records

      const databaseManager = require('../config/database');
      const db = databaseManager.getDatabase();

      let isReferenced = false;

      // Check books table for cover images
      if (category === 'covers') {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM books WHERE cover_image_path LIKE ?');
        const result = stmt.get(`%${filename}%`);
        isReferenced = result.count > 0;
      }

      // Check videos table for video files and thumbnails
      if (category === 'videos') {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM videos WHERE video_path LIKE ?');
        const result = stmt.get(`%${filename}%`);
        isReferenced = result.count > 0;
      }

      if (category === 'thumbnails') {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM videos WHERE thumbnail_path LIKE ?');
        const result = stmt.get(`%${filename}%`);
        isReferenced = result.count > 0;
      }

      // For audio files, you might check a voiceovers table or similar
      // For documents, you might check if they're attached to books

      return isReferenced;

    } catch (error) {
      console.error('Error checking file reference:', error);
      // If we can't check, assume it's referenced to be safe
      return true;
    }
  }

  /**
   * Clean up files for a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupUserFiles(userId) {
    const results = {
      deletedFiles: [],
      errors: []
    };

    try {
      const databaseManager = require('../config/database');
      const db = databaseManager.getDatabase();

      // Get all file paths associated with the user
      const userFiles = [];

      // Get book cover images
      const bookStmt = db.prepare('SELECT cover_image_path FROM books WHERE user_id = ? AND cover_image_path IS NOT NULL');
      const books = bookStmt.all(userId);
      userFiles.push(...books.map(book => book.cover_image_path));

      // Get video files and thumbnails
      const videoStmt = db.prepare('SELECT video_path, thumbnail_path FROM videos WHERE user_id = ? AND (video_path IS NOT NULL OR thumbnail_path IS NOT NULL)');
      const videos = videoStmt.all(userId);
      videos.forEach(video => {
        if (video.video_path) userFiles.push(video.video_path);
        if (video.thumbnail_path) userFiles.push(video.thumbnail_path);
      });

      // Delete all user files
      for (const filePath of userFiles) {
        try {
          const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath);
          await fs.unlink(fullPath);
          results.deletedFiles.push(filePath);
        } catch (error) {
          if (error.code !== 'ENOENT') { // Ignore if file doesn't exist
            results.errors.push(`Failed to delete ${filePath}: ${error.message}`);
          }
        }
      }

    } catch (error) {
      results.errors.push(`User file cleanup error: ${error.message}`);
    }

    return results;
  }

  /**
   * Clean up files for a specific video
   * @param {string} videoId - Video ID
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupVideoFiles(videoId) {
    const results = {
      deletedFiles: [],
      errors: []
    };

    try {
      const databaseManager = require('../config/database');
      const db = databaseManager.getDatabase();

      // Get video file paths
      const stmt = db.prepare('SELECT video_path, thumbnail_path FROM videos WHERE id = ?');
      const video = stmt.get(videoId);

      if (video) {
        const filesToDelete = [video.video_path, video.thumbnail_path].filter(Boolean);

        for (const filePath of filesToDelete) {
          try {
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath);
            await fs.unlink(fullPath);
            results.deletedFiles.push(filePath);
          } catch (error) {
            if (error.code !== 'ENOENT') {
              results.errors.push(`Failed to delete ${filePath}: ${error.message}`);
            }
          }
        }

        // Also clean up any temporary files for this video
        await this.cleanupVideoTempFiles(videoId);
      }

    } catch (error) {
      results.errors.push(`Video file cleanup error: ${error.message}`);
    }

    return results;
  }

  /**
   * Clean up temporary files for a specific video
   * @param {string} videoId - Video ID
   */
  async cleanupVideoTempFiles(videoId) {
    try {
      const tempPath = path.join(this.uploadPath, 'temp');
      const files = await fs.readdir(tempPath);
      
      const videoTempFiles = files.filter(file => file.includes(videoId));
      
      for (const file of videoTempFiles) {
        const filePath = path.join(tempPath, file);
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up video temp files:', error);
    }
  }

  /**
   * Get disk usage statistics
   * @returns {Promise<Object>} Disk usage information
   */
  async getDiskUsage() {
    try {
      const stats = await fileStorage.getStorageStats();
      
      let totalSize = 0;
      let totalFiles = 0;
      
      Object.values(stats).forEach(categoryStats => {
        if (!categoryStats.error) {
          totalSize += categoryStats.totalSize;
          totalFiles += categoryStats.fileCount;
        }
      });

      return {
        totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        totalFiles,
        categories: stats,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Failed to get disk usage: ${error.message}`);
    }
  }

  /**
   * Perform manual cleanup with specific criteria
   * @param {Object} criteria - Cleanup criteria
   * @param {number} criteria.tempFileMaxAge - Max age for temp files in hours
   * @param {number} criteria.orphanedFileMaxAge - Max age for orphaned files in hours
   * @param {boolean} criteria.cleanupThumbnails - Whether to clean up orphaned thumbnails
   * @param {boolean} criteria.dryRun - Whether to perform a dry run (don't actually delete)
   * @returns {Promise<Object>} Cleanup results
   */
  async performManualCleanup(criteria = {}) {
    const {
      tempFileMaxAge = 24,
      orphanedFileMaxAge = 168,
      cleanupThumbnails = true,
      dryRun = false
    } = criteria;

    const results = {
      tempFiles: { count: 0, files: [] },
      orphanedFiles: { count: 0, files: [] },
      thumbnails: { count: 0, files: [] },
      totalSize: 0,
      errors: []
    };

    try {
      // Clean temp files
      if (!dryRun) {
        const tempResult = await fileStorage.cleanupTempFiles(tempFileMaxAge);
        results.tempFiles.count = tempResult.deletedCount || 0;
      } else {
        // Dry run for temp files
        const tempFiles = await this.findOldTempFiles(tempFileMaxAge);
        results.tempFiles = tempFiles;
      }

      // Clean orphaned files
      const orphanedResult = await this.findOrphanedFiles(orphanedFileMaxAge, !dryRun);
      results.orphanedFiles = orphanedResult;

      // Clean orphaned thumbnails if requested
      if (cleanupThumbnails) {
        const thumbnailResult = await this.findOrphanedThumbnails(!dryRun);
        results.thumbnails = thumbnailResult;
      }

      // Calculate total size saved
      results.totalSize = results.tempFiles.files.reduce((sum, file) => sum + (file.size || 0), 0) +
                         results.orphanedFiles.files.reduce((sum, file) => sum + (file.size || 0), 0) +
                         results.thumbnails.files.reduce((sum, file) => sum + (file.size || 0), 0);

    } catch (error) {
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Find old temporary files
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {Promise<Object>} Found files information
   */
  async findOldTempFiles(maxAgeHours) {
    const result = { count: 0, files: [] };
    
    try {
      const tempPath = path.join(this.uploadPath, 'temp');
      const files = await fs.readdir(tempPath);
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(tempPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          result.files.push({
            name: file,
            path: filePath,
            size: stats.size,
            age: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60))
          });
          result.count++;
        }
      }
    } catch (error) {
      console.error('Error finding old temp files:', error);
    }

    return result;
  }

  /**
   * Find orphaned files
   * @param {number} maxAgeHours - Maximum age in hours
   * @param {boolean} deleteFiles - Whether to delete found files
   * @returns {Promise<Object>} Found files information
   */
  async findOrphanedFiles(maxAgeHours, deleteFiles = false) {
    const result = { count: 0, files: [] };
    
    try {
      const categories = ['covers', 'videos', 'audio', 'documents'];
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

      for (const category of categories) {
        const categoryPath = path.join(this.uploadPath, category);
        const files = await fs.readdir(categoryPath);

        for (const file of files) {
          const filePath = path.join(categoryPath, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            const isReferenced = await this.isFileReferenced(category, file);
            
            if (!isReferenced) {
              result.files.push({
                name: file,
                path: filePath,
                category,
                size: stats.size,
                age: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60))
              });
              result.count++;

              if (deleteFiles) {
                await fs.unlink(filePath);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error finding orphaned files:', error);
    }

    return result;
  }

  /**
   * Find orphaned thumbnails
   * @param {boolean} deleteFiles - Whether to delete found files
   * @returns {Promise<Object>} Found files information
   */
  async findOrphanedThumbnails(deleteFiles = false) {
    const result = { count: 0, files: [] };
    
    try {
      const thumbnailPath = path.join(this.uploadPath, 'thumbnails');
      const files = await fs.readdir(thumbnailPath);

      for (const file of files) {
        const filePath = path.join(thumbnailPath, file);
        const stats = await fs.stat(filePath);
        
        const isReferenced = await this.isFileReferenced('thumbnails', file);
        
        if (!isReferenced) {
          result.files.push({
            name: file,
            path: filePath,
            size: stats.size,
            age: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60))
          });
          result.count++;

          if (deleteFiles) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error finding orphaned thumbnails:', error);
    }

    return result;
  }

  /**
   * Get cleanup service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeIntervals: this.cleanupIntervals.size,
      uploadPath: this.uploadPath
    };
  }
}

module.exports = new FileCleanupService();