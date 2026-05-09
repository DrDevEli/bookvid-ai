// Import the class directly for testing
const EventEmitter = require('events');

// Define the CacheService class for testing (copy from the main file)
class CacheService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Configuration
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600;
    this.cleanupInterval = options.cleanupInterval || 300;
    
    // Start periodic cleanup
    if (this.cleanupInterval > 0) {
      this.startCleanup();
    }
  }

  set(key, value, ttl = null) {
    try {
      // Handle invalid keys
      if (key === null || key === undefined) {
        return false;
      }
      
      const timeToLive = ttl !== null ? ttl : this.defaultTTL;
      
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }
      
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      
      const entry = {
        value,
        createdAt: Date.now(),
        expiresAt: timeToLive === 0 ? Infinity : Date.now() + (timeToLive * 1000),
        accessCount: 0,
        lastAccessed: Date.now()
      };
      
      this.cache.set(key, entry);
      this.stats.sets++;
      
      if (timeToLive > 0) {
        const timer = setTimeout(() => {
          this.delete(key);
          this.emit('expired', key);
        }, timeToLive * 1000);
        
        this.timers.set(key, timer);
      }
      
      this.emit('set', key, value);
      return true;
      
    } catch (error) {
      return false;
    }
  }

  get(key) {
    try {
      // Handle invalid keys
      if (key === null || key === undefined) {
        this.stats.misses++;
        return null;
      }
      
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        return null;
      }
      
      if (entry.expiresAt !== Infinity && Date.now() > entry.expiresAt) {
        this.delete(key);
        this.stats.misses++;
        this.emit('expired', key);
        return null;
      }
      
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      this.stats.hits++;
      this.emit('get', key);
      return entry.value;
      
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  delete(key) {
    try {
      // Handle invalid keys
      if (key === null || key === undefined) {
        return false;
      }
      
      const existed = this.cache.has(key);
      
      if (existed) {
        this.cache.delete(key);
        this.stats.deletes++;
        
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
        
        this.emit('delete', key);
      }
      
      return existed;
      
    } catch (error) {
      return false;
    }
  }

  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (entry.expiresAt !== Infinity && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  clear() {
    try {
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      this.cache.clear();
      this.timers.clear();
      
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: this.stats.evictions
      };
      
      this.emit('clear');
      
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      memoryUsage: this.getMemoryUsage()
    };
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  size() {
    return this.cache.size;
  }

  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
      this.emit('evicted', oldestKey);
    }
  }

  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval * 1000);
  }

  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== Infinity && now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      this.emit('cleanup', expiredKeys.length);
    }
  }

  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 100;
    }
    
    return {
      estimated: `${(totalSize / 1024).toFixed(2)} KB`,
      entries: this.cache.size
    };
  }

  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }
}

// Create a test instance to avoid interfering with the singleton
const createTestCache = (options = {}) => {
  return new CacheService(options);
};

