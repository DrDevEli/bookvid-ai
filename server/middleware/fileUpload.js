const fileStorage = require('../utils/fileStorage');
const fileValidation = require('../utils/fileValidation');
const path = require('path');

/**
 * File upload middleware factory
 */
class FileUploadMiddleware {
  /**
   * Create upload middleware for book covers
   */
  static bookCover() {
    return async (req, res, next) => {
      const upload = fileStorage.createUploadMiddleware({
        category: 'covers',
        maxFiles: 1,
        fileFilter: (req, file, cb) => {
          // Only allow images for book covers
          if (!fileValidation.isImage(file.mimetype)) {
            return cb(new Error('Only image files are allowed for book covers'), false);
          }
          cb(null, true);
        }
      });

      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            error: 'File upload failed',
            details: err.message
          });
        }

        // Validate uploaded file
        if (req.file) {
          const validation = await fileValidation.validateFile(req.file, req.file.path);
          if (!validation.isValid) {
            // Delete invalid file
            await fileStorage.deleteFile(req.file.path);
            return res.status(400).json({
              error: 'File validation failed',
              details: validation.errors
            });
          }

          // Add validation warnings to request
          if (validation.warnings.length > 0) {
            req.fileWarnings = validation.warnings;
          }
        }

        next();
      });
    };
  }

  /**
   * Create upload middleware for documents (books, scripts)
   */
  static document() {
    return async (req, res, next) => {
      const upload = fileStorage.createUploadMiddleware({
        category: 'documents',
        maxFiles: 1,
        fileFilter: (req, file, cb) => {
          const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ];
          
          if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only PDF, TXT, DOC, and DOCX files are allowed'), false);
          }
          cb(null, true);
        }
      });

      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            error: 'Document upload failed',
            details: err.message
          });
        }

        if (req.file) {
          const validation = await fileValidation.validateFile(req.file, req.file.path);
          if (!validation.isValid) {
            await fileStorage.deleteFile(req.file.path);
            return res.status(400).json({
              error: 'Document validation failed',
              details: validation.errors
            });
          }

          if (validation.warnings.length > 0) {
            req.fileWarnings = validation.warnings;
          }
        }

        next();
      });
    };
  }

  /**
   * Create upload middleware for media files (images, videos, audio)
   */
  static media() {
    return async (req, res, next) => {
      const upload = fileStorage.createUploadMiddleware({
        category: 'temp', // Upload to temp first, then move based on processing
        maxFiles: 5,
        fileFilter: (req, file, cb) => {
          const allowedTypes = [
            ...fileStorage.allowedMimeTypes.images,
            ...fileStorage.allowedMimeTypes.videos,
            ...fileStorage.allowedMimeTypes.audio
          ];
          
          if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only image, video, and audio files are allowed'), false);
          }
          cb(null, true);
        }
      });

      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            error: 'Media upload failed',
            details: err.message
          });
        }

        // Validate all uploaded files
        if (req.files && req.files.length > 0) {
          const validationPromises = req.files.map(file => 
            fileValidation.validateFile(file, file.path)
          );
          
          const validations = await Promise.all(validationPromises);
          const invalidFiles = [];
          const allWarnings = [];

          for (let i = 0; i < validations.length; i++) {
            const validation = validations[i];
            if (!validation.isValid) {
              invalidFiles.push({
                filename: req.files[i].originalname,
                errors: validation.errors
              });
              // Delete invalid file
              await fileStorage.deleteFile(req.files[i].path);
            } else if (validation.warnings.length > 0) {
              allWarnings.push(...validation.warnings);
            }
          }

          if (invalidFiles.length > 0) {
            return res.status(400).json({
              error: 'Some files failed validation',
              invalidFiles
            });
          }

          if (allWarnings.length > 0) {
            req.fileWarnings = allWarnings;
          }

          // Filter out deleted invalid files
          req.files = req.files.filter((_, index) => validations[index].isValid);
        }

        next();
      });
    };
  }

  /**
   * Generic upload middleware
   */
  static generic(options = {}) {
    const {
      category = 'temp',
      maxFiles = 1,
      allowedTypes = null,
      customValidation = null
    } = options;

    return async (req, res, next) => {
      const upload = fileStorage.createUploadMiddleware({
        category,
        maxFiles,
        fileFilter: (req, file, cb) => {
          if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
            return cb(new Error(`File type ${file.mimetype} is not allowed`), false);
          }
          cb(null, true);
        }
      });

      upload(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            error: 'File upload failed',
            details: err.message
          });
        }

        // Handle single file
        if (req.file) {
          const validation = await fileValidation.validateFile(req.file, req.file.path);
          
          // Apply custom validation if provided
          if (customValidation && validation.isValid) {
            const customResult = await customValidation(req.file);
            if (!customResult.isValid) {
              validation.isValid = false;
              validation.errors.push(...(customResult.errors || [customResult.error]));
            }
          }

          if (!validation.isValid) {
            await fileStorage.deleteFile(req.file.path);
            return res.status(400).json({
              error: 'File validation failed',
              details: validation.errors
            });
          }

          if (validation.warnings.length > 0) {
            req.fileWarnings = validation.warnings;
          }
        }

        // Handle multiple files
        if (req.files && req.files.length > 0) {
          const validationPromises = req.files.map(async file => {
            const validation = await fileValidation.validateFile(file, file.path);
            
            if (customValidation && validation.isValid) {
              const customResult = await customValidation(file);
              if (!customResult.isValid) {
                validation.isValid = false;
                validation.errors.push(...(customResult.errors || [customResult.error]));
              }
            }
            
            return validation;
          });
          
          const validations = await Promise.all(validationPromises);
          const invalidFiles = [];
          const allWarnings = [];

          for (let i = 0; i < validations.length; i++) {
            const validation = validations[i];
            if (!validation.isValid) {
              invalidFiles.push({
                filename: req.files[i].originalname,
                errors: validation.errors
              });
              await fileStorage.deleteFile(req.files[i].path);
            } else if (validation.warnings.length > 0) {
              allWarnings.push(...validation.warnings);
            }
          }

          if (invalidFiles.length > 0) {
            return res.status(400).json({
              error: 'Some files failed validation',
              invalidFiles
            });
          }

          if (allWarnings.length > 0) {
            req.fileWarnings = allWarnings;
          }

          req.files = req.files.filter((_, index) => validations[index].isValid);
        }

        next();
      });
    };
  }

  /**
   * Error handling middleware for file uploads
   */
  static errorHandler() {
    return (err, req, res, next) => {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          details: `Maximum file size is ${fileStorage.maxFileSize / (1024 * 1024)}MB`
        });
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Too many files',
          details: 'Maximum number of files exceeded'
        });
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: 'Unexpected file field',
          details: 'File uploaded to unexpected field'
        });
      }

      // Pass other errors to default error handler
      next(err);
    };
  }
}

module.exports = FileUploadMiddleware;