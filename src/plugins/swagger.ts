import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export default fp(async function (fastify: FastifyInstance) {
  const swaggerUser = process.env.SWAGGER_USER?.trim() || 'swagger_bitcoin'
  const swaggerPassword = process.env.SWAGGER_PASSWORD?.trim() || 'swagger_bitcoin_changesaaacad_'
  const secret45 = process.env.SECRET_45?.trim() || 'your_secret_value_45'

  if (!swaggerUser || !swaggerPassword) {
    fastify.log.warn(
      'Swagger UI is locked because SWAGGER_USER or SWAGGER_PASSWORD is missing.'
    )
  }

  function unauthorized(reply: any) {
    reply
      .code(401)
      .header('WWW-Authenticate', 'Basic realm="Swagger Docs"')
      .send({ error: 'Unauthorized' })
  }

  function isAuthorized(headerValue?: string): boolean {
    if (!swaggerUser || !swaggerPassword || !headerValue?.startsWith('Basic ')) return false

    const encoded = headerValue.slice(6).trim()
    const decoded = Buffer.from(encoded, 'base64').toString('utf8')
    const separatorIndex = decoded.indexOf(':')

    if (separatorIndex < 0) return false
    

    const inputUser = decoded.slice(0, separatorIndex)
    const inputPassword = decoded.slice(separatorIndex + 1)

    return inputUser === swaggerUser && inputPassword === `${swaggerPassword}${secret45}`
  }

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
    routePrefix: '/swagger/docs',
    uiHooks: {
      onRequest: (request: any, reply: any, done: () => void) => {
        if (!swaggerUser || !swaggerPassword || !isAuthorized(request.headers.authorization)) {
          return unauthorized(reply)
        }

        done()
      }
    }
  })
})
