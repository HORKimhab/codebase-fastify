import '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any
  }

  interface RouteConfig {
    public?: boolean
  }
}
