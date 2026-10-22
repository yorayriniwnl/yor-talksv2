import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, type DbTransaction } from '@workspace/db';
import { usersTable, reportsTable, grievanceTicketsTable, reportModerationEventsTable,
  moderationDecisionsTable as decisions, moderationEnforcementsTable as enforcements,
  moderationDecisionNoticesTable as notices, moderationAppealsTable as appeals } from '@workspace/db/schema';
import type { AppealStatus, AppealRelationship, ModerationTargetType, RecordDecisionInput,
  ModerationDecisionRecord, ModerationEnforcementRecord, ModerationNoticeRecord, ModerationAppealRecord } from './moderation-service.js';

/** Only these reviewed errors may cross the HTTP boundary. */
export class ModerationWorkflowError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
const missing = () => new ModerationWorkflowError(404, 'moderation_not_found', 'Moderation record not found');
const conflict = (message: string) => new ModerationWorkflowError(409, 'moderation_conflict', message);
const targets = {
  user: { table: 'users', owner: 'id' }, post: { table: 'posts', owner: 'author_id' },
  video: { table: 'videos', owner: 'author_id' }, comment: { table: 'comments', owner: 'author_id' },
  message: { table: 'messages', owner: 'sender_id' },
} as const;

export function publicAppeal(appeal: ModerationAppealRecord) {
  return { id: appeal.id, decisionId: appeal.decisionId, relationship: appeal.relationship,
    statement: appeal.statement, status: appeal.status, rationale: appeal.publicRationale,
    outcomeDecisionId: appeal.outcomeDecisionId, reviewedAt: appeal.reviewedAt,
    createdAt: appeal.createdAt, updatedAt: appeal.updatedAt };
}

/** Durable decisions, private notices and single-review appeals share transaction locks. */
export class ModerationDecisionsService {
  private async requireStaff(tx: DbTransaction, actorId: string) {
    const [actor] = await tx.select({ role: usersTable.role, status: usersTable.accountStatus })
      .from(usersTable).where(eq(usersTable.id, actorId)).for('share');
    if (!actor || !['admin', 'moderator'].includes(actor.role) || actor.status !== 'active') {
      throw new ModerationWorkflowError(403, 'moderation_forbidden', 'Moderation staff access required');
    }
  }

  private async lockTarget(tx: DbTransaction, targetType: ModerationTargetType, targetId: string) {
    // An advisory lock covers the first decision too, when no enforcement row exists.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`moderation:${targetType}:${targetId}`}, 0))`);
  }

  async resolveTargetAuthor(targetType: ModerationTargetType, targetId: string, tx?: DbTransaction): Promise<string | null> {
    const target = targets[targetType];
    if (!target) return null;
    const result = await (tx ?? db).execute(sql`SELECT ${sql.raw(target.owner)} AS owner FROM ${sql.raw(target.table)}
      WHERE id=${targetId}::uuid ${tx ? sql`FOR KEY SHARE` : sql``}`);
    return result.rows[0]?.owner ? String(result.rows[0].owner) : null;
  }

  private async databaseTime(tx: DbTransaction) {
    const result = await tx.execute(sql`SELECT clock_timestamp() AS now`);
    return new Date(result.rows[0].now as Date);
  }

  async recordDecision(input: RecordDecisionInput): Promise<ModerationDecisionRecord> {
    return db.transaction(async tx => {
      await this.requireStaff(tx, input.actorId);
      await this.lockTarget(tx, input.targetType, input.targetId);
      return this.writeDecision(tx, input);
    });
  }

