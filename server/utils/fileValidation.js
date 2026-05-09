const path = require('path');
const fs = require('fs').promises;

/**
 * File validation utilities for security and integrity checks
 */
class FileValidationService {
  constructor() {
    // File signature magic numbers for validation
    this.fileSignatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
      'audio/mp3': [0x49, 0x44, 0x33], // ID3
      'application/pdf': [0x25, 0x50, 0x44, 0x46]
    };

    // Dangerous file extensions to block
    this.dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1', '.py', '.rb', '.pl'
    ];

    // Maximum filename length
    this.maxFilenameLength = 255;
  }

  /**
   * Validate file extension against dangerous extensions
   */
  validateExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    if (this.dangerousExtensions.includes(ext)) {
      return {
        isValid: false,
        error: `File extension ${ext} is not allowed for security reasons`
      };
    }

    return { isValid: true };
  }

  /**
   * Validate filename for security issues
   */
  validateFilename(filename) {
    const errors = [];

    // Check filename length
    if (filename.length > this.maxFilenameLength) {
      errors.push(`Filename too long (max ${this.maxFilenameLength} characters)`);
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      errors.push('Filename contains null bytes');
    }

    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      errors.push('Filename contains invalid path characters');
    }

    // Check for control characters
    if (/[\x00-\x1f\x7f-\x9f]/.test(filename)) {
      errors.push('Filename contains control characters');
    }

    // Check for reserved Windows names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = path.parse(filename).name.toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      errors.push('Filename uses reserved system name');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file signature (magic numbers)
   */
  async validateFileSignature(filePath, expectedMimeType) {
    try {
      const buffer = Buffer.alloc(16); // Read first 16 bytes
      const fileHandle = await fs.open(filePath, 'r');
      await fileHandle.read(buffer, 0, 16, 0);
      await fileHandle.close();

      const signature = this.fileSignatures[expectedMimeType];
      if (!signature) {
        return { isValid: true, warning: 'No signature validation available for this file type' };
      }

      // Check if file starts with expected signature
      for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) {
          return {
            isValid: false,
            error: `File signature does not match expected type ${expectedMimeType}`
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate file signature: ${error.message}`
      };
    }
  }

  /**
   * Comprehensive file validation
   */
  async validateFile(file, filePath = null) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate filename
    const filenameValidation = this.validateFilename(file.originalname || file.filename);
    if (!filenameValidation.isValid) {
      validationResults.isValid = false;
      validationResults.errors.push(...filenameValidation.errors);
    }

    // Validate extension
    const extensionValidation = this.validateExtension(file.originalname || file.filename);
    if (!extensionValidation.isValid) {
      validationResults.isValid = false;
      validationResults.errors.push(extensionValidation.error);
    }

    // Validate file signature if file path is provided
    if (filePath && file.mimetype) {
      const signatureValidation = await this.validateFileSignature(filePath, file.mimetype);
      if (!signatureValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(signatureValidation.error);
      } else if (signatureValidation.warning) {
        validationResults.warnings.push(signatureValidation.warning);
      }
    }

    // Additional MIME type validation
    if (file.mimetype && file.mimetype.startsWith('text/') && file.size > 10 * 1024 * 1024) {
      validationResults.warnings.push('Large text file detected - verify content is appropriate');
    }

    return validationResults;
  }

  /**
   * Sanitize filename for safe storage
   */
  sanitizeFilename(filename) {
    // Remove or replace dangerous characters
    let sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace dangerous chars with underscore
      .replace(/\.+/g, '.') // Replace multiple dots with single dot
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .trim();

    // Ensure filename is not empty
    if (!sanitized) {
      sanitized = 'unnamed_file';
    }

    // Truncate if too long
    if (sanitized.length > this.maxFilenameLength) {
      const ext = path.extname(sanitized);
      const nameWithoutExt = path.parse(sanitized).name;
      const maxNameLength = this.maxFilenameLength - ext.length;
      sanitized = nameWithoutExt.substring(0, maxNameLength) + ext;
    }

    return sanitized;
  }

  /**
   * Check if file is an image
   */
  isImage(mimetype) {
    return mimetype && mimetype.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  isVideo(mimetype) {
    return mimetype && mimetype.startsWith('video/');
  }

  /**
   * Check if file is audio
   */
  isAudio(mimetype) {
    return mimetype && mimetype.startsWith('audio/');
  }

  /**
   * Get file category based on MIME type
   */
  getFileCategory(mimetype) {
    if (this.isImage(mimetype)) return 'images';
    if (this.isVideo(mimetype)) return 'videos';
    if (this.isAudio(mimetype)) return 'audio';
    if (mimetype === 'application/pdf' || mimetype.startsWith('text/')) return 'documents';
    return 'temp';
  }
}

module.exports = new FileValidationService();