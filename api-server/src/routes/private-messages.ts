import { Router, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import { PrivateChatService } from '../services/private-chat-service.js';
import { PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES, PRIVATE_CHAT_MAX_PUBLIC_KEY_BYTES, PrivateChatError } from '../services/private-chat-validation.js';
import { createResponse } from '../utils/response.js';

const identityBody = z.object({
  publicKey: z.string().min(100).max(PRIVATE_CHAT_MAX_PUBLIC_KEY_BYTES),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
const threadBody = z.object({ recipientId: z.string().uuid() }).strict();
const threadParams = z.object({ threadId: z.string().uuid() }).strict();
const envelopeBody = z.object({ id: z.string().uuid(), ciphertext: z.string().min(100).max(PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES) }).strict();
const pageQuery = z.object({
  after: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
}).strict();

function validate(schema: z.ZodTypeAny, source: 'body' | 'params' | 'query'): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) return res.status(400).json(createResponse('Invalid private chat request', null, {}, ['private_chat_invalid_request']));
    if (source === 'body') req.body = parsed.data;
    return next();
  };
}

/** All failures are static public errors. Never echo a key, envelope or provider/SQL exception. */
function endpoint(work: (req: Request) => Promise<unknown>, message: string, status = 200) {
  return async (req: Request, res: Response) => {
    try {
      const data = await work(req);
      return res.status(status).json(createResponse(message, data));
    } catch (error) {
      if (error instanceof PrivateChatError) return res.status(error.status).json(createResponse(error.message, null, {}, [error.code]));
      return res.status(503).json(createResponse('Private chat is temporarily unavailable', null, {}, ['private_chat_unavailable']));
    }
  };
}

export function createPrivateMessagesRouter(service = new PrivateChatService()) {
  const router = Router();
  // Global API rate limiting also applies to this router at both API mounts.
  router.use('/private-messages', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.get('/private-messages/identity', authenticate, endpoint(req => service.getIdentity(req.user!.id), 'Private chat identity loaded'));
  router.put('/private-messages/identity', authenticate, validate(identityBody, 'body'),
    endpoint(req => service.enrollIdentity(req.user!.id, req.body.publicKey, req.body.fingerprint), 'Private chat identity enrolled'));
  router.post('/private-messages/threads', authenticate, validate(threadBody, 'body'),
    endpoint(req => service.createThread(req.user!.id, req.body.recipientId), 'Private conversation ready', 201));
  router.get('/private-messages/threads', authenticate,
    endpoint(req => service.listThreads(req.user!.id), 'Private conversations loaded'));
  router.get('/private-messages/threads/:threadId', authenticate, validate(threadParams, 'params'),
    endpoint(req => service.getThread(req.user!.id, req.params.threadId as string), 'Private conversation loaded'));
  router.get('/private-messages/threads/:threadId/messages', authenticate, validate(threadParams, 'params'), validate(pageQuery, 'query'),
    endpoint(req => {
      const query = pageQuery.parse(req.query);
      return service.listMessages(req.user!.id, req.params.threadId as string, query.after, query.limit);
    }, 'Encrypted messages loaded'));
  router.post('/private-messages/threads/:threadId/messages', authenticate, validate(threadParams, 'params'), validate(envelopeBody, 'body'),
    endpoint(req => service.sendMessage(req.user!.id, req.params.threadId as string, req.body.id, req.body.ciphertext), 'Encrypted message relayed', 201));
  return router;
}

export default createPrivateMessagesRouter();
