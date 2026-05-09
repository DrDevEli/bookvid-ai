const cacheService = require('../services/cacheService');
const sessionService = require('../services/sessionService');
const CacheUtils = require('../utils/cacheUtils');

/**
 * Demo script showing the in-memory cache and session services in action
 */
async function runCacheDemo() {
  console.log('🚀 Starting Cache Service Demo\n');

  // Basic cache operations
  console.log('1. Basic Cache Operations:');
  cacheService.set('user:123', { name: 'John Doe', email: 'john@example.com' }, 60);
  cacheService.set('book:456', { title: 'Sample Book', author: 'Jane Smith' }, 120);
  
  console.log('   Cached user:', cacheService.get('user:123'));
  console.log('   Cached book:', cacheService.get('book:456'));
  console.log('   Non-existent key:', cacheService.get('nonexistent'));
  console.log('   Cache size:', cacheService.size());
  console.log('');

  // Session management
  console.log('2. Session Management:');
  const sessionId1 = sessionService.createSession('user123', { role: 'admin', theme: 'dark' });
  const sessionId2 = sessionService.createSession('user456', { role: 'user', theme: 'light' });
  
  console.log('   Created session 1:', sessionId1);
  console.log('   Created session 2:', sessionId2);
  console.log('   Session 1 data:', sessionService.getSession(sessionId1));
  console.log('   User 123 sessions:', sessionService.getUserSessions('user123'));
  console.log('');

  // Cache utilities - memoization
  console.log('3. Cache Utilities - Memoization:');
  let callCount = 0;
  const expensiveFunction = async (input) => {
    callCount++;
    console.log(`   Executing expensive function (call #${callCount}) with input: ${input}`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    return `Result for ${input} (computed)`;
  };

  // First call - should execute function
  const result1 = await CacheUtils.memoize('expensive:test1', () => expensiveFunction('test1'), 30);
  console.log('   First call result:', result1);

  // Second call - should use cache
  const result2 = await CacheUtils.memoize('expensive:test1', () => expensiveFunction('test1'), 30);
  console.log('   Second call result:', result2);
  console.log('   Total function calls:', callCount);
  console.log('');

  // User data caching
  console.log('4. User Data Caching:');
  const userData = await CacheUtils.cacheUserData('user123', 'profile', async () => {
    console.log('   Fetching user profile from database...');
    return { id: 'user123', name: 'John Doe', preferences: { theme: 'dark' } };
  }, 60);
  console.log('   User data:', userData);

  // Second call should use cache
  const userData2 = await CacheUtils.cacheUserData('user123', 'profile', async () => {
    console.log('   This should not be called (cached)');
    return { id: 'user123', name: 'John Doe', preferences: { theme: 'dark' } };
  }, 60);
  console.log('   Cached user data:', userData2);
  console.log('');

  // Cache statistics
  console.log('5. Cache Statistics:');
  const stats = CacheUtils.getExtendedStats();
  console.log('   Cache stats:', JSON.stringify(stats, null, 2));
  console.log('');

  const sessionStats = sessionService.getStats();
  console.log('   Session stats:', JSON.stringify(sessionStats, null, 2));
  console.log('');

  // Cache invalidation
  console.log('6. Cache Invalidation:');
  console.log('   Before invalidation - cache size:', cacheService.size());
  CacheUtils.invalidateUserCache('user123');
  console.log('   After user cache invalidation - cache size:', cacheService.size());
  console.log('');

  // TTL demonstration
  console.log('7. TTL Demonstration:');
  cacheService.set('short-lived', 'This will expire soon', 2); // 2 seconds TTL
  console.log('   Set short-lived key with 2s TTL');
  console.log('   Immediate get:', cacheService.get('short-lived'));
  
  setTimeout(() => {
    console.log('   After 2.5 seconds:', cacheService.get('short-lived'));
    
    // Final stats
    console.log('\n8. Final Statistics:');
    const finalStats = cacheService.getStats();
    console.log('   Final cache stats:', JSON.stringify(finalStats, null, 2));
    
    console.log('\n✅ Cache Service Demo Complete!');
    
    // Cleanup
    cacheService.shutdown();
    process.exit(0);
  }, 2500);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the demo
runCacheDemo().catch(console.error);