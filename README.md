# codebase-fastify

Codebase fastify

## HTTP Client Aliases

```bash
# How to use fetch or request
const { uRequest, uFetch} = request;
const response = await uFetch('https://example.com');
const data = await response.json();

# OR
const data = await (await uFetch('https://example.com')).json();

const { uRequest } = request;
const res = await uRequest('https://example.com');

```

## Spam Guard and Rate Limiting

This project now includes:
- `@fastify/rate-limit` for global/per-route throttling
- a custom `onRequest` guard plugin at `src/plugins/spamGuard.ts` for bot/user-agent filtering

### Quick start profile

Use this baseline for most projects:

```env
SPAM_GUARD_ENABLED=true
SPAM_GLOBAL_RATE_LIMIT=true
SPAM_GUARD_DEFAULT_MODE=protect
SPAM_RATE_LIMIT_MAX=60
SPAM_RATE_LIMIT_WINDOW=1m
SPAM_RATE_LIMIT_USE_USER_AGENT=true
SPAM_RATE_LIMIT_USE_CLIENT_ID=true
SPAM_RATE_LIMIT_USE_AUTH_TOKEN=true
SPAM_RATE_LIMIT_CLIENT_ID_HEADER=x-client-id
SPAM_GUARD_REQUIRE_USER_AGENT=false
SPAM_GUARD_STRICT_REQUIRE_USER_AGENT=true
SPAM_GUARD_BLOCKED_AGENTS=curl,wget,python-requests,httpie,scrapy,nikto,sqlmap
SPAM_GUARD_STRICT_BLOCKED_AGENTS=bot,crawler,spider,headless
SPAM_GUARD_SKIP_PREFIXES=/swagger/docs,/ping
```

### Request flow

1. Route mode is resolved from `config.spamGuard` or global `SPAM_GUARD_DEFAULT_MODE`.
2. Prefix skip list is checked (`SPAM_GUARD_SKIP_PREFIXES`).
3. User-agent checks run:
   - blocked signatures list
   - optional required user-agent (normal/strict mode)
4. Rate limit runs if global rate limit is enabled and route did not disable `rateLimit`.
5. Result:
   - `403` for blocked client behavior
   - `429` for rate-limit overflow

### Global settings details

- `SPAM_GUARD_ENABLED`
  - `true`: enable spam guard plugin
  - `false`: disable all spam guard logic
- `SPAM_GLOBAL_RATE_LIMIT`
  - `true`: register global `@fastify/rate-limit`
  - `false`: skip plugin-wide throttling
- `SPAM_GUARD_DEFAULT_MODE`
  - `protect`: normal filtering
  - `strict`: stronger filtering
  - `skip`: route must opt in to filtering
- `SPAM_RATE_LIMIT_MAX`
  - global max requests per key in time window
- `SPAM_RATE_LIMIT_WINDOW`
  - window such as `1m`, `30s`, `5m`

### Identity strategy for rate limit keys

Rate-limit key is composed from:
- request method
- route path
- ip
- optional user-agent
- optional client id header
- optional hashed authorization header

This is controlled by:
- `SPAM_RATE_LIMIT_USE_USER_AGENT`
- `SPAM_RATE_LIMIT_USE_CLIENT_ID`
- `SPAM_RATE_LIMIT_USE_AUTH_TOKEN`
- `SPAM_RATE_LIMIT_CLIENT_ID_HEADER`

### Same public IP scenario

If user1 and user2 share one public IP, they can still have separate buckets when any identity part differs.

Recommended:
1. Keep `SPAM_RATE_LIMIT_USE_CLIENT_ID=true`.
2. Send a stable client identifier header for each user/device.
3. Keep `SPAM_RATE_LIMIT_USE_AUTH_TOKEN=true` for authenticated routes.

Example request headers:

```http
x-client-id: user-001-device-a
authorization: Bearer eyJ...
```

```http
x-client-id: user-002-device-c
authorization: Bearer eyJ...
```

### Route-level configuration

Use route `config` for override per endpoint:

- `spamGuard: 'skip'` or `false`
  - skip guard checks on this route
- `spamGuard: 'protect'` or `true`
  - normal guard checks
- `spamGuard: 'strict'`
  - stricter checks
- `rateLimit: false`
  - no rate limit on this route
- `rateLimit: true`
  - use global rate-limit config
- `rateLimit: { max, timeWindow }`
  - custom route-level rate limit

Examples from this project:
- `/ping` uses `spamGuard: 'skip'` and `rateLimit: false`
- `/login` uses `spamGuard: 'strict'` and `rateLimit: { max: 5, timeWindow: '1m' }`
- `/send-mail` uses `spamGuard: 'strict'` and `rateLimit: { max: 8, timeWindow: '1m' }`

### Error behavior

- `403 Forbidden client`
  - blocked by user-agent or strict spam-guard rule
- `429 Too many requests`
  - rate limit exceeded
  - includes headers:
    - `x-ratelimit-limit`
    - `x-ratelimit-remaining`
    - `x-ratelimit-reset`
    - `retry-after`

### Tuning tips

1. Public read endpoints: start around `60-300/min`.
2. Sensitive endpoints (`login`, `send-mail`, `payment`): start around `5-20/min`.
3. If false positives happen:
   - remove/adjust blocked signatures
   - switch route from `strict` to `protect`
   - raise `max` gradually
4. If abuse is still high:
   - lower route limits
   - require `x-client-id`
   - enforce authenticated tokens sooner

## TODO

- [x] Auth swagger endpoint ✅
- [x] Auto format code ✅
- [x] Middleware to prevent spam requests like curl
- Add route ping
- Signup, Login,
- Init utitls 'simple generate password'
-
