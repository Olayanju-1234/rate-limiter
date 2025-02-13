import RateLimiter from "./RateLimiter";
import Redis from "ioredis";

const redis = new Redis(); // Create a Redis instance
const rateLimiter = new RateLimiter({ limit: 5, windowSize: 60000 }, redis);

async function testRateLimiter() {
  const userId = "user1";

  for (let i = 0; i < 10; i++) {
    const allowed = await rateLimiter.allowRequest(userId);
    console.log(`Request ${i + 1}: ${allowed ? "Allowed" : "Denied"}`);
  }
}

testRateLimiter();