  /** Caller holds the target lock; restoration never alters author deletion or audience. */
  private async writeDecision(tx: DbTransaction, input: RecordDecisionInput): Promise<ModerationDecisionRecord> {
    const authorId = await this.resolveTargetAuthor(input.targetType, input.targetId, tx);
    if (!authorId && input.action !== 'restore') throw missing();
    const now = await this.databaseTime(tx);
    const nowIso = now.toISOString();
    if (input.expiresAt && (!['restrict', 'remove'].includes(input.action) || !Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= now.getTime())) {
      throw new ModerationWorkflowError(400, 'moderation_invalid_expiry', 'Expiry must be in the future on a restriction or removal');
    }
    // User and message enforcement cannot be made partially effective across transports.
    const scope = input.scope ?? 'global';
    if ((input.action === 'remove' || ['user', 'message', 'comment'].includes(input.targetType)) && scope !== 'global') {
      throw new ModerationWorkflowError(400, 'moderation_invalid_scope', 'This target and action require global scope');
    }
    const [report] = input.reportId ? await tx.select().from(reportsTable)
      .where(eq(reportsTable.id, input.reportId)).for('update') : [];
    if (input.reportId && (!report || report.entityType !== input.targetType || report.entityId !== input.targetId)) {
      throw new ModerationWorkflowError(400, 'moderation_report_mismatch', 'The report must refer to the same target');
    }
    if (input.grievanceTicketId) {
      const [ticket] = await tx.select({ id: grievanceTicketsTable.id }).from(grievanceTicketsTable)
        .where(eq(grievanceTicketsTable.id, input.grievanceTicketId)).for('key share');
      if (!ticket) throw missing();
    }
    const [current] = await tx.select().from(enforcements).where(and(
      eq(enforcements.targetType, input.targetType), eq(enforcements.targetId, input.targetId))).for('update');
    if (input.action === 'restore' && !current) throw conflict('There is no restriction to restore');
    const id = randomUUID();
    const [decision] = await tx.insert(decisions).values({ ...input, id,
      reportId: input.reportId ?? null, grievanceTicketId: input.grievanceTicketId ?? null,
      internalNotes: input.internalNotes ?? null, expiresAt: input.expiresAt ?? null, scope, createdAt: nowIso }).returning();
    // A no-action review is evidence about that case, not a replacement of an active sanction.
    if (current && input.action !== 'no_action') {
      await tx.update(decisions).set({ supersededAt: nowIso, supersededBy: id }).where(eq(decisions.id, current.activeDecisionId));
    }
    if (input.action === 'restrict' || input.action === 'remove') {
      const values = { activeDecisionId: id, state: input.action === 'remove' ? 'removed' : 'restricted', scope,
        reason: input.rationale, expiresAt: input.expiresAt ?? null, appliedAt: nowIso, updatedAt: nowIso };
      await tx.insert(enforcements).values({ id: randomUUID(), targetType: input.targetType, targetId: input.targetId, ...values })
        .onConflictDoUpdate({ target: [enforcements.targetType, enforcements.targetId], set: values });
    } else if (input.action === 'restore') {
      await tx.delete(enforcements).where(eq(enforcements.id, current!.id));
    }
    if (report) {
      const status = input.action === 'no_action' ? 'dismissed' : 'resolved';
      await tx.update(reportsTable).set({ status, resolvedAt: nowIso, decisionReason: input.rationale }).where(eq(reportsTable.id, report.id));
      await tx.insert(reportModerationEventsTable).values({ id: randomUUID(), reportId: report.id, moderatorId: input.actorId,
        fromStatus: report.status, toStatus: status, decisionReason: input.rationale, createdAt: nowIso });
    }
    const summaries = {
      remove: `Your ${input.targetType} was removed. ${input.rationale}`,
      restrict: `Your ${input.targetType} was restricted. ${input.rationale}`,
      restore: `The moderation restriction on your ${input.targetType} was lifted. ${input.rationale}`,
      no_action: `The review of your ${input.targetType} concluded with no additional action. ${input.rationale}`,
    };
    // No invented expiry: appeals stay available until an approved policy is implemented.
    if (authorId) await tx.insert(notices).values({ id: randomUUID(), decisionId: id, recipientUserId: authorId, recipientRole: 'author',
      targetType: input.targetType, targetId: input.targetId, safeSummary: summaries[input.action], action: input.action,
      appealEligible: ['restrict', 'remove'].includes(input.action), createdAt: nowIso });
    if (report?.reporterId && report.reporterId !== authorId) {
      await tx.insert(notices).values({ id: randomUUID(), decisionId: id, recipientUserId: report.reporterId, recipientRole: 'reporter',
        targetType: input.targetType, targetId: input.targetId,
        safeSummary: `Your report was reviewed. Outcome: ${input.action.replaceAll('_', ' ')}.`, action: input.action,
        appealEligible: input.action === 'no_action' || input.action === 'restore', createdAt: nowIso });
    }
    return decision as ModerationDecisionRecord;
  }

