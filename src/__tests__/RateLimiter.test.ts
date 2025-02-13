import RateLimiter from '../RateLimiter';
import Redis from 'ioredis';

const redis = new Redis(); // Create a Redis instance

describe('RateLimiter - Redis', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ limit: 5, windowSize: 60000 }, redis); // 5 requests per minute
  });

  afterEach(async () => {
    // Clear Redis data after each test
    await redis.flushall();
  }, 10000); // 10 seconds timeout

  afterAll(async () => {
    // Close Redis connection after all tests
    await redis.quit();
  }, 10000); // 10 seconds timeout

  it('should allow requests within the limit', async () => {
    jest.setTimeout(10000); // 10 seconds timeout

    for (let i = 0; i < 5; i++) {
      expect(await rateLimiter.allowRequest('user1')).toBe(true);
    }
  }, 10000); // 10 seconds timeout

  it('should deny requests beyond the limit', async () => {
    jest.setTimeout(10000); // 10 seconds timeout

    for (let i = 0; i < 5; i++) {
      await rateLimiter.allowRequest('user1');
    }
    expect(await rateLimiter.allowRequest('user1')).toBe(false);
  }, 10000); // 10 seconds timeout
});