# codebase-fastify

Codebase fastify

### How to use in routes/services now:

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

## TODO

- [x] Auth swagger endpoint ✅
- [x] Auto format code ✅
- Middleware to prevent spam requets like curl
- Add route ping
- Signup, Login,
- Init utitls 'simple generate password'
-