  async getEnforcement(targetType: ModerationTargetType, targetId: string): Promise<ModerationEnforcementRecord | null> {
    const [row] = await db.select().from(enforcements).where(and(eq(enforcements.targetType, targetType), eq(enforcements.targetId, targetId),
      sql`(${enforcements.expiresAt} IS NULL OR ${enforcements.expiresAt} > clock_timestamp())`)).limit(1);
    return row as ModerationEnforcementRecord ?? null;
  }

  async listDecisionsForTarget(targetType: ModerationTargetType, targetId: string, limit = 50, offset = 0): Promise<ModerationDecisionRecord[]> {
    return await db.select().from(decisions).where(and(eq(decisions.targetType, targetType), eq(decisions.targetId, targetId)))
      .orderBy(desc(decisions.createdAt), desc(decisions.id)).limit(limit).offset(offset) as ModerationDecisionRecord[];
  }

  async listUserNotices(userId: string, limit = 20, offset = 0): Promise<ModerationNoticeRecord[]> {
    return await db.select().from(notices).where(eq(notices.recipientUserId, userId))
      .orderBy(desc(notices.createdAt), desc(notices.id)).limit(limit).offset(offset) as ModerationNoticeRecord[];
  }

  async acknowledgeNotice(noticeId: string, userId: string): Promise<boolean> {
    const rows = await db.update(notices).set({ acknowledgedAt: sql`coalesce(${notices.acknowledgedAt}, clock_timestamp())` })
      .where(and(eq(notices.id, noticeId), eq(notices.recipientUserId, userId))).returning({ id: notices.id });
    return rows.length > 0;
  }

  async submitAppeal(params: { decisionId: string; appellantUserId: string; statement: string; relationship?: AppealRelationship }): Promise<ModerationAppealRecord> {
    return db.transaction(async tx => {
      // The owned notice is the authority, including after deletion of the content.
      const [notice] = await tx.select().from(notices).where(and(eq(notices.decisionId, params.decisionId),
        eq(notices.recipientUserId, params.appellantUserId))).for('update');
      if (!notice) throw missing();
      const now = await this.databaseTime(tx);
      if (!notice.appealEligible || (notice.appealDeadline && Date.parse(notice.appealDeadline) <= now.getTime())) {
        throw new ModerationWorkflowError(403, 'moderation_appeal_unavailable', 'This decision is not open to an appeal from this account');
      }
      if (params.relationship && params.relationship !== notice.recipientRole) {
        throw new ModerationWorkflowError(403, 'moderation_relationship_mismatch', 'The appeal relationship does not match this account');
      }
      const [existing] = await tx.select({ id: appeals.id }).from(appeals).where(and(eq(appeals.decisionId, params.decisionId),
        eq(appeals.appellantUserId, params.appellantUserId)));
      if (existing) throw conflict('An appeal for this decision has already been submitted');
      const [appeal] = await tx.insert(appeals).values({ id: randomUUID(), decisionId: params.decisionId,
        appellantUserId: params.appellantUserId, relationship: notice.recipientRole, statement: params.statement,
        status: 'pending', createdAt: now.toISOString(), updatedAt: now.toISOString() }).returning();
      return appeal as ModerationAppealRecord;
    });
  }

