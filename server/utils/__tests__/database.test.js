const databaseManager = require('../../config/database');
const DatabaseUtils = require('../database');
const path = require('path');
const fs = require('fs');

describe('Database Utils', () => {
  let testDbPath;

  beforeAll(async () => {
    // Create a test database in memory
    testDbPath = ':memory:';
    databaseManager.initialize(testDbPath);
    await databaseManager.runMigrations();
  });

  afterAll(() => {
    databaseManager.close();
  });

  describe('healthCheck', () => {
    it('should return true for healthy database', async () => {
      const isHealthy = await DatabaseUtils.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return database statistics', async () => {
      const stats = await DatabaseUtils.getStats();
      
      expect(stats).toHaveProperty('users');
      expect(stats).toHaveProperty('books');
      expect(stats).toHaveProperty('videos');
      expect(stats).toHaveProperty('templates');
      expect(stats).toHaveProperty('timestamp');
      
      expect(typeof stats.users).toBe('number');
      expect(typeof stats.books).toBe('number');
      expect(typeof stats.videos).toBe('number');
      expect(typeof stats.templates).toBe('number');
      
      // Should have seeded templates
      expect(stats.templates).toBeGreaterThan(0);
    });
  });

  describe('getTableInfo', () => {
    it('should return table information', async () => {
      const tables = await DatabaseUtils.getTableInfo();
      
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('books');
      expect(tableNames).toContain('videos');
      expect(tableNames).toContain('templates');
    });
  });

  describe('safeQuery', () => {
    it('should execute SELECT queries', async () => {
      const result = await DatabaseUtils.safeQuery('SELECT COUNT(*) as count FROM templates');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('count');
      expect(result[0].count).toBeGreaterThan(0);
    });

    it('should handle query errors gracefully', async () => {
      await expect(
        DatabaseUtils.safeQuery('SELECT * FROM nonexistent_table')
      ).rejects.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should clean up old failed records', async () => {
      // Insert a test failed record
      const db = databaseManager.getDatabase();
      const userId = 'test-user-1';
      const bookId = 'test-book-1';
      
      // Insert test user and book first
      db.prepare('INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)').run(
        userId, 'testuser', 'test@example.com', 'hashedpassword'
      );
      
      db.prepare('INSERT OR IGNORE INTO books (id, user_id, title, author) VALUES (?, ?, ?, ?)').run(
        bookId, userId, 'Test Book', 'Test Author'
      );
      
      // Insert failed video record with old timestamp
      db.prepare(`
        INSERT INTO videos (id, user_id, book_id, title, status, created_at) 
        VALUES (?, ?, ?, ?, 'failed', datetime('now', '-2 days'))
      `).run('test-video-1', userId, bookId, 'Test Video');
      
      const cleanedCount = await DatabaseUtils.cleanup();
      expect(cleanedCount).toBeGreaterThanOrEqual(1);
    });
  });
});