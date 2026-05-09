const EventEmitter = require('events');

/**
 * In-memory caching service with TTL support and memory management
 * Replaces Redis for personal project use
 */
class CacheService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this._initializeStorage();
    this._initializeStats();
    this._configureOptions(options);
    this._startCleanup();
    this._logInitialization();
  }

  /**
   * Initialize cache storage structures
   * @private
   */
  _initializeStorage() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Initialize statistics tracking
   * @private
   */
  _initializeStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Configure cache options with defaults
   * @private
   */
  _configureOptions(options) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600;
    this.cleanupInterval = options.cleanupInterval || 300;
  }

  /**
   * Start periodic cleanup process
   * @private
   */
  _startCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval * 1000);
  }

  /**
   * Log successful initialization
   * @private
   */
  _logInitialization() {
    console.log(`✅ In-memory cache service initialized (maxSize: ${this.maxSize}, defaultTTL: ${this.defaultTTL}s)`);
  }

  /**
   * Set a value in the cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {boolean} Success status
   */
  set(key, value, ttl = null) {
    try {
      // Handle invalid keys
      if (key === null || key === undefined) {
        return false;
      }
      
      // Use provided TTL or default
      const timeToLive = ttl !== null ? ttl : this.defaultTTL;
      
      // Check if we need to evict entries
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evictEntry();
      }
      
      // Clear existing timer if key exists
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }
      
      // Set the value with metadata
      const entry = {
        value,
        createdAt: Date.now(),
        expiresAt: timeToLive === 0 ? Infinity : Date.now() + (timeToLive * 1000),
        accessCount: 0,
        lastAccessed: Date.now()
      };
      
      this.cache.set(key, entry);
      this.stats.sets++;
      
      // Set expiration timer
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
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if not found/expired
   */
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
      
      // Check if expired
      if (entry.expiresAt !== Infinity && Date.now() > entry.expiresAt) {
        this.delete(key);
        this.stats.misses++;
        this.emit('expired', key);
        return null;
      }
      
      // Update access metadata
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      this.stats.hits++;
      this.emit('get', key);
      return entry.value;
      
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key existed and was deleted
   */
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
        
        // Clear timer if exists
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
        
        this.emit('delete', key);
      }
      
      return existed;
      
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (entry.expiresAt !== Infinity && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all entries from the cache
   */
  clear() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      this.cache.clear();
      this.timers.clear();
      
      // Reset stats except for historical data
      const totalOperations = this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes;
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: this.stats.evictions
      };
      
      this.emit('clear');
      console.log('Cache cleared');
      
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      memoryUsage: (() => {
        try {
          let totalSize = 0;
          for (const [key, entry] of this.cache.entries()) {
            totalSize += this._estimateObjectSize(key, entry);
          }
          return {
            estimated: `${(totalSize / 1024).toFixed(2)} KB`,
            entries: this.cache.size
          };
        } catch (error) {
          console.error('Memory usage calculation error:', error);
          return { error: error.message };
        }
      })()
    };
  }

  /**
   * Get all cache keys
   * @returns {string[]} Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   * @returns {number} Number of entries in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Evict entry based on configured strategy
   * @private
   */
  evictEntry() {
    const evictionStrategy = this.evictionStrategy || new LRUEvictionStrategy();
    const keyToEvict = evictionStrategy.selectKeyForEviction(this.cache);
    
    if (keyToEvict) {
      this.delete(keyToEvict);
      this.stats.evictions++;
      this.emit('evicted', keyToEvict);
    }
  }

  /**
   * Evict least recently used entry (legacy method)
   * @private
   * @deprecated Use evictEntry() instead
   */
  evictLRU() {
    this.evictEntry();
  }

  /**
   * Clean up expired entries
   * @private
   */
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
}

/**
 * Eviction strategy interface
 */
class EvictionStrategy {
  selectKeyForEviction(cache) {
    throw new Error('selectKeyForEviction must be implemented');
  }
}

/**
 * Least Recently Used eviction strategy
 */
class LRUEvictionStrategy extends EvictionStrategy {
  selectKeyForEviction(cache) {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
}

/**
 * Least Frequently Used eviction strategy
 */
class LFUEvictionStrategy extends EvictionStrategy {
  selectKeyForEviction(cache) {
    let leastUsedKey = null;
    let leastAccessCount = Infinity;
    
    for (const [key, entry] of cache.entries()) {
      if (entry.accessCount < leastAccessCount) {
        leastAccessCount = entry.accessCount;
        leastUsedKey = key;
      }
    }
    
    return leastUsedKey;
  }


  /**
   * Get approximate memory usage
   * @private
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += this._estimateObjectSize(key, entry);
    }
    
    return {
      estimated: `${(totalSize / 1024).toFixed(2)} KB`,
      entries: this.cache.size
    };
  }

  /**
   * Estimate size of cache entry without expensive serialization
   * @private
   * @param {string} key - Cache key
   * @param {Object} entry - Cache entry
   * @returns {number} Estimated size in bytes
   */
  _estimateObjectSize(key, entry) {
    let size = key.length * 2; // String characters are 2 bytes each
    size += 100; // Overhead for entry metadata
    
    // Estimate value size based on type
    const value = entry.value;
    if (typeof value === 'string') {
      size += value.length * 2;
    } else if (typeof value === 'number') {
      size += 8; // 64-bit number
    } else if (typeof value === 'boolean') {
      size += 4;
    } else if (value && typeof value === 'object') {
      // For objects, use a heuristic based on key count
      size += Object.keys(value).length * 50; // Rough estimate
    }
    
    return size;
  }

  /**
   * Shutdown the cache service
   */
  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
    
    console.log('Cache service shutdown complete');
  }
}

// Create singleton instance
const cacheService = new CacheService({
  maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 3600,
  cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 1800 // 30 minutes
});

// Graceful shutdown
process.on('SIGTERM', () => {
  cacheService.shutdown();
});

process.on('SIGINT', () => {
  cacheService.shutdown();
});

module.exports = cacheService;