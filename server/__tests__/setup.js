/**
 * Jest test setup file
 * Configures global test environment and utilities
 */

const path = require('path');
const fs = require('fs');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_PATH = ':memory:';
process.env.UPLOAD_PATH = path.join(__dirname, '../test-uploads');
process.env.MAX_FILE_SIZE = '10485760'; // 10MB for tests

// Mock API keys for testing
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key';

// Create test upload directory
const testUploadPath = process.env.UPLOAD_PATH;
if (!fs.existsSync(testUploadPath)) {
  fs.mkdirSync(testUploadPath, { recursive: true });
  
  // Create subdirectories
  const subdirs = ['covers', 'videos', 'thumbnails', 'audio', 'temp', 'documents', 'library'];
  subdirs.forEach(dir => {
    const dirPath = path.join(testUploadPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// Global test utilities
global.testUtils = {
  createTestUser: () => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123'
  }),
  
  createTestBook: (userId = 'test-user-id') => ({
    user_id: userId,
    title: 'Test Book',
    author: 'Test Author',
    genre: 'Fiction',
    description: 'A test book for unit testing',
    content: 'This is the test content of the book.'
  }),
  
  createTestVideo: (userId = 'test-user-id', bookId = 'test-book-id') => ({
    user_id: userId,
    book_id: bookId,
    title: 'Test Video',
    script: 'This is a test video script.',
    template_id: 'template-001'
  }),
  
  createMockFile: (options = {}) => ({
    originalname: options.originalname || 'test-file.jpg',
    filename: options.filename || 'test-file-123.jpg',
    mimetype: options.mimetype || 'image/jpeg',
    size: options.size || 1024,
    path: options.path || path.join(testUploadPath, 'temp', 'test-file-123.jpg'),
    buffer: options.buffer || Buffer.from('fake image data')
  }),
  
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Clean up after all tests
afterAll(async () => {
  // Clean up test upload directory
  try {
    if (fs.existsSync(testUploadPath)) {
      fs.rmSync(testUploadPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Failed to clean up test uploads:', error.message);
  }
});