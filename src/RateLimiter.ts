import { randomBytes } from 'crypto';
import Redis, { Result } from 'ioredis';
import { RateLimiterConfig } from './interfaces/ratelimit';

// Lua script for atomic rate-limiting
const SLIDING_WINDOW_SCRIPT = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local windowSize = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local member = ARGV[4]

  -- Remove timestamps outside the current window
  redis.call('zremrangebyscore', key, '-inf', now - windowSize)

  -- Get the number of requests in the current window
  local requestCount = redis.call('zcount', key, now - windowSize, now)

  if requestCount < limit then
    -- Score is the timestamp; the member is unique so same-millisecond requests don't collapse
    redis.call('zadd', key, now, member)
    -- Set TTL on the key to automatically clean up old data
    redis.call('pexpire', key, windowSize)
    return 1 -- Request allowed
  else
    return 0 -- Request denied
  end
`;

declare module 'ioredis' {
  interface RedisCommander<Context> {
    slidingWindowAllow(
      key: string,
      now: number,
      windowSize: number,
      limit: number,
      member: string
    ): Result<number, Context>;
  }
}

export default class RateLimiter {
  private redis: Redis;
  private limit: number;
  private windowSize: number;

  constructor(config: RateLimiterConfig, redis: Redis) {
    this.redis = redis;
    this.limit = config.limit;
    this.windowSize = config.windowSize;
    // Sent once, then run by SHA (EVALSHA); ioredis reloads it if Redis answers NOSCRIPT
    this.redis.defineCommand('slidingWindowAllow', { numberOfKeys: 1, lua: SLIDING_WINDOW_SCRIPT });
  }

  async allowRequest(userId: string): Promise<boolean> {
    const now = Date.now();
    const key = `rate-limiter:${userId}`;
    const member = `${now}-${randomBytes(8).toString('hex')}`;

    const result = await this.redis.slidingWindowAllow(key, now, this.windowSize, this.limit, member);

    return result === 1; // Convert Lua result to boolean
  }
}