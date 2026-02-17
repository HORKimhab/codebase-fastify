import '@fastify/jwt'
import type { HttpClient } from '../plugins/httpClient'

interface SpamRateLimitConfig {
  max?: number
  timeWindow?: number | string
}

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
    spamGuard?: boolean | 'skip' | 'protect' | 'strict'
    rateLimit?: boolean | SpamRateLimitConfig
  }
}
