const databaseManager = require('../config/database');

/**
 * Database utility functions
 */
class DatabaseUtils {
  /**
   * Check if database is healthy and accessible
   * @returns {Promise<boolean>}
   */
  static async healthCheck() {
    try {
      const db = databaseManager.getDatabase();
      
      // Simple query to test connection
      const result = db.prepare("SELECT 1 as test").get();
      
      return result && result.test === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>}
   */
  static async getStats() {
    try {
      const db = databaseManager.getDatabase();
      
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
      const bookCount = db.prepare("SELECT COUNT(*) as count FROM books").get();
      const videoCount = db.prepare("SELECT COUNT(*) as count FROM videos").get();
      const templateCount = db.prepare("SELECT COUNT(*) as count FROM templates").get();
      
      return {
        users: userCount.count,
        books: bookCount.count,
        videos: videoCount.count,
        templates: templateCount.count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old temporary files and expired sessions
   * @returns {Promise<void>}
   */
  static async cleanup() {
    try {
      const db = databaseManager.getDatabase();
      
      // Clean up failed video generation records older than 24 hours
      const cleanupStmt = db.prepare(`
        DELETE FROM videos 
        WHERE status = 'failed' 
        AND created_at < datetime('now', '-1 day')
      `);
      
      const result = cleanupStmt.run();
      
      if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} failed video records`);
      }
      
      return result.changes;
    } catch (error) {
      console.error('Database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Backup database to a file
   * @param {string} backupPath - Path for backup file
   * @returns {Promise<void>}
   */
  static async backup(backupPath) {
    try {
      const db = databaseManager.getDatabase();
      
      // Use SQLite backup API
      await db.backup(backupPath);
      
      console.log(`💾 Database backed up to: ${backupPath}`);
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Get table information
   * @returns {Promise<Array>}
   */
  static async getTableInfo() {
    try {
      const db = databaseManager.getDatabase();
      
      const tables = db.prepare(`
        SELECT name, sql 
        FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();
      
      return tables;
    } catch (error) {
      console.error('Failed to get table info:', error);
      throw error;
    }
  }

  /**
   * Execute a safe query with error handling
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<*>}
   */
  static async safeQuery(sql, params = []) {
    try {
      const db = databaseManager.getDatabase();
      const stmt = db.prepare(sql);
      
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return stmt.all(params);
      } else {
        return stmt.run(params);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }
}

module.exports = DatabaseUtils;