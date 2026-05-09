const CacheUtils = require('../cacheUtils');
const cacheService = require('../../services/cacheService');

describe('CacheUtils', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheService.clear();
  });

  describe('Memoization', () => {
    test('should cache function results', async () => {
      let callCount = 0;
      const testFunction = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      const result1 = await CacheUtils.memoize('test-key', testFunction, 60);
      const result2 = await CacheUtils.memoize('test-key', testFunction, 60);

      expect(result1).toBe('result-1');
      expect(result2).toBe('result-1'); // Should be cached
      expect(callCount).toBe(1); // Function should only be called once
    });

    test('should execute function on cache miss', async () => {
      let callCount = 0;
      const testFunction = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      const result1 = await CacheUtils.memoize('key1', testFunction, 60);
      const result2 = await CacheUtils.memoize('key2', testFunction, 60);

      expect(result1).toBe('result-1');
      expect(result2).toBe('result-2');
      expect(callCount).toBe(2);
    });

    test('should handle function errors gracefully', async () => {
      const errorFunction = async () => {
        throw new Error('Test error');
      };

      await expect(CacheUtils.memoize('error-key', errorFunction)).rejects.toThrow('Test error');
    });

    test('should not cache null or undefined results', async () => {
      let callCount = 0;
      const nullFunction = async () => {
        callCount++;
        return null;
      };

      const result1 = await CacheUtils.memoize('null-key', nullFunction, 60);
      const result2 = await CacheUtils.memoize('null-key', nullFunction, 60);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(callCount).toBe(2); // Should not be cached
    });
  });

  describe('API Response Caching', () => {
    test('should cache API responses with generated keys', async () => {
      let callCount = 0;
      const apiCall = async () => {
        callCount++;
        return { data: `api-result-${callCount}` };
      };

      const params = { userId: '123', page: 1 };
      
      const result1 = await CacheUtils.cacheApiResponse('/api/users', params, apiCall, 300);
      const result2 = await CacheUtils.cacheApiResponse('/api/users', params, apiCall, 300);

      expect(result1).toEqual({ data: 'api-result-1' });
      expect(result2).toEqual({ data: 'api-result-1' });
      expect(callCount).toBe(1);
    });

    test('should generate different keys for different parameters', async () => {
      let callCount = 0;
      const apiCall = async () => {
        callCount++;
        return { data: `result-${callCount}` };
      };

      const params1 = { userId: '123', page: 1 };
      const params2 = { userId: '123', page: 2 };

      const result1 = await CacheUtils.cacheApiResponse('/api/users', params1, apiCall, 300);
      const result2 = await CacheUtils.cacheApiResponse('/api/users', params2, apiCall, 300);

      expect(result1.data).toBe('result-1');
      expect(result2.data).toBe('result-2');
      expect(callCount).toBe(2);
    });
  });

  describe('User Data Caching', () => {
    test('should cache user-specific data', async () => {
      let callCount = 0;
      const dataFetcher = async () => {
        callCount++;
        return { profile: `user-data-${callCount}` };
      };

      const result1 = await CacheUtils.cacheUserData('user123', 'profile', dataFetcher, 1800);
      const result2 = await CacheUtils.cacheUserData('user123', 'profile', dataFetcher, 1800);

      expect(result1).toEqual({ profile: 'user-data-1' });
      expect(result2).toEqual({ profile: 'user-data-1' });
      expect(callCount).toBe(1);
    });

    test('should separate cache by user and data type', async () => {
      let callCount = 0;
      const dataFetcher = async () => {
        callCount++;
        return { data: `result-${callCount}` };
      };

      const result1 = await CacheUtils.cacheUserData('user1', 'profile', dataFetcher, 1800);
      const result2 = await CacheUtils.cacheUserData('user2', 'profile', dataFetcher, 1800);
      const result3 = await CacheUtils.cacheUserData('user1', 'settings', dataFetcher, 1800);

      expect(result1.data).toBe('result-1');
      expect(result2.data).toBe('result-2');
      expect(result3.data).toBe('result-3');
      expect(callCount).toBe(3);
    });
  });

  describe('Book Data Caching', () => {
    test('should cache book-specific data', async () => {
      let callCount = 0;
      const dataFetcher = async () => {
        callCount++;
        return { analysis: `book-analysis-${callCount}` };
      };

      const result1 = await CacheUtils.cacheBookData('book123', 'analysis', dataFetcher, 3600);
      const result2 = await CacheUtils.cacheBookData('book123', 'analysis', dataFetcher, 3600);

      expect(result1).toEqual({ analysis: 'book-analysis-1' });
      expect(result2).toEqual({ analysis: 'book-analysis-1' });
      expect(callCount).toBe(1);
    });
  });

  describe('AI Response Caching', () => {
    test('should cache AI service responses', async () => {
      let callCount = 0;
      const serviceCall = async () => {
        callCount++;
        return { generated: `ai-response-${callCount}` };
      };

      const params = { prompt: 'test prompt', model: 'gpt-3.5-turbo' };

      const result1 = await CacheUtils.cacheAiResponse('openai', 'generate', params, serviceCall, 7200);
      const result2 = await CacheUtils.cacheAiResponse('openai', 'generate', params, serviceCall, 7200);

      expect(result1).toEqual({ generated: 'ai-response-1' });
      expect(result2).toEqual({ generated: 'ai-response-1' });
      expect(callCount).toBe(1);
    });

    test('should generate different keys for different AI parameters', async () => {
      let callCount = 0;
      const serviceCall = async () => {
        callCount++;
        return { generated: `response-${callCount}` };
      };

      const params1 = { prompt: 'prompt1', model: 'gpt-3.5-turbo' };
      const params2 = { prompt: 'prompt2', model: 'gpt-3.5-turbo' };

      const result1 = await CacheUtils.cacheAiResponse('openai', 'generate', params1, serviceCall, 7200);
      const result2 = await CacheUtils.cacheAiResponse('openai', 'generate', params2, serviceCall, 7200);

      expect(result1.generated).toBe('response-1');
      expect(result2.generated).toBe('response-2');
      expect(callCount).toBe(2);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate cache entries by pattern', async () => {
      // Set up some cached data
      cacheService.set('user:123:profile', { name: 'John' });
      cacheService.set('user:123:settings', { theme: 'dark' });
      cacheService.set('user:456:profile', { name: 'Jane' });
      cacheService.set('book:789:analysis', { genre: 'fiction' });

      expect(cacheService.get('user:123:profile')).toBeDefined();
      expect(cacheService.get('user:123:settings')).toBeDefined();
      expect(cacheService.get('user:456:profile')).toBeDefined();

      // Invalidate user:123 entries
      CacheUtils.invalidateByPattern('user:123:');

      expect(cacheService.get('user:123:profile')).toBeNull();
      expect(cacheService.get('user:123:settings')).toBeNull();
      expect(cacheService.get('user:456:profile')).toBeDefined(); // Should remain
      expect(cacheService.get('book:789:analysis')).toBeDefined(); // Should remain
    });

    test('should invalidate user-specific cache', async () => {
      cacheService.set('user:123:profile', { name: 'John' });
      cacheService.set('user:123:books', []);
      cacheService.set('user:456:profile', { name: 'Jane' });

      CacheUtils.invalidateUserCache('123');

      expect(cacheService.get('user:123:profile')).toBeNull();
      expect(cacheService.get('user:123:books')).toBeNull();
      expect(cacheService.get('user:456:profile')).toBeDefined();
    });

    test('should invalidate book-specific cache', async () => {
      cacheService.set('book:123:analysis', { genre: 'fiction' });
      cacheService.set('book:123:script', { content: 'script' });
      cacheService.set('book:456:analysis', { genre: 'non-fiction' });

      CacheUtils.invalidateBookCache('123');

      expect(cacheService.get('book:123:analysis')).toBeNull();
      expect(cacheService.get('book:123:script')).toBeNull();
      expect(cacheService.get('book:456:analysis')).toBeDefined();
    });
  });

  describe('Key Generation', () => {
    test('should generate consistent API cache keys', () => {
      const params1 = { userId: '123', page: 1, sort: 'name' };
      const params2 = { sort: 'name', page: 1, userId: '123' }; // Different order

      const key1 = CacheUtils.generateApiCacheKey('/api/users', params1);
      const key2 = CacheUtils.generateApiCacheKey('/api/users', params2);

      expect(key1).toBe(key2); // Should be the same despite different order
      expect(key1).toMatch(/^api:\/api\/users:/);
    });

    test('should generate consistent AI cache keys', () => {
      const params1 = { prompt: 'test', model: 'gpt-3.5-turbo', temperature: 0.7 };
      const params2 = { temperature: 0.7, model: 'gpt-3.5-turbo', prompt: 'test' };

      const key1 = CacheUtils.generateAiCacheKey('openai', 'generate', params1);
      const key2 = CacheUtils.generateAiCacheKey('openai', 'generate', params2);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^ai:openai:generate:/);
    });
  });

  describe('Object Sorting', () => {
    test('should sort object keys recursively', () => {
      const obj = {
        z: 'last',
        a: 'first',
        nested: {
          y: 'nested-last',
          b: 'nested-first'
        },
        array: [{ z: 1, a: 2 }, { b: 3, a: 4 }]
      };

      const sorted = CacheUtils.sortObject(obj);
      const keys = Object.keys(sorted);
      const nestedKeys = Object.keys(sorted.nested);

      expect(keys).toEqual(['a', 'array', 'nested', 'z']);
      expect(nestedKeys).toEqual(['b', 'y']);
    });

    test('should handle primitive values', () => {
      expect(CacheUtils.sortObject('string')).toBe('string');
      expect(CacheUtils.sortObject(123)).toBe(123);
      expect(CacheUtils.sortObject(null)).toBe(null);
      expect(CacheUtils.sortObject(undefined)).toBe(undefined);
    });
  });

  describe('Cache Warmup', () => {
    test('should warm up cache with provided tasks', async () => {
      let callCount = 0;
      const warmupTasks = [
        {
          key: 'warmup1',
          fn: async () => {
            callCount++;
            return 'result1';
          },
          ttl: 300
        },
        {
          key: 'warmup2',
          fn: async () => {
            callCount++;
            return 'result2';
          },
          ttl: 600
        }
      ];

      await CacheUtils.warmupCache(warmupTasks);

      expect(callCount).toBe(2);
      expect(cacheService.get('warmup1')).toBe('result1');
      expect(cacheService.get('warmup2')).toBe('result2');
    });

    test('should handle warmup task errors gracefully', async () => {
      const warmupTasks = [
        {
          key: 'success',
          fn: async () => 'success-result',
          ttl: 300
        },
        {
          key: 'error',
          fn: async () => {
            throw new Error('Warmup error');
          },
          ttl: 300
        }
      ];

      // Should not throw
      await expect(CacheUtils.warmupCache(warmupTasks)).resolves.toBeUndefined();
      
      expect(cacheService.get('success')).toBe('success-result');
      expect(cacheService.get('error')).toBeNull();
    });
  });

  describe('Extended Statistics', () => {
    test('should provide extended cache statistics', () => {
      // Set up various cache entries
      cacheService.set('user:123:profile', { name: 'John' });
      cacheService.set('book:456:analysis', { genre: 'fiction' });
      cacheService.set('api:endpoint:hash', { data: 'api-data' });
      cacheService.set('ai:openai:generate:hash', { result: 'ai-result' });
      cacheService.set('session:abc123', { userId: '123' });
      cacheService.set('other:data', { value: 'other' });

      const stats = CacheUtils.getExtendedStats();

      expect(stats.categories.user).toBe(1);
      expect(stats.categories.book).toBe(1);
      expect(stats.categories.api).toBe(1);
      expect(stats.categories.ai).toBe(1);
      expect(stats.categories.session).toBe(1);
      expect(stats.categories.other).toBe(1);
      expect(stats.totalKeys).toBe(6);
    });
  });

  describe('Hash Function', () => {
    test('should generate consistent hashes', () => {
      const str1 = 'test string';
      const str2 = 'test string';
      const str3 = 'different string';

      const hash1 = CacheUtils.hashString(str1);
      const hash2 = CacheUtils.hashString(str2);
      const hash3 = CacheUtils.hashString(str3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(typeof hash1).toBe('string');
    });

    test('should handle empty strings', () => {
      const hash = CacheUtils.hashString('');
      expect(hash).toBe('0');
    });
  });
});