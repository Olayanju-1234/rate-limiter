# rate-limiter

A distributed rate limiter for Node.js. Every app instance shares one Redis. Each decision is a single Lua script, so concurrent requests from different instances can't race between reading the count and recording the request.

**Algorithm:** sliding-window log &nbsp;·&nbsp; **Stack:** TypeScript, ioredis, Redis, Jest

## How it works

Each client key (user id, API key, IP) is a Redis sorted set of request timestamps. For every request, one Lua script runs these steps:

```mermaid
flowchart LR
    A["allowRequest(id)"] --> B["ZREMRANGEBYSCORE<br/>drop timestamps older<br/>than now − window"]
    B --> C["ZCOUNT<br/>requests still in window"]
    C -->|under limit| D["ZADD now<br/>EXPIRE window"]
    D --> E["return 1 · allowed"]
    C -->|limit reached| F["return 0 · denied"]
```

Redis executes a script as one command, so the trim, count and add happen atomically. Two app instances serving the same client at the same moment can't both see `limit − 1` and both let a request through. The `EXPIRE` lets idle keys clean themselves up. Denied requests aren't recorded, so a client that keeps retrying is only held back until its oldest request ages out.

### Why a sliding log rather than a fixed window

A fixed-window counter (`INCR` + `EXPIRE`) is cheaper, but it allows up to twice the limit across a window boundary: `limit` requests at 0:59 and `limit` more at 1:00. The sliding log counts exactly the last `windowSize` milliseconds at every instant. It costs O(limit) memory per active key instead of one integer, which is fine for per-user API limits. For very high limits, a token bucket or sliding-window counter is the better trade.

## Usage

```typescript
import Redis from 'ioredis';
import RateLimiter from './RateLimiter';

const redis = new Redis(process.env.REDIS_URL);
const limiter = new RateLimiter({ limit: 5, windowSize: 60_000 }, redis); // 5 requests per minute

const allowed = await limiter.allowRequest('user-42');
```

| Option | Meaning |
|--------|---------|
| `limit` | Maximum requests allowed inside any window |
| `windowSize` | Window length in milliseconds. Use a whole number of seconds (see limitations) |

### As Express middleware

```typescript
app.use(async (req, res, next) => {
  const allowed = await limiter.allowRequest(req.ip ?? 'anonymous');
  if (!allowed) return res.status(429).json({ message: 'Too many requests' });
  next();
});
```

## Run it

```bash
docker run --rm -d -p 6379:6379 redis:7   # throwaway Redis: the tests call FLUSHALL
npm install
npm test                                  # allows 5, denies the 6th
npm run build && npm start                # demo: 10 requests against a limit of 5
```

## Known limitations

- **Same-millisecond requests.** The sorted-set member is the timestamp itself, so two allowed requests for one key in the same millisecond collapse into one entry. Using `timestamp-random` as the member fixes it.
- **Whole-second windows.** The TTL is set with `EXPIRE windowSize / 1000`, so a window like 1,500 ms makes Redis reject the script. Switching to `PEXPIRE` allows any window.
- **Script sent on every call.** Registering it once with `defineCommand` (`EVALSHA`) would save bandwidth.

## License

MIT
