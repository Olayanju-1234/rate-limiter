import RateLimiter from '../RateLimiter';
import Redis from 'ioredis';

const redis = new Redis(); // Create a Redis instance

describe('RateLimiter - Redis', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ limit: 5, windowSize: 60000 }, redis); // 5 requests per minute
  });

  afterEach(async () => {
    jest.restoreAllMocks();
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

  it('should count requests made in the same millisecond separately', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    for (let i = 0; i < 5; i++) {
      expect(await rateLimiter.allowRequest('user1')).toBe(true);
    }
    expect(await redis.zcard('rate-limiter:user1')).toBe(5);
    expect(await rateLimiter.allowRequest('user1')).toBe(false);
  });

  it('should support windows that are not a whole number of seconds', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const limiter = new RateLimiter({ limit: 2, windowSize: 1500 }, redis);

    expect(await limiter.allowRequest('user1')).toBe(true);
    expect(await limiter.allowRequest('user1')).toBe(true);
    expect(await limiter.allowRequest('user1')).toBe(false);

    const ttl = await redis.pttl('rate-limiter:user1');
    expect(ttl).toBeGreaterThan(1000);
    expect(ttl).toBeLessThanOrEqual(1500);

    now.mockReturnValue(1_700_000_001_500);
    expect(await limiter.allowRequest('user1')).toBe(true);
  });
});