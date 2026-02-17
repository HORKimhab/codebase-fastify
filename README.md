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

### 1) Global spam protection

Set these values in `.env`:

```env
SPAM_GUARD_ENABLED=true
SPAM_GLOBAL_RATE_LIMIT=true
SPAM_GUARD_DEFAULT_MODE=protect
SPAM_GUARD_REQUIRE_USER_AGENT=false
SPAM_GUARD_STRICT_REQUIRE_USER_AGENT=true
SPAM_RATE_LIMIT_MAX=60
SPAM_RATE_LIMIT_WINDOW=1m
SPAM_GUARD_BLOCKED_AGENTS=curl,wget,python-requests,httpie,scrapy,nikto,sqlmap
SPAM_GUARD_STRICT_BLOCKED_AGENTS=bot,crawler,spider,headless
SPAM_GUARD_SKIP_PREFIXES=/swagger/docs,/ping
```

### 2) Exclude specific routes from protection

Use route config:

```ts
config: {
  spamGuard: 'skip',
  rateLimit: false
}
```

Example: `/ping` route.

### 3) Tighten limits on high-risk endpoints

Use strict mode and a lower per-route limit:

```ts
config: {
  spamGuard: 'strict',
  rateLimit: { max: 5, timeWindow: '1m' }
}
```

Examples:
- `/login` is strict with `5/min`
- `/send-mail` is strict with `8/min`

## TODO

- [x] Auth swagger endpoint ✅
- [x] Auto format code ✅
- [x] Middleware to prevent spam requests like curl
- Add route ping
- Signup, Login,
- Init utitls 'simple generate password'
-
