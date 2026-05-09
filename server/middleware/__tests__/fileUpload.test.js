const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const FileUploadMiddleware = require('../fileUpload');

// Mock the file storage and validation utilities
jest.mock('../../utils/fileStorage', () => ({
  createUploadMiddleware: jest.fn(),
  deleteFile: jest.fn(),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif'],
    videos: ['video/mp4', 'video/avi'],
    audio: ['audio/mp3', 'audio/wav']
  }
}));

jest.mock('../../utils/fileValidation', () => ({
  validateFile: jest.fn()
}));

const fileStorage = require('../../utils/fileStorage');
const fileValidation = require('../../utils/fileValidation');

describe('FileUploadMiddleware', () => {
  let app;
  const testUploadPath = process.env.UPLOAD_PATH;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe('bookCover middleware', () => {
    beforeEach(() => {
      // Mock multer middleware
      const mockMulterMiddleware = (req, res, next) => {
        req.file = global.testUtils.createMockFile({
          originalname: 'book-cover.jpg',
          mimetype: 'image/jpeg',
          path: path.join(testUploadPath, 'covers', 'book-cover-123.jpg')
        });
        next();
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);
      fileValidation.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });
    });

    it('should handle book cover upload successfully', async () => {
      app.post('/upload-cover', FileUploadMiddleware.bookCover(), (req, res) => {
        res.json({ 
          success: true, 
          file: req.file,
          warnings: req.fileWarnings 
        });
      });

      const response = await request(app)
        .post('/upload-cover')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      expect(fileStorage.createUploadMiddleware).toHaveBeenCalledWith({
        category: 'covers',
        maxFiles: 1,
        fileFilter: expect.any(Function)
      });
    });

    it('should reject non-image files for book covers', async () => {
      const mockMulterMiddleware = (req, res, next) => {
        const error = new Error('Only image files are allowed for book covers');
        next(error);
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);

      app.post('/upload-cover', FileUploadMiddleware.bookCover(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/upload-cover')
        .expect(400);

      expect(response.body.error).toBe('File upload failed');
      expect(response.body.details).toBe('Only image files are allowed for book covers');
    });

    it('should handle file validation errors', async () => {
      const mockMulterMiddleware = (req, res, next) => {
        req.file = global.testUtils.createMockFile();
        next();
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);
      fileValidation.validateFile.mockResolvedValue({
        isValid: false,
        errors: ['File is corrupted', 'Invalid file signature'],
        warnings: []
      });
      fileStorage.deleteFile.mockResolvedValue({ success: true });

      app.post('/upload-cover', FileUploadMiddleware.bookCover(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/upload-cover')
        .expect(400);

      expect(response.body.error).toBe('File validation failed');
      expect(response.body.details).toEqual(['File is corrupted', 'Invalid file signature']);
      expect(fileStorage.deleteFile).toHaveBeenCalled();
    });

    it('should handle file validation warnings', async () => {
      const mockMulterMiddleware = (req, res, next) => {
        req.file = global.testUtils.createMockFile();
        next();
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);
      fileValidation.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['File size is large', 'Consider optimizing']
      });

      app.post('/upload-cover', FileUploadMiddleware.bookCover(), (req, res) => {
        res.json({ 
          success: true,
          warnings: req.fileWarnings 
        });
      });

      const response = await request(app)
        .post('/upload-cover')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.warnings).toEqual(['File size is large', 'Consider optimizing']);
    });
  });

  describe('document middleware', () => {
    beforeEach(() => {
      const mockMulterMiddleware = (req, res, next) => {
        req.file = global.testUtils.createMockFile({
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
          path: path.join(testUploadPath, 'documents', 'document-123.pdf')
        });
        next();
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);
      fileValidation.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });
    });

    it('should handle document upload successfully', async () => {
      app.post('/upload-document', FileUploadMiddleware.document(), (req, res) => {
        res.json({ success: true, file: req.file });
      });

      const response = await request(app)
        .post('/upload-document')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      expect(fileStorage.createUploadMiddleware).toHaveBeenCalledWith({
        category: 'documents',
        maxFiles: 1,
        fileFilter: expect.any(Function)
      });
    });

    it('should reject invalid document types', async () => {
      const mockMulterMiddleware = (req, res, next) => {
        const error = new Error('Only PDF, TXT, DOC, and DOCX files are allowed');
        next(error);
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);

      app.post('/upload-document', FileUploadMiddleware.document(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/upload-document')
        .expect(400);

      expect(response.body.error).toBe('Document upload failed');
      expect(response.body.details).toBe('Only PDF, TXT, DOC, and DOCX files are allowed');
    });
  });

  describe('media middleware', () => {
    beforeEach(() => {
      const mockMulterMiddleware = (req, res, next) => {
        req.files = [
          global.testUtils.createMockFile({
            originalname: 'image.jpg',
            mimetype: 'image/jpeg'
          }),
          global.testUtils.createMockFile({
            originalname: 'video.mp4',
            mimetype: 'video/mp4'
          })
        ];
        next();
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);
      fileValidation.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });
    });

    it('should handle multiple media files upload', async () => {
      app.post('/upload-media', FileUploadMiddleware.media(), (req, res) => {
        res.json({ 
          success: true, 
          files: req.files,
          fileCount: req.files.length 
        });
      });

      const response = await request(app)
        .post('/upload-media')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.fileCount).toBe(2);
      expect(fileStorage.createUploadMiddleware).toHaveBeenCalledWith({
        category: 'temp',
        maxFiles: 5,
        fileFilter: expect.any(Function)
      });
    });

    it('should handle mixed validation results', async () => {
      const mockMulterMiddleware = (req, res, next) => {
        req.files = [
          global.testUtils.createMockFile({
            originalname: 'valid.jpg',
            mimetype: 'image/jpeg'
          }),
          global.testUtils.createMockFile({
            originalname: 'invalid.jpg',
            mimetype: 'image/jpeg'
          })
        ];
        next();
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);
      
      // Mock validation to return different results for different files
      fileValidation.validateFile
        .mockResolvedValueOnce({
          isValid: true,
          errors: [],
          warnings: ['File is large']
        })
        .mockResolvedValueOnce({
          isValid: false,
          errors: ['File is corrupted'],
          warnings: []
        });

      fileStorage.deleteFile.mockResolvedValue({ success: true });

      app.post('/upload-media', FileUploadMiddleware.media(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/upload-media')
        .expect(400);

      expect(response.body.error).toBe('Some files failed validation');
      expect(response.body.invalidFiles).toHaveLength(1);
      expect(response.body.invalidFiles[0].filename).toBe('invalid.jpg');
      expect(response.body.invalidFiles[0].errors).toEqual(['File is corrupted']);
    });
  });

  describe('generic middleware', () => {
    it('should handle custom options', async () => {
      const mockMulterMiddleware = (req, res, next) => {
        req.file = global.testUtils.createMockFile({
          originalname: 'custom.txt',
          mimetype: 'text/plain'
        });
        next();
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);
      fileValidation.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const customOptions = {
        category: 'custom',
        maxFiles: 3,
        allowedTypes: ['text/plain', 'text/csv'],
        customValidation: jest.fn().mockResolvedValue({ isValid: true })
      };

      app.post('/upload-custom', FileUploadMiddleware.generic(customOptions), (req, res) => {
        res.json({ success: true, file: req.file });
      });

      const response = await request(app)
        .post('/upload-custom')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(fileStorage.createUploadMiddleware).toHaveBeenCalledWith({
        category: 'custom',
        maxFiles: 3,
        fileFilter: expect.any(Function)
      });
      expect(customOptions.customValidation).toHaveBeenCalled();
    });

    it('should handle custom validation failures', async () => {
      const mockMulterMiddleware = (req, res, next) => {
        req.file = global.testUtils.createMockFile();
        next();
      };

      fileStorage.createUploadMiddleware.mockReturnValue(mockMulterMiddleware);
      fileValidation.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const customValidation = jest.fn().mockResolvedValue({
        isValid: false,
        error: 'Custom validation failed'
      });

      fileStorage.deleteFile.mockResolvedValue({ success: true });

      app.post('/upload-custom', 
        FileUploadMiddleware.generic({ customValidation }), 
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app)
        .post('/upload-custom')
        .expect(400);

      expect(response.body.error).toBe('File validation failed');
      expect(response.body.details).toContain('Custom validation failed');
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle file size limit errors', async () => {
      app.post('/upload', (req, res, next) => {
        const error = new Error('File too large');
        error.code = 'LIMIT_FILE_SIZE';
        next(error);
      }, FileUploadMiddleware.errorHandler(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/upload')
        .expect(400);

      expect(response.body.error).toBe('File too large');
      expect(response.body.details).toContain('Maximum file size');
    });

    it('should handle file count limit errors', async () => {
      app.post('/upload', (req, res, next) => {
        const error = new Error('Too many files');
        error.code = 'LIMIT_FILE_COUNT';
        next(error);
      }, FileUploadMiddleware.errorHandler(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/upload')
        .expect(400);

      expect(response.body.error).toBe('Too many files');
      expect(response.body.details).toBe('Maximum number of files exceeded');
    });

    it('should handle unexpected file field errors', async () => {
      app.post('/upload', (req, res, next) => {
        const error = new Error('Unexpected field');
        error.code = 'LIMIT_UNEXPECTED_FILE';
        next(error);
      }, FileUploadMiddleware.errorHandler(), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/upload')
        .expect(400);

      expect(response.body.error).toBe('Unexpected file field');
      expect(response.body.details).toBe('File uploaded to unexpected field');
    });

    it('should pass through other errors', async () => {
      const mockErrorHandler = jest.fn();

      app.post('/upload', (req, res, next) => {
        const error = new Error('Some other error');
        next(error);
      }, FileUploadMiddleware.errorHandler(), mockErrorHandler);

      await request(app)
        .post('/upload');

      // The error should be passed through to the next middleware
      // Since we're not actually setting up a full Express app, we can't easily test this
      expect(mockErrorHandler).toHaveBeenCalled();
    });
  });
});