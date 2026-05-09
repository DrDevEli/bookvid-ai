const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const databaseManager = require('../../config/database');

describe('API Integration Tests', () => {
  let authToken;
  let testUser;
  let testBook;

  beforeAll(async () => {
    // Initialize test database
    databaseManager.initialize(':memory:');
    
    // Skip migrations for integration tests to avoid conflicts
    // We'll create minimal test data directly
  });

  afterAll(() => {
    databaseManager.close();
  });

  beforeEach(() => {
    // Create test user data
    testUser = {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com',
      created_at: new Date().toISOString()
    };

    // Generate auth token
    authToken = jwt.sign(testUser, process.env.JWT_SECRET);

    // Create test book data
    testBook = {
      id: 'test-book-123',
      user_id: testUser.id,
      title: 'Integration Test Book',
      author: 'Test Author',
      genre: 'Fiction',
      description: 'A book for integration testing',
      content: 'This is test content for integration testing.'
    };
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user and return token', async () => {
        const userData = {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'SecurePassword123'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('message', 'User registered successfully');
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).not.toHaveProperty('password_hash');
        expect(response.body.user.username).toBe(userData.username);
        expect(response.body.user.email).toBe(userData.email);

        // Verify token is valid
        const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
        expect(decodedToken.email).toBe(userData.email);
      });

      it('should validate required fields', async () => {
        const incompleteData = {
          username: 'testuser'
          // missing email and password
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(incompleteData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
        expect(response.body).toHaveProperty('details');
        expect(Array.isArray(response.body.details)).toBe(true);
      });

      it('should validate email format', async () => {
        const invalidData = {
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePassword123'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should validate password strength', async () => {
        const weakPasswordData = {
          username: 'testuser',
          email: 'test@example.com',
          password: '123' // too weak
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(weakPasswordData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const loginData = {
          identifier: testUser.email,
          password: 'TestPassword123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).not.toHaveProperty('password_hash');
      });

      it('should reject invalid credentials', async () => {
        const invalidLoginData = {
          identifier: testUser.email,
          password: 'WrongPassword'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(invalidLoginData)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication failed');
        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });
    });

    describe('GET /api/auth/profile', () => {
      it('should return user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('stats');
        expect(response.body.user.id).toBe(testUser.id);
        expect(response.body.user).not.toHaveProperty('password_hash');
      });

      it('should reject requests without token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Access denied');
        expect(response.body).toHaveProperty('message', 'No token provided');
      });

      it('should reject requests with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Access denied');
        expect(response.body).toHaveProperty('message', 'Invalid token');
      });
    });
  });

  describe('Book Management Endpoints', () => {
    describe('POST /api/books', () => {
      it('should create a new book', async () => {
        const bookData = {
          title: 'New Test Book',
          author: 'Test Author',
          genre: 'Science Fiction',
          description: 'A new book for testing',
          content: 'This is the content of the new test book.'
        };

        const response = await request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bookData)
          .expect(201);

        expect(response.body).toHaveProperty('message', 'Book created successfully');
        expect(response.body).toHaveProperty('book');
        expect(response.body.book.title).toBe(bookData.title);
        expect(response.body.book.author).toBe(bookData.author);
        expect(response.body.book.user_id).toBe(testUser.id);
      });

      it('should validate required fields', async () => {
        const incompleteBookData = {
          title: 'Incomplete Book'
          // missing author
        };

        const response = await request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompleteBookData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should require authentication', async () => {
        const bookData = {
          title: 'Unauthorized Book',
          author: 'Test Author'
        };

        const response = await request(app)
          .post('/api/books')
          .send(bookData)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Access denied');
      });
    });

    describe('GET /api/books', () => {
      it('should return user books', async () => {
        const response = await request(app)
          .get('/api/books')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('books');
        expect(Array.isArray(response.body.books)).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/books?page=1&limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('books');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page', 1);
        expect(response.body.pagination).toHaveProperty('limit', 10);
      });

      it('should support search', async () => {
        const response = await request(app)
          .get('/api/books?search=test')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('books');
        expect(Array.isArray(response.body.books)).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/books')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Access denied');
      });
    });

    describe('GET /api/books/:id', () => {
      it('should return specific book', async () => {
        const response = await request(app)
          .get(`/api/books/${testBook.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('book');
        expect(response.body.book.id).toBe(testBook.id);
        expect(response.body.book.user_id).toBe(testUser.id);
      });

      it('should return 404 for non-existent book', async () => {
        const response = await request(app)
          .get('/api/books/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Book not found');
      });

      it('should prevent access to other users books', async () => {
        // Create token for different user
        const otherUser = { id: 'other-user', email: 'other@example.com' };
        const otherToken = jwt.sign(otherUser, process.env.JWT_SECRET);

        const response = await request(app)
          .get(`/api/books/${testBook.id}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Book not found');
      });
    });
  });

  describe('Video Generation Endpoints', () => {
    describe('POST /api/videos/generate', () => {
      it('should start video generation process', async () => {
        const videoRequest = {
          bookId: testBook.id,
          templateId: 'template-001',
          options: {
            scriptOptions: { tone: 'engaging', duration: 60 },
            voiceOptions: { voiceId: 'pNInz6obpgDQGcFmaJgB' }
          }
        };

        const response = await request(app)
          .post('/api/videos/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send(videoRequest)
          .expect(202);

        expect(response.body).toHaveProperty('message', 'Video generation started');
        expect(response.body).toHaveProperty('videoId');
        expect(response.body).toHaveProperty('status', 'generating');
      });

      it('should validate required fields', async () => {
        const incompleteRequest = {
          bookId: testBook.id
          // missing templateId
        };

        const response = await request(app)
          .post('/api/videos/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompleteRequest)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
      });

      it('should validate book ownership', async () => {
        const otherUser = { id: 'other-user', email: 'other@example.com' };
        const otherToken = jwt.sign(otherUser, process.env.JWT_SECRET);

        const videoRequest = {
          bookId: testBook.id,
          templateId: 'template-001'
        };

        const response = await request(app)
          .post('/api/videos/generate')
          .set('Authorization', `Bearer ${otherToken}`)
          .send(videoRequest)
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Access denied');
      });

      it('should require authentication', async () => {
        const videoRequest = {
          bookId: testBook.id,
          templateId: 'template-001'
        };

        const response = await request(app)
          .post('/api/videos/generate')
          .send(videoRequest)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Access denied');
      });
    });

    describe('GET /api/videos/:id/status', () => {
      it('should return video generation status', async () => {
        const videoId = 'test-video-123';

        const response = await request(app)
          .get(`/api/videos/${videoId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('videoId', videoId);
        expect(response.body).toHaveProperty('status');
        expect(['generating', 'completed', 'failed']).toContain(response.body.status);
      });

      it('should return 404 for non-existent video', async () => {
        const response = await request(app)
          .get('/api/videos/non-existent-id/status')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Video not found');
      });
    });

    describe('DELETE /api/videos/:id', () => {
      it('should cancel video generation', async () => {
        const videoId = 'test-video-123';

        const response = await request(app)
          .delete(`/api/videos/${videoId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Video generation cancelled');
      });

      it('should prevent cancelling other users videos', async () => {
        const otherUser = { id: 'other-user', email: 'other@example.com' };
        const otherToken = jwt.sign(otherUser, process.env.JWT_SECRET);
        const videoId = 'test-video-123';

        const response = await request(app)
          .delete(`/api/videos/${videoId}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Video not found');
      });
    });
  });

  describe('File Upload Endpoints', () => {
    describe('POST /api/upload/cover', () => {
      it('should upload book cover image', async () => {
        const response = await request(app)
          .post('/api/upload/cover')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('fake image data'), 'cover.jpg')
          .expect(200);

        expect(response.body).toHaveProperty('message', 'File uploaded successfully');
        expect(response.body).toHaveProperty('file');
        expect(response.body.file).toHaveProperty('filename');
        expect(response.body.file).toHaveProperty('path');
      });

      it('should reject non-image files', async () => {
        const response = await request(app)
          .post('/api/upload/cover')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('not an image'), 'document.txt')
          .expect(400);

        expect(response.body).toHaveProperty('error', 'File upload failed');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/upload/cover')
          .attach('file', Buffer.from('fake image data'), 'cover.jpg')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Access denied');
      });
    });
  });

  describe('Template Endpoints', () => {
    describe('GET /api/templates', () => {
      it('should return available templates', async () => {
        const response = await request(app)
          .get('/api/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('templates');
        expect(Array.isArray(response.body.templates)).toBe(true);
      });

      it('should support category filtering', async () => {
        const response = await request(app)
          .get('/api/templates?category=trailer')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('templates');
        expect(Array.isArray(response.body.templates)).toBe(true);
      });

      it('should support genre filtering', async () => {
        const response = await request(app)
          .get('/api/templates?genre=fiction')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('templates');
        expect(Array.isArray(response.body.templates)).toBe(true);
      });
    });

    describe('GET /api/templates/:id', () => {
      it('should return specific template with configuration', async () => {
        const templateId = 'template-001';

        const response = await request(app)
          .get(`/api/templates/${templateId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('template');
        expect(response.body.template.id).toBe(templateId);
        expect(response.body.template).toHaveProperty('config');
      });

      it('should return 404 for non-existent template', async () => {
        const response = await request(app)
          .get('/api/templates/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Template not found');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle large request bodies', async () => {
      const largeData = {
        title: 'a'.repeat(10000),
        author: 'Test Author',
        content: 'b'.repeat(100000)
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData)
        .expect(413);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      // Make multiple rapid requests
      const requests = Array(20).fill().map(() =>
        request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/profile')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });
});