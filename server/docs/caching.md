# In-Memory Caching System

This document describes the in-memory caching system that replaces Redis for the personal project version of BookVid AI.

## Overview

The caching system consists of three main components:

1. **CacheService** - Core in-memory cache with TTL support
2. **SessionService** - Session management using the cache
3. **CacheUtils** - High-level caching utilities and patterns

## CacheService

The `CacheService` is a singleton that provides a Redis-like interface for in-memory caching.

### Features

- **TTL Support**: Automatic expiration of cached entries
- **LRU Eviction**: Least Recently Used eviction when cache is full
- **Memory Management**: Configurable size limits and cleanup
- **Event Emitters**: Events for cache operations (set, get, delete, expired)
- **Statistics**: Hit/miss ratios and memory usage tracking

### Configuration

Configure via environment variables:

```bash
CACHE_MAX_SIZE=1000           # Maximum number of entries
CACHE_DEFAULT_TTL=3600        # Default TTL in seconds (1 hour)
CACHE_CLEANUP_INTERVAL=300    # Cleanup interval in seconds (5 minutes)
```

### Basic Usage

```javascript
const cacheService = require('./services/cacheService');

// Set a value with TTL
cacheService.set('key', 'value', 60); // 60 seconds TTL

// Get a value
const value = cacheService.get('key');

// Delete a value
cacheService.delete('key');

// Check if key exists
const exists = cacheService.has('key');

// Get statistics
const stats = cacheService.getStats();
```

## SessionService

The `SessionService` provides session management using the in-memory cache.

### Features

- **Session Creation**: Create sessions with custom data
- **Multi-Session Support**: Multiple sessions per user
- **Session Validation**: Validate and extend sessions
- **Automatic Cleanup**: Sessions expire automatically

### Configuration

```bash
SESSION_TTL=86400  # Session TTL in seconds (24 hours)
```

### Usage

```javascript
const sessionService = require('./services/sessionService');

// Create a session
const sessionId = sessionService.createSession('userId', { role: 'admin' });

// Get session data
const session = sessionService.getSession(sessionId);

// Update session
sessionService.updateSession(sessionId, { lastPage: '/dashboard' });

// Delete session
sessionService.deleteSession(sessionId);

// Validate session
const userId = sessionService.validateSession(sessionId);
```

## CacheUtils

The `CacheUtils` class provides high-level caching patterns and utilities.

### Memoization

Cache function results to avoid repeated expensive operations:

```javascript
const CacheUtils = require('./utils/cacheUtils');

const result = await CacheUtils.memoize('cache-key', async () => {
  // Expensive operation
  return await fetchDataFromAPI();
}, 300); // 5 minutes TTL
```

### User Data Caching

Cache user-specific data with automatic key generation:

```javascript
const userData = await CacheUtils.cacheUserData('user123', 'profile', async () => {
  return await getUserProfile('user123');
}, 1800); // 30 minutes TTL
```

### API Response Caching

Cache API responses with parameter-based keys:

```javascript
const response = await CacheUtils.cacheApiResponse('/api/books', { page: 1 }, async () => {
  return await fetchBooks({ page: 1 });
}, 300);
```

### Cache Invalidation

Invalidate cache entries by pattern:

```javascript
// Invalidate all user-related cache entries
CacheUtils.invalidateUserCache('user123');

// Invalidate all book-related cache entries
CacheUtils.invalidateBookCache('book456');

// Invalidate by custom pattern
CacheUtils.invalidateByPattern('api:books:');
```

## Health Monitoring

The cache system is integrated into the application health check endpoint:

```bash
GET /health
```

Returns cache statistics including:
- Hit/miss ratios
- Memory usage
- Active sessions
- Cache categories

## Performance Considerations

### Memory Usage

- Each cache entry includes metadata (creation time, access count, etc.)
- Estimated memory usage is available via `getStats()`
- Configure `CACHE_MAX_SIZE` based on available memory

### TTL Management

- Use appropriate TTL values for different data types
- Shorter TTL for frequently changing data
- Longer TTL for static or expensive-to-compute data

### Cleanup

- Automatic cleanup runs periodically to remove expired entries
- Manual cleanup can be triggered if needed
- LRU eviction prevents memory overflow

## Migration from Redis

The in-memory cache provides a Redis-compatible interface for basic operations:

| Redis Command | CacheService Method |
|---------------|-------------------|
| `SET key value EX ttl` | `set(key, value, ttl)` |
| `GET key` | `get(key)` |
| `DEL key` | `delete(key)` |
| `EXISTS key` | `has(key)` |
| `FLUSHALL` | `clear()` |

## Limitations

Compared to Redis, the in-memory cache has these limitations:

- **No Persistence**: Data is lost when the application restarts
- **Single Process**: Cannot be shared between multiple application instances
- **Memory Bound**: Limited by available application memory
- **No Advanced Data Types**: Only supports basic key-value storage

These limitations are acceptable for a personal project but should be considered for production use.

## Examples

See `server/examples/cacheDemo.js` for a complete demonstration of the caching system features.