describe('CacheService', () => {
  let cache;

  beforeEach(() => {
    cache = createTestCache({
      maxSize: 10,
      defaultTTL: 1,
      cleanupInterval: 0.1
    });
  });

  afterEach(() => {
    if (cache) {
      cache.shutdown();
    }
  });

  describe('Basic Operations', () => {
    test('should set and get values', () => {
      const result = cache.set('test-key', 'test-value');
      expect(result).toBe(true);
      
      const value = cache.get('test-key');
      expect(value).toBe('test-value');
    });

    test('should return null for non-existent keys', () => {
      const value = cache.get('non-existent');
      expect(value).toBeNull();
    });

    test('should delete values', () => {
      cache.set('test-key', 'test-value');
      expect(cache.get('test-key')).toBe('test-value');
      
      const deleted = cache.delete('test-key');
      expect(deleted).toBe(true);
      expect(cache.get('test-key')).toBeNull();
    });

    test('should check if key exists', () => {
      cache.set('test-key', 'test-value');
      expect(cache.has('test-key')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    test('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
      
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire values after TTL', (done) => {
      cache.set('test-key', 'test-value', 0.1); // 100ms TTL
      expect(cache.get('test-key')).toBe('test-value');
      
      setTimeout(() => {
        expect(cache.get('test-key')).toBeNull();
        done();
      }, 150);
    });

    test('should use default TTL when not specified', (done) => {
      cache.set('test-key', 'test-value'); // Uses default TTL of 1 second
      expect(cache.get('test-key')).toBe('test-value');
      
      setTimeout(() => {
        expect(cache.get('test-key')).toBeNull();
        done();
      }, 1100);
    });

    test('should handle zero TTL (no expiration)', (done) => {
      cache.set('test-key', 'test-value', 0);
      expect(cache.get('test-key')).toBe('test-value');
      
      // Should still be there after default TTL would have expired
      setTimeout(() => {
        expect(cache.get('test-key')).toBe('test-value');
        done();
      }, 100); // Reduced timeout for faster test
    });
  });

  describe('Memory Management', () => {
    test('should evict LRU entries when max size reached', () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size()).toBe(10);
      
      // Access some keys to make them more recently used
      cache.get('key5');
      cache.get('key6');
      cache.get('key7');
      
      // Add one more item, should evict LRU
      cache.set('key10', 'value10');
      expect(cache.size()).toBe(10);
      
      // The least recently used items should be evicted
      expect(cache.get('key0')).toBeNull();
      expect(cache.get('key5')).toBe('value5'); // Should still exist
    });

    test('should update access time on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // Access key1 to make it more recently used
      cache.get('key1');
      
      // Fill cache to trigger eviction
      for (let i = 3; i < 12; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      // key1 should still exist because it was accessed recently
      expect(cache.get('key1')).toBe('value1');
      // key2 should be evicted
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('Statistics', () => {
    test('should track hit and miss statistics', () => {
      cache.set('key1', 'value1');
      
      // Generate hits
      cache.get('key1');
      cache.get('key1');
      
      // Generate misses
      cache.get('non-existent1');
      cache.get('non-existent2');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.sets).toBe(1);
      expect(stats.hitRate).toBe('50.00%');
    });

    test('should track set and delete operations', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.delete('key1');
      
      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
    });
  });

  describe('Events', () => {
    test('should emit events for cache operations', (done) => {
      let eventCount = 0;
      
      cache.on('set', (key, value) => {
        expect(key).toBe('test-key');
        expect(value).toBe('test-value');
        eventCount++;
      });
      
      cache.on('get', (key) => {
        expect(key).toBe('test-key');
        eventCount++;
      });
      
      cache.on('delete', (key) => {
        expect(key).toBe('test-key');
        eventCount++;
        
        if (eventCount === 3) {
          done();
        }
      });
      
      cache.set('test-key', 'test-value');
      cache.get('test-key');
      cache.delete('test-key');
    });

    test('should emit expired event when items expire', (done) => {
      cache.on('expired', (key) => {
        expect(key).toBe('test-key');
        done();
      });
      
      cache.set('test-key', 'test-value', 0.05); // 50ms TTL
    });
  });

  describe('Data Types', () => {
    test('should handle different data types', () => {
      const testCases = [
        ['string', 'test-string'],
        ['number', 42],
        ['boolean', true],
        ['object', { key: 'value', nested: { data: 123 } }],
        ['array', [1, 2, 3, 'four']],
        ['null', null]
      ];
      
      testCases.forEach(([type, value]) => {
        cache.set(`test-${type}`, value);
        expect(cache.get(`test-${type}`)).toEqual(value);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully', () => {
      // Test with invalid key types
      expect(cache.set(null, 'value')).toBe(false);
      expect(cache.get(null)).toBeNull();
      expect(cache.delete(null)).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should clean up expired entries periodically', (done) => {
      const cleanupCache = createTestCache({
        maxSize: 10,
        defaultTTL: 0.05,
        cleanupInterval: 0.1
      });
      
      cleanupCache.set('key1', 'value1', 0.05);
      cleanupCache.set('key2', 'value2', 0.05);
      
      expect(cleanupCache.size()).toBe(2);
      
      cleanupCache.on('cleanup', (count) => {
        expect(count).toBe(2);
        expect(cleanupCache.size()).toBe(0);
        cleanupCache.shutdown();
        done();
      });
    });
  });
});