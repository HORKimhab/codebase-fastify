// import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
// import fp from 'fastify-plugin'

// declare module 'fastify' {
//   interface FastifyInstance {
//     authenticate: any
//   }
// }

// export default fp(async function (fastify: FastifyInstance) {

//   await fastify.register(require('@fastify/jwt'), {
//     secret: process.env.JWT_SECRET || 'supersecret'
//   })

//   fastify.decorate(
//     'authenticate',
//     async function (request: any, reply: any) {

//       try {
//         await request.jwtVerify()
//       } catch (err) {
//         reply.send(err)
//       }
//     }
//   )
// })
