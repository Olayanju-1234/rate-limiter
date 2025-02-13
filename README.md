# Rate Limiter

A rate limiter implementation using TypeScript and Redis.

## Features
- **Fixed window rate limiting**: Limits the number of requests a user can make within a fixed time window.
- **Configurable limit and window size**: Set the maximum number of requests and the time window in milliseconds.
- **Redis-backed**: Supports distributed rate limiting using Redis.
- **Atomic operations**: Uses Lua scripts for atomic Redis operations.
- **Automatic cleanup**: Sets TTL on Redis keys to automatically clean up old data.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/olayanju-1234/rate-limiter.git
   cd rate-limiter
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Start Redis:
   Ensure Redis is running locally or update the Redis connection settings in the code.

## Usage

### Basic Usage

```typescript
import RateLimiter from './RateLimiter';
import Redis from 'ioredis';

// Create a Redis instance
const redis = new Redis();

// Initialize the rate limiter with a limit of 5 requests per minute
const rateLimiter = new RateLimiter({ limit: 5, windowSize: 60000 }, redis);

// Simulate requests
async function testRateLimiter() {
  const userId = 'user1';

  for (let i = 0; i < 6; i++) {
    const allowed = await rateLimiter.allowRequest(userId);
    console.log(`Request ${i + 1}: ${allowed ? 'Allowed' : 'Denied'}`);
  }
}

testRateLimiter();
```

#### Example Output
```
Request 1: Allowed
Request 2: Allowed
Request 3: Allowed
Request 4: Allowed
Request 5: Allowed
Request 6: Denied
```

### Integration with Express

You can integrate the rate limiter into an Express application as middleware:

```typescript
import express from 'express';
import RateLimiter from './RateLimiter';
import Redis from 'ioredis';

const redis = new Redis();
const rateLimiter = new RateLimiter({ limit: 5, windowSize: 60000 }, redis);

const app = express();

app.use(async (req, res, next) => {
  const userId = req.ip; // Use IP address as the user identifier
  const allowed = await rateLimiter.allowRequest(userId);

  if (allowed) {
    next();
  } else {
    res.status(429).json({ message: 'Too many requests' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Configuration

The `RateLimiter` constructor accepts a configuration object with the following properties:

- `limit`: The maximum number of requests allowed in the time window.
- `windowSize`: The time window in milliseconds (e.g., 60000 for 1 minute).

#### Example:

```typescript
const rateLimiter = new RateLimiter({ limit: 10, windowSize: 60000 }, redis);
```

## Testing

Run the tests using Jest:

```bash
yarn test
```

#### Test Output
```
PASS  src/__tests__/RateLimiter.test.ts
  RateLimiter - Redis
    ✓ should allow requests within the limit (87 ms)
    ✓ should deny requests beyond the limit (22 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        2.345 s
Ran all test suites.
```

## Deployment

1. **Build the Project:**
   ```bash
   yarn build
   ```
2. **Run the Application:**
   ```bash
   yarn start
   ```
3. **Deploy to Production:**
   Deploy the application to your preferred platform (e.g., AWS, Heroku, Docker).

## Monitoring

- Use tools like **Prometheus** or **Datadog** to monitor rate-limiting events and Redis performance.
- Set up alerts for high request rates or Redis connection issues.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes.
4. Submit a pull request.

## License

This project is licensed under the **MIT License**. See the LICENSE file for details.

## Acknowledgments

- Inspired by various rate-limiting algorithms and Redis best practices.
- Built with ❤️ using TypeScript and Redis.

