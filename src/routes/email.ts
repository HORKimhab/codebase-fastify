import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {

  fastify.post('/send-email', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Email'],
      description: 'Send email (Protected)',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['to', 'subject'],
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' },
          text: { type: 'string' },
          html: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {

    const { to, subject, text, html } = request.body as {
      to: string
      subject: string
      text?: string
      html?: string
    }

    // SES logic will go here

    return {
      success: true,
      message: `Email sent to ${to}`
    }
  })
}
