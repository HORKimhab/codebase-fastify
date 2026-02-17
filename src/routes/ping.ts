import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/ping', async (_, reply) => {
    return reply.code(200).send({ message: '[Service]: Codebase fastify is running.', time: new Date().toISOString() });
  });
}
