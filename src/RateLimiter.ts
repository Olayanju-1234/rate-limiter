import Redis from 'ioredis';
import { RateLimiterConfig } from './interfaces/ratelimit';

export default class RateLimiter {
  private redis: Redis;
  private limit: number;
  private windowSize: number;

  constructor(config: RateLimiterConfig, redis: Redis) {
    this.redis = redis;
    this.limit = config.limit;
    this.windowSize = config.windowSize;
  }

  async allowRequest(userId: string): Promise<boolean> {
    const now = Date.now();
    const key = `rate-limiter:${userId}`;

    // Lua script for atomic rate-limiting
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowSize = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])

      -- Remove timestamps outside the current window
      redis.call('zremrangebyscore', key, '-inf', now - windowSize)

      -- Get the number of requests in the current window
      local requestCount = redis.call('zcount', key, now - windowSize, now)

      if requestCount < limit then
        -- Add the current timestamp to the sorted set
        redis.call('zadd', key, now, now)
        -- Set TTL on the key to automatically clean up old data
        redis.call('expire', key, windowSize / 1000)
        return 1 -- Request allowed
      else
        return 0 -- Request denied
      end
    `;

    // Execute the Lua script
    const result = await this.redis.eval(script, 1, key, now, this.windowSize, this.limit);

    return result === 1; // Convert Lua result to boolean
  }
}