import fp from 'fastify-plugin';
import { Agent, fetch as undiciFetch, request as undiciRequest } from 'undici';

export interface HttpClient {
  fetch: (
    input: Parameters<typeof undiciFetch>[0],
    init?: Parameters<typeof undiciFetch>[1]
  ) => ReturnType<typeof undiciFetch>;
  uFetch: (
    input: Parameters<typeof undiciFetch>[0],
    init?: Parameters<typeof undiciFetch>[1]
  ) => ReturnType<typeof undiciFetch>;
  request: typeof undiciRequest;
  uRequest: typeof undiciRequest;
}

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default fp(
  async function httpClientPlugin(fastify) {
    const connectTimeout = toNumber(process.env.HTTP_CONNECT_TIMEOUT_MS, 10_000);
    const keepAliveTimeout = toNumber(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 10_000);
    const keepAliveMaxTimeout = toNumber(process.env.HTTP_KEEP_ALIVE_MAX_TIMEOUT_MS, 60_000);

    const dispatcher = new Agent({
      connect: {
        timeout: connectTimeout
      },
      keepAliveTimeout,
      keepAliveMaxTimeout
    });

    const uFetch: HttpClient['uFetch'] = (input, init) => {
      return undiciFetch(input, { ...init, dispatcher });
    };

    const fetchClient: HttpClient['fetch'] = (input, init) => {
      return undiciFetch(input, { ...init, dispatcher });
    };

    const uRequest: HttpClient['uRequest'] = (url, options) => {
      return undiciRequest(url, { ...options, dispatcher });
    };

    const requestClient: HttpClient['request'] = (url, options) => {
      return undiciRequest(url, { ...options, dispatcher });
    };

    const httpClient: HttpClient = {
      fetch: fetchClient,
      uFetch,
      request: requestClient,
      uRequest
    };

    fastify.decorate('httpClient', httpClient);
    fastify.decorate('uFetch', uFetch);
    fastify.decorate('uRequest', uRequest);

    fastify.decorateRequest('httpClient', {
      getter() {
        return httpClient;
      }
    });
    fastify.decorateRequest('uFetch', {
      getter() {
        return uFetch;
      }
    });
    fastify.decorateRequest('uRequest', {
      getter() {
        return uRequest;
      }
    });

    fastify.addHook('onClose', async () => {
      await dispatcher.close();
    });

    fastify.log.info(
      {
        connectTimeout,
        keepAliveTimeout,
        keepAliveMaxTimeout
      },
      'Undici HTTP client initialized'
    );
  },
  {
    name: 'http-client'
  }
);
