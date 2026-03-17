# codebase-fastify

Codebase fastify

## Two-Layer Env Encryption

This service supports two encryption layers for configuration:

1. Value-level encryption inside `.env`
2. File-level encryption from `.env` to `.env.enc`

Runtime flow:
- If `.env.enc` exists, the app decrypts it with `ENV_ENCRYPTION_KEY`
- The parsed env values are then scanned for encrypted value payloads
- Any encrypted values are decrypted with `ENV_VALUE_ENCRYPTION_KEY`
- The final plaintext values are loaded into `process.env`
- If `.env.enc` does not exist, the app falls back to `.env` and still decrypts encrypted values inside it

### Keys

- `ENV_ENCRYPTION_KEY`
  - used to decrypt the full `.env.enc` file
- `ENV_VALUE_ENCRYPTION_KEY`
  - used to decrypt selected encrypted values inside the env content

### Commands

Encrypt detected secret values inside `.env`:

```bash
ENV_VALUE_ENCRYPTION_KEY=my-value-key npm run encrypt-env-values
```

The command auto-detects secret-like keys already present in `.env`, such as keys containing `PASS`, `PASSWORD`, `SECRET`, `TOKEN`, `ACCESS_KEY`, `API_KEY`, `PRIVATE_KEY`, or `CLIENT_SECRET`. It skips empty values and values that are already encrypted, then prints a summary of detected, encrypted, and skipped keys.

Encrypt every valid env value:

```bash
ENV_VALUE_ENCRYPTION_KEY=my-value-key npm run encrypt-env-values -- --all
```

Encrypt only specific keys:

```bash
ENV_VALUE_ENCRYPTION_KEY=my-value-key npm run encrypt-env-values -- --only=MAIL_PASS,AWS_SECRET_ACCESS_KEY
```

Decrypt encrypted env values back to plaintext:

```bash
ENV_VALUE_ENCRYPTION_KEY=my-value-key npm run decrypt-env-values
```

Decrypt all encrypted entries found in `.env`:

```bash
ENV_VALUE_ENCRYPTION_KEY=my-value-key npm run decrypt-env-values -- --all
```

Decrypt only specific keys:

```bash
ENV_VALUE_ENCRYPTION_KEY=my-value-key npm run decrypt-env-values -- --only=MAIL_PASS,AWS_SECRET_ACCESS_KEY
```

Encrypt the full `.env` file into `.env.enc`:

```bash
ENV_ENCRYPTION_KEY=my-file-key npm run encrypt-env
```

Run the app with both keys:

```bash
ENV_ENCRYPTION_KEY=my-file-key \
ENV_VALUE_ENCRYPTION_KEY=my-value-key \
npm run dev
```

### Recommended flow

1. Create or update `.env`
2. Encrypt sensitive values inside `.env`
3. Encrypt the full `.env` into `.env.enc`
4. Run the app with both runtime keys

Example:

```env
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
AWS_SECRET_ACCESS_KEY=xxxx
SWAGGER_PASSWORD=change_this_password
SECRET_45=your_secret_value_45
```

Step 1, encrypt selected values:

```bash
ENV_VALUE_ENCRYPTION_KEY=my-value-key npm run encrypt-env-values
```

After this, `.env` will contain encrypted values like:

```env
MAIL_PASS=envval::v1:...
AWS_SECRET_ACCESS_KEY=envval::v1:...
SWAGGER_PASSWORD=envval::v1:...
SECRET_45=envval::v1:...
```

If you want to restore plaintext values later:

```bash
ENV_VALUE_ENCRYPTION_KEY=my-value-key npm run decrypt-env-values -- --all
```

Step 2, encrypt the file:

```bash
ENV_ENCRYPTION_KEY=my-file-key npm run encrypt-env
```

After this, `.env.enc` contains a file payload like:

```text
envfile::v1:...
```

Step 3, run the service:

```bash
ENV_ENCRYPTION_KEY=my-file-key \
ENV_VALUE_ENCRYPTION_KEY=my-value-key \
npm run start
```

### Function reference

- `encryptEnvValue(value, encryptionKey)`
  - encrypts one env value using the value-level format
- `decryptEnvValue(value, encryptionKey)`
  - decrypts one env value that starts with `envval::v1:`
