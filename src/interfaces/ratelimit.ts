export interface RateLimiterConfig {
  limit: number;
  windowSize: number; // in milliseconds
}

export default interface IRateLimiter {
  allowRequest(userId: string): boolean | Promise<boolean>;
}
