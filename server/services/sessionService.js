const cacheService = require('./cacheService');
const { v4: uuidv4 } = require('uuid');

/**
 * Session management service using in-memory caching
 * Replaces Redis-based session storage for personal project use
 */
class SessionService {
  constructor() {
    this.sessionPrefix = 'session:';
    this.userSessionPrefix = 'user_sessions:';
    this.defaultSessionTTL = parseInt(process.env.SESSION_TTL) || 86400; // 24 hours
    
    console.log('✅ Session service initialized with in-memory storage');
  }

  /**
   * Create a new session
   * @param {string} userId - User ID
   * @param {Object} sessionData - Additional session data
   * @param {number} ttl - Session TTL in seconds (optional)
   * @returns {string} Session ID
   */
  createSession(userId, sessionData = {}, ttl = null) {
    try {
      const sessionId = uuidv4();
      const sessionKey = this.sessionPrefix + sessionId;
      const userSessionKey = this.userSessionPrefix + userId;
      
      const session = {
        id: sessionId,
        userId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        data: sessionData
      };
      
      const sessionTTL = ttl || this.defaultSessionTTL;
      
      // Store session
      cacheService.set(sessionKey, session, sessionTTL);
      
      // Track user sessions (for multi-session support)
      const userSessions = this.getUserSessions(userId) || [];
      userSessions.push(sessionId);
      cacheService.set(userSessionKey, userSessions, sessionTTL);
      
      return sessionId;
      
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session data
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session data or null if not found
   */
  getSession(sessionId) {
    try {
      if (!sessionId) return null;
      
      const sessionKey = this.sessionPrefix + sessionId;
      const session = cacheService.get(sessionKey);
      
      if (session) {
        // Update last activity
        session.lastActivity = new Date().toISOString();
        cacheService.set(sessionKey, session, this.defaultSessionTTL);
      }
      
      return session;
      
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Update session data
   * @param {string} sessionId - Session ID
   * @param {Object} data - Data to merge with existing session
   * @returns {boolean} Success status
   */
  updateSession(sessionId, data) {
    try {
      const session = this.getSession(sessionId);
      
      if (!session) {
        return false;
      }
      
      // Merge new data
      session.data = { ...session.data, ...data };
      session.lastActivity = new Date().toISOString();
      
      const sessionKey = this.sessionPrefix + sessionId;
      cacheService.set(sessionKey, session, this.defaultSessionTTL);
      
      return true;
      
    } catch (error) {
      console.error('Error updating session:', error);
      return false;
    }
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session ID
   * @returns {boolean} Success status
   */
  deleteSession(sessionId) {
    try {
      if (!sessionId) return false;
      
      const session = this.getSession(sessionId);
      if (!session) return false;
      
      const sessionKey = this.sessionPrefix + sessionId;
      const userSessionKey = this.userSessionPrefix + session.userId;
      
      // Remove session
      cacheService.delete(sessionKey);
      
      // Remove from user sessions list
      const userSessions = this.getUserSessions(session.userId) || [];
      const updatedSessions = userSessions.filter(id => id !== sessionId);
      
      if (updatedSessions.length > 0) {
        cacheService.set(userSessionKey, updatedSessions, this.defaultSessionTTL);
      } else {
        cacheService.delete(userSessionKey);
      }
      
      return true;
      
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   * @param {string} userId - User ID
   * @returns {string[]|null} Array of session IDs or null
   */
  getUserSessions(userId) {
    try {
      const userSessionKey = this.userSessionPrefix + userId;
      return cacheService.get(userSessionKey);
      
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return null;
    }
  }

  /**
   * Delete all sessions for a user
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  deleteUserSessions(userId) {
    try {
      const sessionIds = this.getUserSessions(userId) || [];
      
      // Delete each session
      for (const sessionId of sessionIds) {
        const sessionKey = this.sessionPrefix + sessionId;
        cacheService.delete(sessionKey);
      }
      
      // Delete user sessions list
      const userSessionKey = this.userSessionPrefix + userId;
      cacheService.delete(userSessionKey);
      
      return true;
      
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      return false;
    }
  }

  /**
   * Validate session and return user ID
   * @param {string} sessionId - Session ID
   * @returns {string|null} User ID or null if invalid
   */
  validateSession(sessionId) {
    try {
      const session = this.getSession(sessionId);
      return session ? session.userId : null;
      
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  /**
   * Extend session TTL
   * @param {string} sessionId - Session ID
   * @param {number} ttl - New TTL in seconds (optional)
   * @returns {boolean} Success status
   */
  extendSession(sessionId, ttl = null) {
    try {
      const session = this.getSession(sessionId);
      
      if (!session) {
        return false;
      }
      
      const sessionKey = this.sessionPrefix + sessionId;
      const sessionTTL = ttl || this.defaultSessionTTL;
      
      cacheService.set(sessionKey, session, sessionTTL);
      
      return true;
      
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  getStats() {
    try {
      const allKeys = cacheService.keys();
      const sessionKeys = allKeys.filter(key => key.startsWith(this.sessionPrefix));
      const userSessionKeys = allKeys.filter(key => key.startsWith(this.userSessionPrefix));
      
      return {
        activeSessions: sessionKeys.length,
        usersWithSessions: userSessionKeys.length,
        cacheStats: cacheService.getStats()
      };
      
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        activeSessions: 0,
        usersWithSessions: 0,
        error: error.message
      };
    }
  }

  /**
   * Clean up expired sessions (called by cache service automatically)
   * This method is mainly for manual cleanup if needed
   */
  cleanup() {
    try {
      // The cache service handles TTL expiration automatically
      // This method can be used for additional cleanup logic if needed
      console.log('Session cleanup completed');
      
    } catch (error) {
      console.error('Error during session cleanup:', error);
    }
  }
}

// Create singleton instance
const sessionService = new SessionService();

module.exports = sessionService;