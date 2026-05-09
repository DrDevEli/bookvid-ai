const cacheService = require('../services/cacheService');

/**
 * Cache utility functions for common caching patterns
 * Provides higher-level caching abstractions
 */
class CacheUtils {
  /**
   * Cache with function execution - memoization pattern
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<any>} Cached or computed result
   */
  static async memoize(key, fn, ttl = null) {
    try {
      // Try to get from cache first
      let result = cacheService.get(key);
      
      if (result !== null) {
        return result;
      }
      
      // Execute function and cache result
      result = await fn();
      
      if (result !== null && result !== undefined) {
        cacheService.set(key, result, ttl);
      }
      
      return result;
      
    } catch (error) {
      console.error('Memoize error:', error);
      // If caching fails, still try to execute the function
      return await fn();
    }
  }

  /**
   * Cache API responses with automatic key generation
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {Function} apiCall - Function that makes the API call
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<any>} API response
   */
  static async cacheApiResponse(endpoint, params, apiCall, ttl = 300) {
    try {
      const key = this.generateApiCacheKey(endpoint, params);
      return await this.memoize(key, apiCall, ttl);
      
    } catch (error) {
      console.error('API cache error:', error);
      return await apiCall();
    }
  }

  /**
   * Cache user-specific data
   * @param {string} userId - User ID
   * @param {string} dataType - Type of data (e.g., 'profile', 'books')
   * @param {Function} dataFetcher - Function to fetch data
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<any>} User data
   */
  static async cacheUserData(userId, dataType, dataFetcher, ttl = 1800) {
    const key = `user:${userId}:${dataType}`;
    return await this.memoize(key, dataFetcher, ttl);
  }

  /**
   * Cache book-related data
   * @param {string} bookId - Book ID
   * @param {string} dataType - Type of data (e.g., 'analysis', 'script')
   * @param {Function} dataFetcher - Function to fetch data
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<any>} Book data
   */
  static async cacheBookData(bookId, dataType, dataFetcher, ttl = 3600) {
    const key = `book:${bookId}:${dataType}`;
    return await this.memoize(key, dataFetcher, ttl);
  }

  /**
   * Cache AI service responses
   * @param {string} service - Service name (e.g., 'openai', 'elevenlabs')
   * @param {string} operation - Operation type (e.g., 'generate', 'synthesize')
   * @param {Object} params - Request parameters
   * @param {Function} serviceCall - Function that calls the AI service
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<any>} AI service response
   */
  static async cacheAiResponse(service, operation, params, serviceCall, ttl = 7200) {
    try {
      const key = this.generateAiCacheKey(service, operation, params);
      return await this.memoize(key, serviceCall, ttl);
      
    } catch (error) {
      console.error('AI cache error:', error);
      return await serviceCall();
    }
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match keys (simple string matching)
   */
  static invalidateByPattern(pattern) {
    try {
      const keys = cacheService.keys();
      const matchingKeys = keys.filter(key => key.includes(pattern));
      
      for (const key of matchingKeys) {
        cacheService.delete(key);
      }
      
      console.log(`Invalidated ${matchingKeys.length} cache entries matching pattern: ${pattern}`);
      
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Invalidate user-specific cache entries
   * @param {string} userId - User ID
   */
  static invalidateUserCache(userId) {
    this.invalidateByPattern(`user:${userId}:`);
  }

  /**
   * Invalidate book-specific cache entries
   * @param {string} bookId - Book ID
   */
  static invalidateBookCache(bookId) {
    this.invalidateByPattern(`book:${bookId}:`);
  }

  /**
   * Generate cache key for API responses
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @returns {string} Cache key
   * @private
   */
  static generateApiCacheKey(endpoint, params) {
    const sortedParams = this.sortObject(params);
    const paramString = JSON.stringify(sortedParams);
    return `api:${endpoint}:${this.hashString(paramString)}`;
  }

  /**
   * Generate cache key for AI service responses
   * @param {string} service - Service name
   * @param {string} operation - Operation type
   * @param {Object} params - Request parameters
   * @returns {string} Cache key
   * @private
   */
  static generateAiCacheKey(service, operation, params) {
    const sortedParams = this.sortObject(params);
    const paramString = JSON.stringify(sortedParams);
    return `ai:${service}:${operation}:${this.hashString(paramString)}`;
  }

  /**
   * Sort object keys for consistent cache keys
   * @param {Object} obj - Object to sort
   * @returns {Object} Sorted object
   * @private
   */
  static sortObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }
    
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObject(obj[key]);
    });
    
    return sorted;
  }

  /**
   * Simple hash function for cache keys
   * @param {string} str - String to hash
   * @returns {string} Hash string
   * @private
   */
  static hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Warm up cache with commonly accessed data
   * @param {Array} warmupTasks - Array of warmup task objects
   */
  static async warmupCache(warmupTasks = []) {
    try {
      console.log('Starting cache warmup...');
      
      for (const task of warmupTasks) {
        try {
          await this.memoize(task.key, task.fn, task.ttl);
        } catch (error) {
          console.error(`Warmup failed for key ${task.key}:`, error);
        }
      }
      
      console.log(`Cache warmup completed for ${warmupTasks.length} tasks`);
      
    } catch (error) {
      console.error('Cache warmup error:', error);
    }
  }

  /**
   * Get cache statistics with additional metrics
   * @returns {Object} Extended cache statistics
   */
  static getExtendedStats() {
    try {
      const baseStats = cacheService.getStats();
      const keys = cacheService.keys();
      
      // Categorize keys
      const categories = {
        user: keys.filter(k => k.startsWith('user:')).length,
        book: keys.filter(k => k.startsWith('book:')).length,
        api: keys.filter(k => k.startsWith('api:')).length,
        ai: keys.filter(k => k.startsWith('ai:')).length,
        session: keys.filter(k => k.startsWith('session:')).length,
        other: keys.filter(k => !k.match(/^(user|book|api|ai|session):/)).length
      };
      
      return {
        ...baseStats,
        categories,
        totalKeys: keys.length
      };
      
    } catch (error) {
      console.error('Error getting extended stats:', error);
      return cacheService.getStats();
    }
  }
}

module.exports = CacheUtils;