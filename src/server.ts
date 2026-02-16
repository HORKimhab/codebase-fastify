import Fastify from 'fastify'
import swagger from './plugins/swagger'
import jwt from './plugins/jwt'
import authRoutes from './routes/auth'
import emailRoutes from './routes/email'

async function buildServer() {
  const fastify = Fastify({
    logger: true
  })

  await fastify.register(swagger)
  await fastify.register(jwt)

  await fastify.register(authRoutes)
  await fastify.register(emailRoutes)

  return fastify
}

async function start() {
  const server = await buildServer()

  try {
    await server.listen({ port: 3000 })
    console.log('Server running at http://localhost:3000')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
