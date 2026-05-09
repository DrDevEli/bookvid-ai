const sessionService = require('../sessionService');
const cacheService = require('../cacheService');

describe('SessionService', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheService.clear();
  });

  describe('Session Creation', () => {
    test('should create a new session', () => {
      const userId = 'user123';
      const sessionData = { role: 'user', preferences: { theme: 'dark' } };
      
      const sessionId = sessionService.createSession(userId, sessionData);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    test('should store session data correctly', () => {
      const userId = 'user123';
      const sessionData = { role: 'admin', lastLogin: '2023-01-01' };
      
      const sessionId = sessionService.createSession(userId, sessionData);
      const session = sessionService.getSession(sessionId);
      
      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.userId).toBe(userId);
      expect(session.data).toEqual(sessionData);
      expect(session.createdAt).toBeDefined();
      expect(session.lastActivity).toBeDefined();
    });

    test('should track user sessions', () => {
      const userId = 'user123';
      
      const sessionId1 = sessionService.createSession(userId, { device: 'mobile' });
      const sessionId2 = sessionService.createSession(userId, { device: 'desktop' });
      
      const userSessions = sessionService.getUserSessions(userId);
      
      expect(userSessions).toContain(sessionId1);
      expect(userSessions).toContain(sessionId2);
      expect(userSessions.length).toBe(2);
    });
  });

  describe('Session Retrieval', () => {
    test('should get existing session', () => {
      const userId = 'user123';
      const sessionData = { role: 'user' };
      
      const sessionId = sessionService.createSession(userId, sessionData);
      const session = sessionService.getSession(sessionId);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.data).toEqual(sessionData);
    });

    test('should return null for non-existent session', () => {
      const session = sessionService.getSession('non-existent-id');
      expect(session).toBeNull();
    });

    test('should return null for null/undefined session ID', () => {
      expect(sessionService.getSession(null)).toBeNull();
      expect(sessionService.getSession(undefined)).toBeNull();
      expect(sessionService.getSession('')).toBeNull();
    });

    test('should update last activity on get', (done) => {
      const userId = 'user123';
      const sessionId = sessionService.createSession(userId, {});
      
      const session1 = sessionService.getSession(sessionId);
      const firstActivity = session1.lastActivity;
      
      // Wait a bit and get again
      setTimeout(() => {
        const session2 = sessionService.getSession(sessionId);
        if (session2) {
          expect(session2.lastActivity).not.toBe(firstActivity);
          done();
        } else {
          done(new Error('Session not found'));
        }
      }, 10);
    });
  });

  describe('Session Updates', () => {
    test('should update session data', () => {
      const userId = 'user123';
      const initialData = { role: 'user', theme: 'light' };
      const updateData = { theme: 'dark', language: 'en' };
      
      const sessionId = sessionService.createSession(userId, initialData);
      const updated = sessionService.updateSession(sessionId, updateData);
      
      expect(updated).toBe(true);
      
      const session = sessionService.getSession(sessionId);
      expect(session.data).toEqual({
        role: 'user',
        theme: 'dark',
        language: 'en'
      });
    });

    test('should return false for non-existent session update', () => {
      const updated = sessionService.updateSession('non-existent', { data: 'test' });
      expect(updated).toBe(false);
    });

    test('should merge data correctly', () => {
      const userId = 'user123';
      const initialData = { 
        user: { name: 'John', age: 30 },
        settings: { theme: 'light' }
      };
      
      const sessionId = sessionService.createSession(userId, initialData);
      
      // Update with nested data
      sessionService.updateSession(sessionId, {
        settings: { theme: 'dark', language: 'en' },
        newField: 'test'
      });
      
      const session = sessionService.getSession(sessionId);
      expect(session.data).toEqual({
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark', language: 'en' },
        newField: 'test'
      });
    });
  });

  describe('Session Deletion', () => {
    test('should delete session', () => {
      const userId = 'user123';
      const sessionId = sessionService.createSession(userId, {});
      
      expect(sessionService.getSession(sessionId)).toBeDefined();
      
      const deleted = sessionService.deleteSession(sessionId);
      expect(deleted).toBe(true);
      expect(sessionService.getSession(sessionId)).toBeNull();
    });

    test('should remove session from user sessions list', () => {
      const userId = 'user123';
      const sessionId1 = sessionService.createSession(userId, {});
      const sessionId2 = sessionService.createSession(userId, {});
      
      expect(sessionService.getUserSessions(userId).length).toBe(2);
      
      sessionService.deleteSession(sessionId1);
      
      const userSessions = sessionService.getUserSessions(userId);
      expect(userSessions.length).toBe(1);
      expect(userSessions).toContain(sessionId2);
      expect(userSessions).not.toContain(sessionId1);
    });

    test('should return false for non-existent session deletion', () => {
      const deleted = sessionService.deleteSession('non-existent');
      expect(deleted).toBe(false);
    });

    test('should handle null/undefined session ID deletion', () => {
      expect(sessionService.deleteSession(null)).toBe(false);
      expect(sessionService.deleteSession(undefined)).toBe(false);
      expect(sessionService.deleteSession('')).toBe(false);
    });
  });

  describe('User Session Management', () => {
    test('should delete all user sessions', () => {
      const userId = 'user123';
      const sessionId1 = sessionService.createSession(userId, {});
      const sessionId2 = sessionService.createSession(userId, {});
      const sessionId3 = sessionService.createSession(userId, {});
      
      expect(sessionService.getUserSessions(userId).length).toBe(3);
      
      const deleted = sessionService.deleteUserSessions(userId);
      expect(deleted).toBe(true);
      
      expect(sessionService.getUserSessions(userId)).toBeNull();
      expect(sessionService.getSession(sessionId1)).toBeNull();
      expect(sessionService.getSession(sessionId2)).toBeNull();
      expect(sessionService.getSession(sessionId3)).toBeNull();
    });

    test('should handle deletion of non-existent user sessions', () => {
      const deleted = sessionService.deleteUserSessions('non-existent-user');
      expect(deleted).toBe(true); // Should not fail
    });

    test('should get user sessions for existing user', () => {
      const userId = 'user123';
      const sessionId1 = sessionService.createSession(userId, {});
      const sessionId2 = sessionService.createSession(userId, {});
      
      const userSessions = sessionService.getUserSessions(userId);
      expect(userSessions).toContain(sessionId1);
      expect(userSessions).toContain(sessionId2);
    });

    test('should return null for non-existent user sessions', () => {
      const userSessions = sessionService.getUserSessions('non-existent-user');
      expect(userSessions).toBeNull();
    });
  });

  describe('Session Validation', () => {
    test('should validate existing session', () => {
      const userId = 'user123';
      const sessionId = sessionService.createSession(userId, {});
      
      const validatedUserId = sessionService.validateSession(sessionId);
      expect(validatedUserId).toBe(userId);
    });

    test('should return null for invalid session', () => {
      const validatedUserId = sessionService.validateSession('invalid-session');
      expect(validatedUserId).toBeNull();
    });
  });

  describe('Session Extension', () => {
    test('should extend session TTL', () => {
      const userId = 'user123';
      const sessionId = sessionService.createSession(userId, {}, 1); // 1 second TTL
      
      const extended = sessionService.extendSession(sessionId, 3600); // Extend to 1 hour
      expect(extended).toBe(true);
      
      // Session should still be valid
      expect(sessionService.getSession(sessionId)).toBeDefined();
    });

    test('should return false for non-existent session extension', () => {
      const extended = sessionService.extendSession('non-existent', 3600);
      expect(extended).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should provide session statistics', () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      
      sessionService.createSession(userId1, {});
      sessionService.createSession(userId1, {});
      sessionService.createSession(userId2, {});
      
      const stats = sessionService.getStats();
      
      expect(stats.activeSessions).toBe(3);
      expect(stats.usersWithSessions).toBe(2);
      expect(stats.cacheStats).toBeDefined();
    });

    test('should handle stats errors gracefully', () => {
      // Mock cache service to throw error
      const originalKeys = cacheService.keys;
      cacheService.keys = () => { throw new Error('Test error'); };
      
      const stats = sessionService.getStats();
      expect(stats.activeSessions).toBe(0);
      expect(stats.error).toBeDefined();
      
      // Restore original method
      cacheService.keys = originalKeys;
    });
  });

  describe('Multiple Users', () => {
    test('should handle sessions for multiple users', () => {
      const user1Sessions = [];
      const user2Sessions = [];
      
      // Create sessions for user1
      user1Sessions.push(sessionService.createSession('user1', { device: 'mobile' }));
      user1Sessions.push(sessionService.createSession('user1', { device: 'desktop' }));
      
      // Create sessions for user2
      user2Sessions.push(sessionService.createSession('user2', { device: 'tablet' }));
      
      // Verify user1 sessions
      const user1SessionList = sessionService.getUserSessions('user1');
      expect(user1SessionList.length).toBe(2);
      expect(user1SessionList).toEqual(expect.arrayContaining(user1Sessions));
      
      // Verify user2 sessions
      const user2SessionList = sessionService.getUserSessions('user2');
      expect(user2SessionList.length).toBe(1);
      expect(user2SessionList).toEqual(expect.arrayContaining(user2Sessions));
      
      // Delete user1 sessions shouldn't affect user2
      sessionService.deleteUserSessions('user1');
      expect(sessionService.getUserSessions('user1')).toBeNull();
      expect(sessionService.getUserSessions('user2').length).toBe(1);
    });
  });
});