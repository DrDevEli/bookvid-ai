const fs = require('fs').promises;
const path = require('path');
const fileStorage = require('../fileStorage');

describe('FileStorageService', () => {
  const testUploadPath = process.env.UPLOAD_PATH;
  
  beforeAll(async () => {
    await fileStorage.initializeDirectories();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const tempDir = path.join(testUploadPath, 'temp');
      const files = await fs.readdir(tempDir);
      for (const file of files) {
        await fs.unlink(path.join(tempDir, file));
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initializeDirectories', () => {
    it('should create all required directories', async () => {
      await fileStorage.initializeDirectories();
      
      const expectedDirs = ['covers', 'videos', 'thumbnails', 'audio', 'temp', 'documents'];
      
      for (const dir of expectedDirs) {
        const dirPath = path.join(testUploadPath, dir);
        const stats = await fs.stat(dirPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filenames', () => {
      const originalName = 'test-file.jpg';
      const filename1 = fileStorage.generateUniqueFilename(originalName);
      const filename2 = fileStorage.generateUniqueFilename(originalName);
      
      expect(filename1).not.toBe(filename2);
      expect(filename1).toMatch(/^\d+_[a-f0-9]+\.jpg$/);
      expect(filename2).toMatch(/^\d+_[a-f0-9]+\.jpg$/);
    });

    it('should preserve file extension', () => {
      const testCases = [
        { input: 'test.jpg', expectedExt: '.jpg' },
        { input: 'document.pdf', expectedExt: '.pdf' },
        { input: 'video.mp4', expectedExt: '.mp4' },
        { input: 'noextension', expectedExt: '' }
      ];

      testCases.forEach(({ input, expectedExt }) => {
        const result = fileStorage.generateUniqueFilename(input);
        expect(path.extname(result)).toBe(expectedExt);
      });
    });
  });

  describe('validateFile', () => {
    it('should validate file size', () => {
      const validFile = {
        size: 1024 * 1024, // 1MB
        mimetype: 'image/jpeg'
      };
      
      const invalidFile = {
        size: 100 * 1024 * 1024, // 100MB (exceeds limit)
        mimetype: 'image/jpeg'
      };

      const validResult = fileStorage.validateFile(validFile, 'images');
      const invalidResult = fileStorage.validateFile(invalidFile, 'images');

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0]).toContain('File size exceeds');
    });

    it('should validate MIME types', () => {
      const validImageFile = {
        size: 1024,
        mimetype: 'image/jpeg'
      };
      
      const invalidImageFile = {
        size: 1024,
        mimetype: 'application/pdf'
      };

      const validResult = fileStorage.validateFile(validImageFile, 'images');
      const invalidResult = fileStorage.validateFile(invalidImageFile, 'images');

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0]).toContain('File type application/pdf is not allowed');
    });

    it('should validate different file categories', () => {
      const testCases = [
        { mimetype: 'image/jpeg', category: 'images', shouldBeValid: true },
        { mimetype: 'video/mp4', category: 'videos', shouldBeValid: true },
        { mimetype: 'audio/mp3', category: 'audio', shouldBeValid: true },
        { mimetype: 'application/pdf', category: 'documents', shouldBeValid: true },
        { mimetype: 'image/jpeg', category: 'videos', shouldBeValid: false }
      ];

      testCases.forEach(({ mimetype, category, shouldBeValid }) => {
        const file = { size: 1024, mimetype };
        const result = fileStorage.validateFile(file, category);
        expect(result.isValid).toBe(shouldBeValid);
      });
    });
  });

  describe('moveFile', () => {
    it('should move file from temp to permanent location', async () => {
      // Create a test file in temp directory
      const tempFilename = 'test-temp-file.txt';
      const tempPath = path.join(testUploadPath, 'temp', tempFilename);
      const testContent = 'Test file content';
      
      await fs.writeFile(tempPath, testContent);
      
      // Move file to covers directory
      const result = await fileStorage.moveFile(tempPath, 'covers', 'moved-file.txt');
      
      expect(result.success).toBe(true);
      expect(result.relativePath).toBe('covers/moved-file.txt');
      
      // Verify file was moved
      const movedPath = path.join(testUploadPath, 'covers', 'moved-file.txt');
      const movedContent = await fs.readFile(movedPath, 'utf8');
      expect(movedContent).toBe(testContent);
      
      // Verify original file no longer exists
      await expect(fs.access(tempPath)).rejects.toThrow();
      
      // Clean up
      await fs.unlink(movedPath);
    });

    it('should handle move errors gracefully', async () => {
      const nonExistentPath = path.join(testUploadPath, 'temp', 'non-existent.txt');
      
      const result = await fileStorage.moveFile(nonExistentPath, 'covers');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      // Create a test file
      const testFilename = 'test-delete-file.txt';
      const testPath = path.join(testUploadPath, 'temp', testFilename);
      
      await fs.writeFile(testPath, 'Test content');
      
      // Delete the file
      const result = await fileStorage.deleteFile(testPath);
      
      expect(result.success).toBe(true);
      
      // Verify file no longer exists
      await expect(fs.access(testPath)).rejects.toThrow();
    });

    it('should handle deletion of non-existent file', async () => {
      const nonExistentPath = path.join(testUploadPath, 'temp', 'non-existent.txt');
      
      const result = await fileStorage.deleteFile(nonExistentPath);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getFileInfo', () => {
    it('should return file information for existing file', async () => {
      // Create a test file
      const testFilename = 'test-info-file.txt';
      const testPath = path.join(testUploadPath, 'temp', testFilename);
      const testContent = 'Test file content';
      
      await fs.writeFile(testPath, testContent);
      
      const info = await fileStorage.getFileInfo(testPath);
      
      expect(info.exists).toBe(true);
      expect(info.size).toBe(testContent.length);
      expect(info.created).toBeDefined();
      expect(info.modified).toBeDefined();
      expect(info.path).toBe(testPath);
      
      // Clean up
      await fs.unlink(testPath);
    });

    it('should handle non-existent file', async () => {
      const nonExistentPath = path.join(testUploadPath, 'temp', 'non-existent.txt');
      
      const info = await fileStorage.getFileInfo(nonExistentPath);
      
      expect(info.exists).toBe(false);
      expect(info.error).toBeDefined();
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up old temporary files', async () => {
      // Create test files with different ages
      const oldFilename = 'old-temp-file.txt';
      const newFilename = 'new-temp-file.txt';
      const oldPath = path.join(testUploadPath, 'temp', oldFilename);
      const newPath = path.join(testUploadPath, 'temp', newFilename);
      
      await fs.writeFile(oldPath, 'Old file');
      await fs.writeFile(newPath, 'New file');
      
      // Modify the old file's timestamp to be older than 24 hours
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      await fs.utimes(oldPath, oldTime, oldTime);
      
      const result = await fileStorage.cleanupTempFiles(24);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThanOrEqual(1);
      
      // Verify old file was deleted
      await expect(fs.access(oldPath)).rejects.toThrow();
      
      // Verify new file still exists
      await expect(fs.access(newPath)).resolves.not.toThrow();
      
      // Clean up
      try {
        await fs.unlink(newPath);
      } catch (error) {
        // File may have been cleaned up already
      }
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      // Create test files in different directories
      const testFiles = [
        { dir: 'covers', name: 'test-cover.jpg', content: 'cover data' },
        { dir: 'videos', name: 'test-video.mp4', content: 'video data' },
        { dir: 'audio', name: 'test-audio.mp3', content: 'audio data' }
      ];

      for (const { dir, name, content } of testFiles) {
        const dirPath = path.join(testUploadPath, dir);
        await fs.mkdir(dirPath, { recursive: true });
        const filePath = path.join(testUploadPath, dir, name);
        await fs.writeFile(filePath, content);
      }

      const stats = await fileStorage.getStorageStats();

      expect(stats).toHaveProperty('covers');
      expect(stats).toHaveProperty('videos');
      expect(stats).toHaveProperty('audio');
      
      expect(stats.covers.fileCount).toBeGreaterThanOrEqual(1);
      expect(stats.videos.fileCount).toBeGreaterThanOrEqual(1);
      expect(stats.audio.fileCount).toBeGreaterThanOrEqual(1);
      
      expect(stats.covers.totalSize).toBeGreaterThan(0);
      expect(stats.videos.totalSize).toBeGreaterThan(0);
      expect(stats.audio.totalSize).toBeGreaterThan(0);

      // Clean up
      for (const { dir, name } of testFiles) {
        const filePath = path.join(testUploadPath, dir, name);
        await fs.unlink(filePath);
      }
    });
  });
});