  async listAppeals(status?: AppealStatus, limit = 50, offset = 0): Promise<ModerationAppealRecord[]> {
    return await db.select().from(appeals).where(status ? eq(appeals.status, status) : undefined)
      .orderBy(desc(appeals.createdAt), desc(appeals.id)).limit(limit).offset(offset) as ModerationAppealRecord[];
  }

  async listUserAppeals(userId: string, limit = 20, offset = 0) {
    const rows = await db.select().from(appeals).where(eq(appeals.appellantUserId, userId))
      .orderBy(desc(appeals.createdAt), desc(appeals.id)).limit(limit).offset(offset);
    return (rows as ModerationAppealRecord[]).map(publicAppeal);
  }

  async reviewAppeal(appealId: string, reviewerId: string, review: {
    outcome: 'upheld' | 'reversed' | 'rejected'; reviewerNotes: string; rationale: string;
    action?: 'restore' | 'restrict' | 'remove';
  }): Promise<ModerationAppealRecord> {
    return db.transaction(async tx => {
      await this.requireStaff(tx, reviewerId);
      const [appeal] = await tx.select().from(appeals).where(eq(appeals.id, appealId)).for('update');
      if (!appeal) throw missing();
      if (!['pending', 'under_review'].includes(appeal.status)) throw conflict('Appeal has already been resolved');
      const [original] = await tx.select().from(decisions).where(eq(decisions.id, appeal.decisionId));
      if (!original) throw missing();
      if (original.actorId === reviewerId || appeal.appellantUserId === reviewerId) {
        throw new ModerationWorkflowError(403, 'moderation_independent_review_required', 'A different staff member must review this appeal');
      }
      await this.lockTarget(tx, original.targetType as ModerationTargetType, original.targetId);
      let outcomeDecisionId: string | null = null;
      if (review.outcome === 'reversed') {
        const [current] = await tx.select().from(enforcements).where(and(eq(enforcements.targetType, original.targetType),
          eq(enforcements.targetId, original.targetId))).for('update');
        const action = review.action ?? 'restore';
        if (['restrict', 'remove'].includes(original.action)) {
          // Reversing an old decision must never erase a subsequent decision.
          if (current?.activeDecisionId !== original.id) throw conflict('This decision no longer controls the target restriction');
          if (action !== 'restore') throw conflict('An adverse decision is reversed by restoring its target');
        } else {
          // A reporter may appeal no-action or restoration, but staff must make
          // an explicit new adverse decision, and may not overwrite newer work.
          const [latest] = await tx.select({ id: decisions.id }).from(decisions).where(and(
            eq(decisions.targetType, original.targetType), eq(decisions.targetId, original.targetId)))
            .orderBy(desc(decisions.createdAt), desc(decisions.id)).limit(1);
          if (current || latest?.id !== original.id) throw conflict('A newer decision controls this target');
          if (action === 'restore') throw conflict('Reversing this decision requires an explicit restriction or removal');
        }
        const reversal = await this.writeDecision(tx, { actorId: reviewerId, targetType: original.targetType as ModerationTargetType,
          targetId: original.targetId, action, scope: 'global', rationale: review.rationale,
          internalNotes: review.reviewerNotes, reportId: original.reportId ?? undefined, grievanceTicketId: original.grievanceTicketId ?? undefined });
        outcomeDecisionId = reversal.id;
        if (!['restrict', 'remove'].includes(original.action)) {
          await tx.update(decisions).set({ supersededAt: reversal.createdAt, supersededBy: reversal.id }).where(eq(decisions.id, original.id));
        }
      }
      const now = (await this.databaseTime(tx)).toISOString();
      const [updated] = await tx.update(appeals).set({ status: review.outcome, reviewerId, reviewerNotes: review.reviewerNotes,
        publicRationale: review.rationale, outcomeDecisionId, reviewedAt: now, updatedAt: now }).where(eq(appeals.id, appealId)).returning();
      // Original notices are immutable evidence. Outcomes have their own owner-only projection.
      return updated as ModerationAppealRecord;
    });
  }
}
