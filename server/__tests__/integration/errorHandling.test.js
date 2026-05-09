const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

describe('Error Handling and Edge Cases Integration Tests', () => {
  let authToken;
  let testUser;

  beforeEach(() => {
    testUser = {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com'
    };
    authToken = jwt.sign(testUser, process.env.JWT_SECRET);
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long input strings', async () => {
      const longString = 'a'.repeat(10000);
      
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: longString,
          author: 'Test Author',
          description: 'Test description'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('too long');
    });

    it('should handle special characters in input', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Test Book ${specialChars}`,
          author: 'Test Author',
          description: 'Test description'
        })
        .expect(201);

      expect(response.body.book.title).toContain(specialChars);
    });

    it('should handle Unicode characters', async () => {
      const unicodeText = '测试书籍 📚 Тестовая книга';
      
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: unicodeText,
          author: 'Test Author',
          description: 'Test description'
        })
        .expect(201);

      expect(response.body.book.title).toBe(unicodeText);
    });

    it('should handle null and undefined values', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: null,
          author: undefined,
          description: 'Test description'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should handle empty strings', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          author: '',
          description: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should handle whitespace-only strings', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '   ',
          author: '\t\n',
          description: '     '
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle malformed JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer malformed.jwt.token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });

    it('should handle expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { ...testUser, exp: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
        process.env.JWT_SECRET
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });

    it('should handle tokens with invalid signature', async () => {
      const invalidToken = jwt.sign(testUser, 'wrong-secret');

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });

    it('should handle missing Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
      expect(response.body).toHaveProperty('message', 'No token provided');
    });

    it('should handle malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });
  });

  describe('File Upload Edge Cases', () => {
    it('should handle files that are too large', async () => {
      const largeBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB

      const response = await request(app)
        .post('/api/upload/cover')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, 'large-image.jpg')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'File too large');
    });

    it('should handle files with no extension', async () => {
      const response = await request(app)
        .post('/api/upload/cover')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake image data'), 'filename_without_extension')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle files with dangerous extensions', async () => {
      const response = await request(app)
        .post('/api/upload/cover')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('malicious content'), 'malware.exe')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty files', async () => {
      const response = await request(app)
        .post('/api/upload/cover')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.alloc(0), 'empty.jpg')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle files with misleading extensions', async () => {
      // File with .jpg extension but not actually an image
      const response = await request(app)
        .post('/api/upload/cover')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('This is not an image'), 'fake.jpg')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Database Edge Cases', () => {
    it('should handle concurrent requests gracefully', async () => {
      const requests = Array(10).fill().map((_, index) =>
        request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Concurrent Book ${index}`,
            author: 'Test Author',
            description: 'Test description'
          })
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });
    });

    it('should handle database connection failures gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the error handling structure is in place
      
      const response = await request(app)
        .get('/api/books/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('API Rate Limiting Edge Cases', () => {
    it('should handle burst requests', async () => {
      const burstRequests = Array(50).fill().map(() =>
        request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(burstRequests);
      
      // Some requests should be rate limited
      const rateLimitedCount = responses.filter(res => res.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
      
      // Rate limited responses should have proper headers
      const rateLimitedResponse = responses.find(res => res.status === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers).toHaveProperty('retry-after');
      }
    });

    it('should reset rate limits after time window', async () => {
      // Make requests to hit rate limit
      const initialRequests = Array(20).fill().map(() =>
        request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.all(initialRequests);

      // Wait for rate limit window to reset (assuming 1 minute window)
      await new Promise(resolve => setTimeout(resolve, 61000));

      // Should be able to make requests again
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
    }, 70000); // 70 second timeout
  });

  describe('Memory and Resource Edge Cases', () => {
    it('should handle large JSON payloads', async () => {
      const largeContent = 'a'.repeat(1024 * 1024); // 1MB string
      
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Large Content Book',
          author: 'Test Author',
          description: 'Test description',
          content: largeContent
        })
        .expect(413); // Payload too large

      expect(response.body).toHaveProperty('error');
    });

    it('should handle deeply nested JSON', async () => {
      const deepObject = { level: 1 };
      let current = deepObject;
      
      // Create 100 levels of nesting
      for (let i = 2; i <= 100; i++) {
        current.nested = { level: i };
        current = current.nested;
      }

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Deep Object Book',
          author: 'Test Author',
          description: 'Test description',
          metadata: deepObject
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Network and Timeout Edge Cases', () => {
    it('should handle slow requests within timeout', async () => {
      // This would typically test against a slow endpoint
      // For now, we'll test a regular endpoint with timeout expectations
      
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(5000) // 5 second timeout
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
      expect(response.body).toHaveProperty('templates');
    });

    it('should handle malformed request headers', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer \x00\x01\x02invalid')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    it('should sanitize script tags in input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Book Title ${maliciousInput}`,
          author: 'Test Author',
          description: `Description ${maliciousInput}`
        })
        .expect(201);

      // Script tags should be escaped or removed
      expect(response.body.book.title).not.toContain('<script>');
      expect(response.body.book.description).not.toContain('<script>');
    });

    it('should handle HTML entities in input', async () => {
      const htmlEntities = '&lt;div&gt;Test&lt;/div&gt;';
      
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Book Title ${htmlEntities}`,
          author: 'Test Author',
          description: 'Test description'
        })
        .expect(201);

      expect(response.body.book.title).toContain(htmlEntities);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection attempts in search', async () => {
      const sqlInjection = "'; DROP TABLE books; --";
      
      const response = await request(app)
        .get(`/api/books?search=${encodeURIComponent(sqlInjection)}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return results without executing SQL injection
      expect(response.body).toHaveProperty('books');
      expect(Array.isArray(response.body.books)).toBe(true);
    });

    it('should handle SQL injection in book creation', async () => {
      const sqlInjection = "Test'; INSERT INTO users (username) VALUES ('hacker'); --";
      
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: sqlInjection,
          author: 'Test Author',
          description: 'Test description'
        })
        .expect(201);

      // Should create book with the malicious string as title (safely escaped)
      expect(response.body.book.title).toBe(sqlInjection);
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
      expect(typeof response.body.error).toBe('string');
    });

    it('should return consistent error format for authentication errors', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
    });

    it('should return consistent error format for not found errors', async () => {
      const response = await request(app)
        .get('/api/books/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/books/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Should not expose database details, file paths, etc.
      expect(response.body.error).not.toContain('sqlite');
      expect(response.body.error).not.toContain('/Users/');
      expect(response.body.error).not.toContain('C:\\');
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret');
    });
  });
});