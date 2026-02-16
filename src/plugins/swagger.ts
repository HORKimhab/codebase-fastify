import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export default fp(async function (fastify: FastifyInstance) {
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Fastify SES API',
        version: '1.0.0',
        description: 'API documentation with JWT auth'
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  })

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs'
  })
})
