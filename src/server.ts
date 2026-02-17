// Load .env
import 'dotenv/config'; // 🔥 FIRST LINE

import Fastify from 'fastify';
import swagger from './plugins/swagger';
// import jwt from './plugins/jwt'
import authRoutes from './routes/auth';
import emailRoutes from './routes/email';

async function buildServer() {
  const fastify = Fastify({
    logger: true
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
    console.log(`Server running at http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
