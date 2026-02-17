import '@fastify/jwt'
import type { HttpClient } from '../plugins/httpClient'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any
    httpClient: HttpClient
    uFetch: HttpClient['uFetch']
    uRequest: HttpClient['uRequest']
  }

  interface FastifyRequest {
    httpClient: HttpClient
    uFetch: HttpClient['uFetch']
    uRequest: HttpClient['uRequest']
  }

  interface RouteConfig {
    public?: boolean
  }
}
