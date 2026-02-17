// Load .env
import 'dotenv/config'; // 🔥 FIRST LINE

import Fastify from 'fastify';
import swagger from './plugins/swagger';
import { loggerConfig } from './utils/logger';
// import jwt from './plugins/jwt'
import authRoutes from './routes/auth';
import emailRoutes from './routes/email';

async function buildServer() {
  const fastify = Fastify({
    logger: loggerConfig
  });

  await fastify.register(swagger);
  //   await fastify.register(jwt)

  await fastify.register(authRoutes);
  await fastify.register(emailRoutes);

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
