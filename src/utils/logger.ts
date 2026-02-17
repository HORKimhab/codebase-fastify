import type { FastifyServerOptions } from 'fastify';

type LoggerOption = Exclude<FastifyServerOptions['logger'], undefined>;

const environment = process.env.NODE_ENV ?? 'development';
const defaultLogLevel = environment === 'development' ? 'trace' : 'info';
const logLevel = process.env.LOG_LEVEL ?? defaultLogLevel;

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]'
];

const serializers = {
  res(reply: any) {
    return {
      statusCode: reply.statusCode
    };
  },
  req(request: any) {
    return {
      method: request.method,
      url: request.url,
      path: request.routeOptions?.url,
      parameters: request.params,
      headers: request.headers
    };
  }
};

function hasPinoPretty(): boolean {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

function developmentLogger(): Exclude<LoggerOption, boolean | undefined> {
  const baseLogger = {
    level: logLevel,
    redact: redactPaths,
    serializers
  };

  if (!hasPinoPretty()) {
    return baseLogger;
  }

  return {
    ...baseLogger,
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  };
}

const envToLogger: Record<string, LoggerOption> = {
  development: developmentLogger(),
  production: {
    level: logLevel,
    redact: redactPaths,
    serializers
  },
  test: false
};

export const loggerConfig: LoggerOption = envToLogger[environment] ?? true;
