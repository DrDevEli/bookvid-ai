/**
 * Test utilities and helpers for consistent testing
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

/**
 * Create a test user token for authentication
 * @param {Object} userData - User data to encode in token
 * @returns {string} JWT token
 */
function createTestToken(userData = {}) {
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser'
  };
  
  const user = { ...defaultUser, ...userData };
  
  return jwt.sign(user, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
}

/**
 * Create authorization header with test token
 * @param {Object} userData - User data for token
 * @returns {Object} Headers object
 */
function createAuthHeaders(userData = {}) {
  const token = createTestToken(userData);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Test database setup helper
 * @param {Object} db - Database instance
 */
function setupTestDatabase(db) {
  // Clear all tables
  const tables = ['videos', 'books', 'users', 'templates'];
  
  for (const table of tables) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch (error) {
      // Table might not exist, ignore
    }
  }
}

/**
 * Create test user in database
 * @param {Object} db - Database instance
 * @param {Object} userData - User data
 * @returns {Object} Created user
 */
function createTestUser(db, userData = {}) {
  const defaultUser = {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    password_hash: '$2a$10$test.hash.here',
    created_at: new Date().toISOString()
  };
  
  const user = { ...defaultUser, ...userData };
  
  const stmt = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(user.id, user.username, user.email, user.password_hash, user.created_at);
  
  // Return user without password hash
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Create test book in database
 * @param {Object} db - Database instance
 * @param {string} userId - User ID
 * @param {Object} bookData - Book data
 * @returns {Object} Created book
 */
function createTestBook(db, userId, bookData = {}) {
  const defaultBook = {
    id: 'test-book-id',
    user_id: userId,
    title: 'Test Book',
    author: 'Test Author',
    genre: 'Fiction',
    description: 'A test book',
    content: 'Test book content',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const book = { ...defaultBook, ...bookData };
  
  const stmt = db.prepare(`
    INSERT INTO books (id, user_id, title, author, genre, description, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    book.id, book.user_id, book.title, book.author, 
    book.genre, book.description, book.content, 
    book.created_at, book.updated_at
  );
  
  return book;
}

/**
 * API test helper for making authenticated requests
 * @param {Object} app - Express app instance
 * @param {Object} userData - User data for authentication
 * @returns {Object} Request helper methods
 */
function createApiTester(app, userData = {}) {
  const headers = createAuthHeaders(userData);
  
  return {
    get: (url) => request(app).get(url).set(headers),
    post: (url, data) => request(app).post(url).set(headers).send(data),
    put: (url, data) => request(app).put(url).set(headers).send(data),
    delete: (url) => request(app).delete(url).set(headers),
    patch: (url, data) => request(app).patch(url).set(headers).send(data)
  };
}

/**
 * Mock API key validation for testing
 * @param {boolean} shouldPass - Whether validation should pass
 */
function mockApiKeyValidation(shouldPass = true) {
  const apiKeyManager = require('../../config/apiKeys');
  
  jest.spyOn(apiKeyManager, 'isServiceAvailable').mockReturnValue(shouldPass);
  jest.spyOn(apiKeyManager, 'getApiKey').mockReturnValue(shouldPass ? 'mock-api-key' : null);
}

/**
 * Restore all mocks
 */
function restoreMocks() {
  jest.restoreAllMocks();
}

/**
 * Common test data generators
 */
const testData = {
  user: (overrides = {}) => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPass123!',
    ...overrides
  }),
  
  book: (overrides = {}) => ({
    title: 'Test Book',
    author: 'Test Author',
    genre: 'Fiction',
    description: 'A test book for testing purposes',
    content: 'This is the content of the test book.',
    ...overrides
  }),
  
  video: (overrides = {}) => ({
    title: 'Test Video',
    script: 'This is a test video script.',
    template_id: 'template-001',
    ...overrides
  })
};

/**
 * Assertion helpers for common test patterns
 */
const assertions = {
  /**
   * Assert API response structure
   * @param {Object} response - API response
   * @param {number} expectedStatus - Expected status code
   */
  apiResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('timestamp');
    
    if (response.body.success) {
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
    } else {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code');
    }
  },
  
  /**
   * Assert validation error response
   * @param {Object} response - API response
   */
  validationError: (response) => {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error).toHaveProperty('details');
    expect(Array.isArray(response.body.error.details)).toBe(true);
  },
  
  /**
   * Assert unauthorized response
   * @param {Object} response - API response
   */
  unauthorized: (response) => {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  }
};

module.exports = {
  createTestToken,
  createAuthHeaders,
  setupTestDatabase,
  createTestUser,
  createTestBook,
  createApiTester,
  mockApiKeyValidation,
  restoreMocks,
  testData,
  assertions
};