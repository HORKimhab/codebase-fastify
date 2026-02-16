import '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any
  }
}
