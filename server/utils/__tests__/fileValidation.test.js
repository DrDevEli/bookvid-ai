const fs = require('fs').promises;
const path = require('path');
const fileValidation = require('../fileValidation');

describe('FileValidationService', () => {
  const testUploadPath = process.env.UPLOAD_PATH;

  describe('validateExtension', () => {
    it('should allow safe file extensions', () => {
      const safeExtensions = ['.jpg', '.png', '.pdf', '.txt', '.mp4', '.mp3'];
      
      safeExtensions.forEach(ext => {
        const result = fileValidation.validateExtension(`test${ext}`);
        expect(result.isValid).toBe(true);
      });
    });

    it('should block dangerous file extensions', () => {
      const dangerousExtensions = ['.exe', '.bat', '.php', '.js', '.vbs', '.scr'];
      
      dangerousExtensions.forEach(ext => {
        const result = fileValidation.validateExtension(`malicious${ext}`);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('not allowed for security reasons');
      });
    });

    it('should be case insensitive', () => {
      const result1 = fileValidation.validateExtension('test.EXE');
      const result2 = fileValidation.validateExtension('test.exe');
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('validateFilename', () => {
    it('should allow valid filenames', () => {
      const validFilenames = [
        'document.pdf',
        'image_123.jpg',
        'my-file.txt',
        'file.with.dots.pdf'
      ];

      validFilenames.forEach(filename => {
        const result = fileValidation.validateFilename(filename);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject filenames that are too long', () => {
      const longFilename = 'a'.repeat(300) + '.txt';
      
      const result = fileValidation.validateFilename(longFilename);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Filename too long'));
    });

    it('should reject filenames with null bytes', () => {
      const filenameWithNull = 'test\0file.txt';
      
      const result = fileValidation.validateFilename(filenameWithNull);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename contains null bytes');
    });

    it('should reject path traversal attempts', () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        'test/../file.txt',
        'file\\with\\backslashes.txt',
        'file/with/slashes.txt'
      ];

      maliciousFilenames.forEach(filename => {
        const result = fileValidation.validateFilename(filename);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Filename contains invalid path characters');
      });
    });

    it('should reject filenames with control characters', () => {
      const filenameWithControl = 'test\x01file.txt';
      
      const result = fileValidation.validateFilename(filenameWithControl);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Filename contains control characters');
    });

    it('should reject reserved Windows names', () => {
      const reservedNames = ['CON.txt', 'PRN.pdf', 'AUX.jpg', 'NUL.doc'];

      reservedNames.forEach(filename => {
        const result = fileValidation.validateFilename(filename);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Filename uses reserved system name');
      });
    });
  });

  describe('validateFileSignature', () => {
    beforeEach(async () => {
      // Ensure temp directory exists
      const tempDir = path.join(testUploadPath, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
    });

    it('should validate JPEG file signature', async () => {
      const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const testFilePath = path.join(testUploadPath, 'temp', 'test.jpg');
      
      await fs.writeFile(testFilePath, jpegSignature);
      
      const result = await fileValidation.validateFileSignature(testFilePath, 'image/jpeg');
      
      expect(result.isValid).toBe(true);
      
      // Clean up
      await fs.unlink(testFilePath);
    });

    it('should validate PNG file signature', async () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const testFilePath = path.join(testUploadPath, 'temp', 'test.png');
      
      await fs.writeFile(testFilePath, pngSignature);
      
      const result = await fileValidation.validateFileSignature(testFilePath, 'image/png');
      
      expect(result.isValid).toBe(true);
      
      // Clean up
      await fs.unlink(testFilePath);
    });

    it('should reject files with wrong signature', async () => {
      const wrongSignature = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const testFilePath = path.join(testUploadPath, 'temp', 'fake.jpg');
      
      await fs.writeFile(testFilePath, wrongSignature);
      
      const result = await fileValidation.validateFileSignature(testFilePath, 'image/jpeg');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File signature does not match');
      
      // Clean up
      await fs.unlink(testFilePath);
    });

    it('should handle unsupported file types gracefully', async () => {
      const testFilePath = path.join(testUploadPath, 'temp', 'test.unknown');
      
      await fs.writeFile(testFilePath, 'test content');
      
      const result = await fileValidation.validateFileSignature(testFilePath, 'application/unknown');
      
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('No signature validation available');
      
      // Clean up
      await fs.unlink(testFilePath);
    });
  });

  describe('validateFile', () => {
    it('should perform comprehensive file validation', async () => {
      const validFile = {
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const result = await fileValidation.validateFile(validFile);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accumulate multiple validation errors', async () => {
      const invalidFile = {
        originalname: '../../../malicious.exe',
        mimetype: 'application/x-executable',
        size: 1024
      };

      const result = await fileValidation.validateFile(invalidFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(expect.stringContaining('invalid path characters'));
      expect(result.errors).toContain(expect.stringContaining('not allowed for security reasons'));
    });

    it('should add warnings for large text files', async () => {
      const largeTextFile = {
        originalname: 'large-text.txt',
        mimetype: 'text/plain',
        size: 15 * 1024 * 1024 // 15MB
      };

      const result = await fileValidation.validateFile(largeTextFile);
      
      expect(result.warnings).toContain(expect.stringContaining('Large text file detected'));
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize dangerous characters', () => {
      const dangerousFilename = 'file<>:"/\\|?*name.txt';
      const sanitized = fileValidation.sanitizeFilename(dangerousFilename);
      
      expect(sanitized).toBe('file_________name.txt');
    });

    it('should handle empty filenames', () => {
      const emptyFilename = '';
      const sanitized = fileValidation.sanitizeFilename(emptyFilename);
      
      expect(sanitized).toBe('unnamed_file');
    });

    it('should truncate long filenames', () => {
      const longFilename = 'a'.repeat(300) + '.txt';
      const sanitized = fileValidation.sanitizeFilename(longFilename);
      
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toEndWith('.txt');
    });

    it('should remove leading and trailing dots', () => {
      const filename = '...test-file...txt...';
      const sanitized = fileValidation.sanitizeFilename(filename);
      
      expect(sanitized).toBe('test-file.txt');
    });
  });

  describe('file type detection', () => {
    it('should correctly identify image files', () => {
      const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      
      imageMimeTypes.forEach(mimetype => {
        expect(fileValidation.isImage(mimetype)).toBe(true);
      });
      
      expect(fileValidation.isImage('video/mp4')).toBe(false);
    });

    it('should correctly identify video files', () => {
      const videoMimeTypes = ['video/mp4', 'video/avi', 'video/mov'];
      
      videoMimeTypes.forEach(mimetype => {
        expect(fileValidation.isVideo(mimetype)).toBe(true);
      });
      
      expect(fileValidation.isVideo('image/jpeg')).toBe(false);
    });

    it('should correctly identify audio files', () => {
      const audioMimeTypes = ['audio/mp3', 'audio/wav', 'audio/aac'];
      
      audioMimeTypes.forEach(mimetype => {
        expect(fileValidation.isAudio(mimetype)).toBe(true);
      });
      
      expect(fileValidation.isAudio('image/jpeg')).toBe(false);
    });

    it('should categorize files correctly', () => {
      const testCases = [
        { mimetype: 'image/jpeg', expected: 'images' },
        { mimetype: 'video/mp4', expected: 'videos' },
        { mimetype: 'audio/mp3', expected: 'audio' },
        { mimetype: 'application/pdf', expected: 'documents' },
        { mimetype: 'text/plain', expected: 'documents' },
        { mimetype: 'application/unknown', expected: 'temp' }
      ];

      testCases.forEach(({ mimetype, expected }) => {
        expect(fileValidation.getFileCategory(mimetype)).toBe(expected);
      });
    });
  });
});