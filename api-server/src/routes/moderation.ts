import { Router, type Request, type Response } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.js';
import { moderationDecisionSchema, moderationAppealSchema, moderationAppealReviewSchema,
  moderationNoticesQuerySchema, moderationHistoryQuerySchema, moderationTargetSchema,
  moderationAppealsQuerySchema, moderationNoticeParamsSchema, moderationAppealParamsSchema } from '../validators/moderation.js';
import { ModerationService } from '../services/moderation-service.js';
import { ModerationWorkflowError, publicAppeal } from '../services/moderation-decisions-service.js';
import { createResponse } from '../utils/response.js';

function endpoint(work: (req: Request) => Promise<unknown>, message: string, status = 200) {
  return async (req: Request, res: Response) => {
    try { return res.status(status).json(createResponse(message, await work(req))); }
    catch (error) {
      if (error instanceof ModerationWorkflowError) return res.status(error.status).json(createResponse(error.message, null, {}, [error.code]));
      return res.status(503).json(createResponse('Moderation is temporarily unavailable', null, {}, ['moderation_unavailable']));
    }
  };
}

export function createModerationRouter(service = new ModerationService()) {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

  router.post('/decisions', authenticate, requireRole('admin', 'moderator'), validateBody(moderationDecisionSchema),
    endpoint(req => service.recordDecision({ ...req.body, actorId: req.user!.id }), 'Moderation decision recorded', 201));
  router.get('/decisions', authenticate, requireRole('admin', 'moderator'), validateQuery(moderationHistoryQuerySchema),
    endpoint(req => { const q = moderationHistoryQuerySchema.parse(req.query);
      return service.listDecisionsForTarget(q.targetType, q.targetId, q.limit, q.offset); }, 'Moderation history loaded'));
  router.get('/enforcements/:targetType/:targetId', authenticate, requireRole('admin', 'moderator'), validateParams(moderationTargetSchema),
    endpoint(req => { const p = moderationTargetSchema.parse(req.params); return service.getEnforcement(p.targetType, p.targetId); }, 'Enforcement loaded'));

  router.get('/notices', authenticate, validateQuery(moderationNoticesQuerySchema),
    endpoint(req => { const q = moderationNoticesQuerySchema.parse(req.query);
      return service.listUserNotices(req.user!.id, q.limit, q.offset); }, 'Decision notices loaded'));
  router.post('/notices/:noticeId/acknowledge', authenticate, validateParams(moderationNoticeParamsSchema),
    endpoint(async req => {
      if (!await service.acknowledgeNotice(req.params.noticeId as string, req.user!.id)) {
        throw new ModerationWorkflowError(404, 'moderation_not_found', 'Moderation record not found');
      }
      return { acknowledged: true };
    }, 'Notice acknowledged'));
  router.post('/appeals', authenticate, validateBody(moderationAppealSchema),
    endpoint(async req => publicAppeal(await service.submitAppeal({ ...req.body, appellantUserId: req.user!.id })), 'Appeal submitted', 201));
  router.get('/appeals/mine', authenticate, validateQuery(moderationNoticesQuerySchema),
    endpoint(req => { const q = moderationNoticesQuerySchema.parse(req.query);
      return service.listUserAppeals(req.user!.id, q.limit, q.offset); }, 'Your appeals loaded'));
  router.get('/appeals', authenticate, requireRole('admin', 'moderator'), validateQuery(moderationAppealsQuerySchema),
    endpoint(req => { const q = moderationAppealsQuerySchema.parse(req.query);
      return service.listAppeals(q.status, q.limit, q.offset); }, 'Appeal queue loaded'));
  router.patch('/appeals/:appealId/review', authenticate, requireRole('admin', 'moderator'), validateParams(moderationAppealParamsSchema),
    validateBody(moderationAppealReviewSchema), endpoint(req => service.reviewAppeal(req.params.appealId as string, req.user!.id, req.body), 'Appeal reviewed'));
  return router;
}

export const moderationRoutes = createModerationRouter();
export default moderationRoutes;
