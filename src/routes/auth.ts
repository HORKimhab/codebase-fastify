import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {

  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      description: 'Login and get JWT token',
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {

    const { username, password } = request.body as {
      username: string
      password: string
    }

    if (username === 'admin' && password === 'password') {
      const token = fastify.jwt.sign({ username })
      return { token }
    }

    return reply.code(401).send({ error: 'Invalid credentials' })
  })
}
