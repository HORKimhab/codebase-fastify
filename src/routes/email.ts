import type { FastifyInstance } from "fastify";
import { mailService } from "../services/mail/MailService";

export default async function (fastify: FastifyInstance) {
  fastify.post(
    "/send-mail",
    {
      config: {
        public: true, // 👈 Skip JWT
      },
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
    },
    
    async (request, reply) => {
      const { to, subject, text, html } = request.body as any;

      try {
        const info = await mailService.send({
          to,
          subject,
          text,
          html,
        });

        return {
          success: true,
          messageId: info.messageId,
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Mail failed" });
      }
    }
  );
}
