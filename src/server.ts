// Load .env
import 'dotenv/config'; // 🔥 FIRST LINE
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import httpClient from './plugins/httpClient';
import swagger from './plugins/swagger';
import { loggerConfig } from './utils/logger';
// import jwt from './plugins/jwt'

type RoutePlugin = (fastify: FastifyInstance) => Promise<unknown> | unknown;

function isRouteFile(fileName: string): boolean {
  if (fileName.endsWith('.d.ts') || fileName.endsWith('.map')) {
    return false;
  }

  return ['.js', '.ts', '.mjs', '.cjs'].includes(extname(fileName));
}

async function registerRoutes(fastify: FastifyInstance) {
  const routesDir = join(__dirname, 'routes');
  fastify.log.debug({ routesDir }, 'Scanning routes directory');

  const entries = await readdir(routesDir, { withFileTypes: true });

  const routeFiles = entries
    .filter((entry) => entry.isFile() && isRouteFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  fastify.log.debug({ count: routeFiles.length, routeFiles }, 'Route files discovered');

  for (const fileName of routeFiles) {
    const routeFilePath = join(routesDir, fileName);
    fastify.log.debug({ fileName }, 'Loading route file');
    fastify.log.trace({ routeFilePath }, 'Resolving route module path');

    const routeModule = await import(routeFilePath);
    const routePlugin = (routeModule.default ?? routeModule) as RoutePlugin;

    if (typeof routePlugin !== 'function') {
      fastify.log.warn({ fileName }, 'Skipping route file without default export function');
      continue;
    }

    await fastify.register(routePlugin as any);
    fastify.log.debug({ fileName }, 'Route loaded');
  }

  fastify.log.info({ count: routeFiles.length }, 'Route registration completed');
}

async function buildServer() {
  const fastify = Fastify({
    logger: loggerConfig
  });

  await fastify.register(httpClient);
  await fastify.register(swagger);
  //   await fastify.register(jwt)

  await registerRoutes(fastify);

  return fastify;
}

async function start() {
  const server = await buildServer();

  const PORT = process.env.APP_PORT || 3000;

  try {
    await server.listen({ port: Number(PORT) });
    server.log.info(`Server running at port ${PORT}`);
  } catch (err) {
    server.log.error({ err }, 'Server failed to start');
    process.exit(1);
  }
}

start();