- `detectEncryptableEnvKeys(content)`
  - discovers secret-like env keys from raw `.env` text
- `detectAllEnvKeys(content)`
  - discovers every valid env key from raw `.env` text
- `detectEncryptedEnvKeys(content)`
  - discovers env keys whose values already use the `envval::v1:` format
- `encryptEnvValuesInContent(content, encryptionKey, options)`
  - rewrites env values using `auto`, `all`, or `only` mode and returns detected/encrypted/skipped summaries
- `decryptEnvValuesInContent(content, encryptionKey, options)`
  - rewrites encrypted env values back to plaintext using `auto`, `all`, or `only` mode and returns detected/decrypted/skipped summaries
- `encryptEnvFileContent(content, encryptionKey)`
  - encrypts the full env file content for storage in `.env.enc`
- `decryptEnvFileContent(value, encryptionKey)`
  - decrypts a full `.env.enc` payload back into plaintext env text
- `decryptParsedEnvValues(values, encryptionKey)`
  - decrypts encrypted env entries after parsing env text
- `loadRuntimeEnv(options)`
  - loads `.env.enc` or `.env`, decrypts when needed, and populates `process.env`

### Failure behavior

Startup fails when:

- `.env.enc` exists but `ENV_ENCRYPTION_KEY` is missing or wrong
- an env value uses `envval::v1:` but `ENV_VALUE_ENCRYPTION_KEY` is missing or wrong
- the encrypted file or encrypted value payload is malformed

### Security notes

- Do not store runtime keys inside `.env.enc`
- Prefer providing runtime keys from your shell, CI/CD secrets, Docker secrets, or secret manager
- Use different keys for development, staging, and production
- Re-encrypt `.env` after changing any sensitive value
- Treat `.env.enc` as sensitive deployment data even though it is encrypted

### Dev, Staging, and Production workflow

Use different keys per environment and avoid typing secrets directly into production command lines when possible.

Development:

- Decrypt locally when you need to inspect or edit env values
- Re-encrypt before testing the full secure flow

```bash
export ENV_VALUE_ENCRYPTION_KEY='dev-value-key'
npm run decrypt-env-values -- --all
```

After editing:

```bash
npm run encrypt-env-values -- --all
export ENV_ENCRYPTION_KEY='dev-file-key'
npm run encrypt-env
```

Run the app:

```bash
ENV_ENCRYPTION_KEY='dev-file-key' ENV_VALUE_ENCRYPTION_KEY='dev-value-key' npm run dev
```

Staging:

- Keep `.env` values encrypted and keep `.env.enc` encrypted too
- Decrypt only for temporary debugging or recovery tasks

Normal run:

```bash
ENV_ENCRYPTION_KEY='staging-file-key' ENV_VALUE_ENCRYPTION_KEY='staging-value-key' npm run start
```

Temporary debug session:

```bash
export ENV_VALUE_ENCRYPTION_KEY='staging-value-key'
npm run decrypt-env-values -- --all
```

After debugging:

```bash
npm run encrypt-env-values -- --all
export ENV_ENCRYPTION_KEY='staging-file-key'
npm run encrypt-env
```

Production:

- Prefer runtime decryption only
- Avoid `decrypt-env-values -- --all` unless it is a controlled incident or recovery task
- Do not place secret keys inline in shell history if you can avoid it

Normal run:

```bash
ENV_ENCRYPTION_KEY='prod-file-key' ENV_VALUE_ENCRYPTION_KEY='prod-value-key' npm run start
```

Temporary recovery flow:

```bash
export ENV_VALUE_ENCRYPTION_KEY='prod-value-key'
npm run decrypt-env-values -- --all
unset ENV_VALUE_ENCRYPTION_KEY
```

Re-encrypt after the task:

```bash
export ENV_VALUE_ENCRYPTION_KEY='prod-value-key'
npm run encrypt-env-values -- --all
export ENV_ENCRYPTION_KEY='prod-file-key'
npm run encrypt-env
unset ENV_VALUE_ENCRYPTION_KEY
unset ENV_ENCRYPTION_KEY
```

Best practice summary:

- Development: decrypt when needed
- Staging: decrypt only for troubleshooting
- Production: avoid decrypting and keep secrets encrypted at rest

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
