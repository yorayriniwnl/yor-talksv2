import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import {
  grievanceTicketsTable,
  reportsTable,
  reportModerationEventsTable,
  moderationDecisionsTable,
  moderationEnforcementsTable,
  moderationDecisionNoticesTable,
  moderationAppealsTable,
  postsTable,
  videosTable,
  commentsTable,
  messagesTable,
  usersTable,
} from "@workspace/db/schema";
import { readStaffQueueCursor, staffQueueAfter, staffQueuePage } from "../utils/staff-queue-page.js";
import { RedisRepository } from "../repositories/redis-repository.js";

export interface ModerationResult {
  isSafe: boolean;
  score: number; // 0 to 1 (1 = fully safe)
  flags: string[];
  action: "approve" | "flag_for_review" | "reject";
}

export interface GrievanceTicket {
  ticketId: string;
  category: "copyright" | "hate_speech" | "harassment" | "impersonation" | "privacy_violation" | "other";
  reportedUrl: string;
  reporterName: string;
  reporterEmail: string;
  description: string;
  status: "received" | "under_review" | "resolved" | "dismissed";
  slaDeadline: string | null;
  createdAt: string;
  officerNote?: string | null;
}

export type ModerationTargetType = "post" | "user" | "comment" | "message" | "video";
export type ModerationAction = "no_action" | "restrict" | "remove" | "restore";
export type ModerationScope = "public" | "direct_only" | "global";
export type ModerationEnforcementState = "restricted" | "removed";
export type AppealRelationship = "author" | "reporter" | "affected_party";
export type AppealStatus = "pending" | "under_review" | "upheld" | "reversed" | "rejected";

export interface RecordDecisionInput {
  actorId: string;
  targetType: ModerationTargetType;
  targetId: string;
  action: ModerationAction;
  scope?: ModerationScope;
  rationale: string;
  internalNotes?: string;
  expiresAt?: string;
  reportId?: string;
  grievanceTicketId?: string;
}

export interface ModerationDecisionRecord {
  id: string;
  reportId: string | null;
  grievanceTicketId: string | null;
  targetType: ModerationTargetType;
  targetId: string;
  action: ModerationAction;
  scope: ModerationScope;
  actorId: string | null;
  rationale: string;
  internalNotes: string | null;
  expiresAt: string | null;
  supersededAt: string | null;
  supersededBy: string | null;
  createdAt: string;
}

export interface ModerationEnforcementRecord {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  activeDecisionId: string;
  state: ModerationEnforcementState;
  scope: ModerationScope;
  reason: string;
  appliedAt: string;
  expiresAt: string | null;
  updatedAt: string;
}

export interface ModerationNoticeRecord {
  id: string;
  decisionId: string;
  recipientUserId: string;
  recipientRole: "author" | "reporter" | "affected_party";
  targetType: ModerationTargetType;
  targetId: string;
  safeSummary: string;
  action: ModerationAction;
  appealEligible: boolean;
  appealDeadline: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface ModerationAppealRecord {
  id: string;
  decisionId: string;
  appellantUserId: string;
  relationship: AppealRelationship;
  statement: string;
  status: AppealStatus;
  reviewerId: string | null;
  reviewerNotes: string | null;
  outcomeDecisionId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const BLOCKED_PATTERNS = [
  /kill\s+yourself/i,
  /terrorist/i,
  /child\s+abuse/i,
  /credit\s+card\s+hack/i,
];

const FLAGGED_KEYWORDS = [
  "scam", "phishing", "pirated", "free nitro", "hack tool", "illegal",
];

export class ModerationService {
  private readonly redis = new RedisRepository();

  /**
   * Screen text or caption for toxicity and safety
   */
  async screenText(text: string): Promise<ModerationResult> {
    const flags: string[] = [];

    // Check critical blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(text)) {
        return {
          isSafe: false,
          score: 0.1,
          flags: ["severe_safety_violation"],
          action: "reject",
        };
      }
    }

    // Check flagged keywords
    const lower = text.toLowerCase();
    for (const kw of FLAGGED_KEYWORDS) {
      if (lower.includes(kw)) {
        flags.push(`flagged_keyword_${kw}`);
      }
    }

    if (flags.length > 0) {
      return {
        isSafe: true,
        score: 0.6,
        flags,
        action: "flag_for_review",
      };
    }

    return {
      isSafe: true,
      score: 0.99,
      flags: [],
      action: "approve",
    };
  }

  /**
   * File a persisted grievance ticket for trust-and-safety review.
   */
  async fileGrievance(data: {
    category: GrievanceTicket["category"];
    reportedUrl: string;
    reporterName: string;
    reporterEmail: string;
    description: string;
  }): Promise<GrievanceTicket> {
    const ticketId = `YT-GRV-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const now = new Date();
    const [ticket] = await db.insert(grievanceTicketsTable).values({
      id: randomUUID(),
      ticketId,
      category: data.category,
      reportedUrl: data.reportedUrl,
      reporterName: data.reporterName,
      reporterEmail: data.reporterEmail,
      description: data.description,
      status: "received",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }).returning();
    return ticket as GrievanceTicket;
  }

  /**
   * Check grievance ticket status
   */
  async getGrievanceStatus(ticketId: string): Promise<GrievanceTicket | null> {
    const [ticket] = await db.select().from(grievanceTicketsTable)
      .where(eq(grievanceTicketsTable.ticketId, ticketId))
      .orderBy(desc(grievanceTicketsTable.createdAt))
      .limit(1);
    return (ticket as GrievanceTicket | undefined) ?? null;
  }

  async listGrievances(status?: GrievanceTicket["status"], cursorValue?: string, limit = 50) {
    const cursor = readStaffQueueCursor(cursorValue, 'grievances', status);
    const rows = await db.select().from(grievanceTicketsTable)
      .where(and(status ? eq(grievanceTicketsTable.status, status) : undefined,
        staffQueueAfter(grievanceTicketsTable.createdAt, grievanceTicketsTable.id, cursor)))
      .orderBy(desc(grievanceTicketsTable.createdAt), desc(grievanceTicketsTable.id))
      .limit(limit + 1);
    return staffQueuePage(rows, limit, 'grievances', status);
  }

  async updateGrievanceStatus(ticketId: string, status: GrievanceTicket["status"], officerNote?: string): Promise<GrievanceTicket | null> {
    const [updated] = await db.update(grievanceTicketsTable)
      .set({
        status,
        ...(officerNote !== undefined ? { officerNote } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(grievanceTicketsTable.ticketId, ticketId))
      .returning();
    return (updated as GrievanceTicket | undefined) ?? null;
  }

  // =========================================================================
  // SUBSTANTIVE MODERATION DECISIONS & ENFORCEMENT
  // =========================================================================

  /**
   * Resolves the authoritative author/owner ID of a target entity.
   */
  async resolveTargetAuthor(targetType: ModerationTargetType, targetId: string): Promise<string | null> {
    try {
      if (targetType === "user") {
        const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, targetId)).limit(1);
        return u?.id ?? null;
      }
      if (targetType === "post") {
        const [p] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, targetId)).limit(1);
        return p?.authorId ?? null;
      }
      if (targetType === "video") {
        const [v] = await db.select({ authorId: videosTable.authorId }).from(videosTable).where(eq(videosTable.id, targetId)).limit(1);
        return v?.authorId ?? null;
      }
      if (targetType === "comment") {
        const [c] = await db.select({ authorId: commentsTable.authorId }).from(commentsTable).where(eq(commentsTable.id, targetId)).limit(1);
        return c?.authorId ?? null;
      }
      if (targetType === "message") {
        const [m] = await db.select({ senderId: messagesTable.senderId }).from(messagesTable).where(eq(messagesTable.id, targetId)).limit(1);
        return m?.senderId ?? null;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Safe summary generation for affected content author.
   * Internal notes, evidence references, and reporter identity are never included.
   */
  private makeAuthorSafeSummary(action: ModerationAction, targetType: ModerationTargetType, rationale: string): string {
    switch (action) {
      case "remove":
        return `Your ${targetType} was removed for violating platform safety standards: ${rationale}`;
      case "restrict":
        return `Your ${targetType} visibility has been restricted: ${rationale}`;
      case "restore":
        return `The restriction on your ${targetType} has been lifted.`;
      case "no_action":
        return `A moderation review regarding your ${targetType} concluded with no action taken.`;
    }
  }

  /**
   * Safe summary generation for reporter.
   * Internal staff notes, evidence, and author personal identity are never exposed.
   */
  private makeReporterSafeSummary(action: ModerationAction, targetType: ModerationTargetType): string {
    switch (action) {
      case "remove":
        return `A report you submitted regarding a ${targetType} was resolved. The content has been removed following a safety review.`;
      case "restrict":
        return `A report you submitted regarding a ${targetType} was resolved. Content visibility has been restricted following a safety review.`;
      case "restore":
        return `A restriction on a reported ${targetType} has been reviewed and updated.`;
      case "no_action":
        return `A review of the reported ${targetType} concluded with no violation found under applicable policy.`;
    }
  }

  /**
   * Calculates appeal deadline based on operator policy.
   * If operator has configured an appeal window (e.g. 14 days), compute deadline; otherwise null.
   */
  private calculateAppealDeadline(baseDate: Date): string | null {
    const appealWindowDays = process.env.MODERATION_APPEAL_WINDOW_DAYS
      ? parseInt(process.env.MODERATION_APPEAL_WINDOW_DAYS, 10)
      : null;
    if (appealWindowDays && Number.isFinite(appealWindowDays) && appealWindowDays > 0) {
      const deadline = new Date(baseDate.getTime() + appealWindowDays * 24 * 60 * 60 * 1000);
      return deadline.toISOString();
    }
    return null;
  }

  /**
   * Records an explicit, attributable moderation decision and applies or updates enforcements.
   * Handles target locks, previous decision supersession, notice generation, and cache invalidation.
   */
  async recordDecision(input: RecordDecisionInput): Promise<ModerationDecisionRecord> {
    const now = new Date();
    const nowIso = now.toISOString();
    const decisionId = randomUUID();
    const scope: ModerationScope = input.scope ?? "global";

    return await db.transaction(async (tx) => {
      // 1. Check for any current active enforcement on this target
      const [existingEnforcement] = await tx
        .select()
        .from(moderationEnforcementsTable)
        .where(
          and(
            eq(moderationEnforcementsTable.targetType, input.targetType),
            eq(moderationEnforcementsTable.targetId, input.targetId)
          )
        )
        .for("update");

      // 2. If an active decision exists on this target, mark it as superseded
      if (existingEnforcement?.activeDecisionId) {
        await tx
          .update(moderationDecisionsTable)
          .set({
            supersededAt: nowIso,
            supersededBy: decisionId,
          })
          .where(eq(moderationDecisionsTable.id, existingEnforcement.activeDecisionId));
      }

      // 3. Insert the new substantive decision
      const [decision] = await tx
        .insert(moderationDecisionsTable)
        .values({
          id: decisionId,
          reportId: input.reportId ?? null,
          grievanceTicketId: input.grievanceTicketId ?? null,
          targetType: input.targetType,
          targetId: input.targetId,
          action: input.action,
          scope,
          actorId: input.actorId,
          rationale: input.rationale,
          internalNotes: input.internalNotes ?? null,
          expiresAt: input.expiresAt ?? null,
          createdAt: nowIso,
        })
        .returning();

      // 4. Update or clear active enforcement in moderation_enforcements
      if (input.action === "restrict" || input.action === "remove") {
        const state: ModerationEnforcementState = input.action === "restrict" ? "restricted" : "removed";
        await tx
          .insert(moderationEnforcementsTable)
          .values({
            id: randomUUID(),
            targetType: input.targetType,
            targetId: input.targetId,
            activeDecisionId: decisionId,
            state,
            scope,
            reason: input.rationale,
            appliedAt: nowIso,
            expiresAt: input.expiresAt ?? null,
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: [moderationEnforcementsTable.targetType, moderationEnforcementsTable.targetId],
            set: {
              activeDecisionId: decisionId,
              state,
              scope,
              reason: input.rationale,
              appliedAt: nowIso,
              expiresAt: input.expiresAt ?? null,
              updatedAt: nowIso,
            },
          });
      } else if (input.action === "restore") {
        // Reversal removes only the moderation restriction; it never alters author deletion, audience, etc.
        await tx
          .delete(moderationEnforcementsTable)
          .where(
            and(
              eq(moderationEnforcementsTable.targetType, input.targetType),
              eq(moderationEnforcementsTable.targetId, input.targetId)
            )
          );
      }

      // 5. Update linked report status if reportId is provided
      if (input.reportId) {
        const [currentReport] = await tx
          .select()
          .from(reportsTable)
          .where(eq(reportsTable.id, input.reportId))
          .for("update");

        if (currentReport) {
          const toStatus = input.action === "no_action" ? "dismissed" : "resolved";
          await tx
            .update(reportsTable)
            .set({
              status: toStatus,
              resolvedAt: nowIso,
              decisionReason: input.rationale,
            })
            .where(eq(reportsTable.id, input.reportId));

          await tx.insert(reportModerationEventsTable).values({
            id: randomUUID(),
            reportId: currentReport.id,
            moderatorId: input.actorId,
            fromStatus: currentReport.status,
            toStatus,
            decisionReason: input.rationale,
            createdAt: nowIso,
          });
        }
      }

      // 6. Generate private, safe decision notices
      const authorId = await this.resolveTargetAuthor(input.targetType, input.targetId);
      const appealDeadline = this.calculateAppealDeadline(now);

      if (authorId) {
        const authorSafeSummary = this.makeAuthorSafeSummary(input.action, input.targetType, input.rationale);
        const appealEligible = input.action === "restrict" || input.action === "remove";

        await tx
          .insert(moderationDecisionNoticesTable)
          .values({
            id: randomUUID(),
            decisionId,
            recipientUserId: authorId,
            recipientRole: "author",
            targetType: input.targetType,
            targetId: input.targetId,
            safeSummary: authorSafeSummary,
            action: input.action,
            appealEligible,
            appealDeadline,
            createdAt: nowIso,
          })
          .onConflictDoNothing();
      }

      if (input.reportId) {
        const [report] = await tx
          .select({ reporterId: reportsTable.reporterId })
          .from(reportsTable)
          .where(eq(reportsTable.id, input.reportId))
          .limit(1);

        if (report?.reporterId && report.reporterId !== authorId) {
          const reporterSafeSummary = this.makeReporterSafeSummary(input.action, input.targetType);

          await tx
            .insert(moderationDecisionNoticesTable)
            .values({
              id: randomUUID(),
              decisionId,
              recipientUserId: report.reporterId,
              recipientRole: "reporter",
              targetType: input.targetType,
              targetId: input.targetId,
              safeSummary: reporterSafeSummary,
              action: input.action,
              appealEligible: false,
              appealDeadline: null,
              createdAt: nowIso,
            })
            .onConflictDoNothing();
        }
      }

      // 7. Invalidate caches asynchronously / best effort
      try {
        await this.redis.del(`moderation:${input.targetType}:${input.targetId}`);
        await this.redis.del(`post:${input.targetId}`);
        await this.redis.del(`video:${input.targetId}`);
      } catch {
        // Cache invalidation errors must not abort database transaction
      }

      return decision as ModerationDecisionRecord;
    });
  }

  /**
   * Retrieves active enforcement record for target if one exists and has not expired.
   */
  async getEnforcement(targetType: ModerationTargetType, targetId: string): Promise<ModerationEnforcementRecord | null> {
    const [row] = await db
      .select()
      .from(moderationEnforcementsTable)
      .where(
        and(
          eq(moderationEnforcementsTable.targetType, targetType),
          eq(moderationEnforcementsTable.targetId, targetId)
        )
      )
      .limit(1);

    if (!row) return null;

    if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return row as ModerationEnforcementRecord;
  }

  /**
   * Lists decision history for a target.
   */
  async listDecisionsForTarget(targetType: ModerationTargetType, targetId: string): Promise<ModerationDecisionRecord[]> {
    const rows = await db
      .select()
      .from(moderationDecisionsTable)
      .where(
        and(
          eq(moderationDecisionsTable.targetType, targetType),
          eq(moderationDecisionsTable.targetId, targetId)
        )
      )
      .orderBy(desc(moderationDecisionsTable.createdAt));

    return rows as ModerationDecisionRecord[];
  }

  /**
   * Retrieves private decision notices for a user.
   */
  async listUserNotices(userId: string, limit = 20, offset = 0): Promise<ModerationNoticeRecord[]> {
    const rows = await db
      .select()
      .from(moderationDecisionNoticesTable)
      .where(eq(moderationDecisionNoticesTable.recipientUserId, userId))
      .orderBy(desc(moderationDecisionNoticesTable.createdAt))
      .limit(limit)
      .offset(offset);

    return rows as ModerationNoticeRecord[];
  }

  /**
   * Acknowledges a decision notice.
   */
  async acknowledgeNotice(noticeId: string, userId: string): Promise<boolean> {
    const [updated] = await db
      .update(moderationDecisionNoticesTable)
      .set({ acknowledgedAt: new Date().toISOString() })
      .where(
        and(
          eq(moderationDecisionNoticesTable.id, noticeId),
          eq(moderationDecisionNoticesTable.recipientUserId, userId)
        )
      )
      .returning();

    return Boolean(updated);
  }

  // =========================================================================
  // APPEALS & REVIEW WORKFLOW
  // =========================================================================

  /**
   * Submits an appeal linked to an original decision.
   * Verifies appellant authority, relation to content, and appeal deadline.
   */
  async submitAppeal(params: {
    decisionId: string;
    appellantUserId: string;
    statement: string;
    relationship?: AppealRelationship;
  }): Promise<ModerationAppealRecord> {
    const now = new Date();
    const nowIso = now.toISOString();

    const [decision] = await db
      .select()
      .from(moderationDecisionsTable)
      .where(eq(moderationDecisionsTable.id, params.decisionId))
      .limit(1);

    if (!decision) {
      throw new Error("Decision not found");
    }

    // Determine and verify relationship
    const authorId = await this.resolveTargetAuthor(decision.targetType as ModerationTargetType, decision.targetId);
    let verifiedRelationship: AppealRelationship = "affected_party";

    if (authorId === params.appellantUserId) {
      verifiedRelationship = "author";
    } else if (decision.reportId) {
      const [report] = await db
        .select({ reporterId: reportsTable.reporterId })
        .from(reportsTable)
        .where(eq(reportsTable.id, decision.reportId))
        .limit(1);
      if (report?.reporterId === params.appellantUserId) {
        verifiedRelationship = "reporter";
      }
    }

    // Check notice for deadline
    const [notice] = await db
      .select()
      .from(moderationDecisionNoticesTable)
      .where(
        and(
          eq(moderationDecisionNoticesTable.decisionId, params.decisionId),
          eq(moderationDecisionNoticesTable.recipientUserId, params.appellantUserId)
        )
      )
      .limit(1);

    if (notice?.appealDeadline && new Date(notice.appealDeadline).getTime() < now.getTime()) {
      throw new Error("The appeal deadline for this decision has passed");
    }

    // Check for existing pending appeal
    const [existingAppeal] = await db
      .select()
      .from(moderationAppealsTable)
      .where(
        and(
          eq(moderationAppealsTable.decisionId, params.decisionId),
          eq(moderationAppealsTable.appellantUserId, params.appellantUserId),
          inArray(moderationAppealsTable.status, ["pending", "under_review"])
        )
      )
      .limit(1);

    if (existingAppeal) {
      throw new Error("An appeal for this decision is already pending review");
    }

    const [appeal] = await db
      .insert(moderationAppealsTable)
      .values({
        id: randomUUID(),
        decisionId: params.decisionId,
        appellantUserId: params.appellantUserId,
        relationship: params.relationship ?? verifiedRelationship,
        statement: params.statement,
        status: "pending",
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();

    return appeal as ModerationAppealRecord;
  }

  /**
   * Lists appeals for staff review.
   */
  async listAppeals(status?: AppealStatus, limit = 50): Promise<ModerationAppealRecord[]> {
    const rows = await db
      .select()
      .from(moderationAppealsTable)
      .where(status ? eq(moderationAppealsTable.status, status) : undefined)
      .orderBy(desc(moderationAppealsTable.createdAt))
      .limit(limit);

    return rows as ModerationAppealRecord[];
  }

  /**
   * Reviews an appeal, recording the outcome and executing any enforceable reversal.
   */
  async reviewAppeal(
    appealId: string,
    reviewerId: string,
    review: {
      outcome: "upheld" | "reversed" | "rejected";
      reviewerNotes: string;
      rationale?: string;
    }
  ): Promise<ModerationAppealRecord> {
    const now = new Date();
    const nowIso = now.toISOString();

    return await db.transaction(async (tx) => {
      const [appeal] = await tx
        .select()
        .from(moderationAppealsTable)
        .where(eq(moderationAppealsTable.id, appealId))
        .for("update");

      if (!appeal) {
        throw new Error("Appeal not found");
      }

      if (["upheld", "reversed", "rejected"].includes(appeal.status)) {
        throw new Error("Appeal has already been resolved");
      }

      let outcomeDecisionId: string | null = null;

      // If the appeal is reversed, lift the restriction and record an attributable reversal decision
      if (review.outcome === "reversed") {
        const [originalDecision] = await tx
          .select()
          .from(moderationDecisionsTable)
          .where(eq(moderationDecisionsTable.id, appeal.decisionId))
          .limit(1);

        if (originalDecision) {
          const reversalDecisionId = randomUUID();
          outcomeDecisionId = reversalDecisionId;

          // Supersede the original decision
          await tx
            .update(moderationDecisionsTable)
            .set({
              supersededAt: nowIso,
              supersededBy: reversalDecisionId,
            })
            .where(eq(moderationDecisionsTable.id, originalDecision.id));

          // Record restoration decision
          await tx.insert(moderationDecisionsTable).values({
            id: reversalDecisionId,
            reportId: originalDecision.reportId,
            grievanceTicketId: originalDecision.grievanceTicketId,
            targetType: originalDecision.targetType,
            targetId: originalDecision.targetId,
            action: "restore",
            scope: "global",
            actorId: reviewerId,
            rationale: review.rationale || `Appeal upheld upon review: ${review.reviewerNotes}`,
            internalNotes: review.reviewerNotes,
            createdAt: nowIso,
          });

          // Lift enforcement (without un-deleting author-deleted content or bypassing age/audience rules)
          await tx
            .delete(moderationEnforcementsTable)
            .where(
              and(
                eq(moderationEnforcementsTable.targetType, originalDecision.targetType),
                eq(moderationEnforcementsTable.targetId, originalDecision.targetId)
              )
            );

          // Create notification notice for appellant
          await tx.insert(moderationDecisionNoticesTable).values({
            id: randomUUID(),
            decisionId: reversalDecisionId,
            recipientUserId: appeal.appellantUserId,
            recipientRole: appeal.relationship as any,
            targetType: originalDecision.targetType,
            targetId: originalDecision.targetId,
            safeSummary: `Your appeal was accepted. The restriction on your ${originalDecision.targetType} has been lifted.`,
            action: "restore",
            appealEligible: false,
            createdAt: nowIso,
          });

          // Invalidate cache
          try {
            await this.redis.del(`moderation:${originalDecision.targetType}:${originalDecision.targetId}`);
            await this.redis.del(`post:${originalDecision.targetId}`);
            await this.redis.del(`video:${originalDecision.targetId}`);
          } catch {}
        }
      } else {
        // Upheld or rejected: notice for appellant
        const [originalDecision] = await tx
          .select()
          .from(moderationDecisionsTable)
          .where(eq(moderationDecisionsTable.id, appeal.decisionId))
          .limit(1);

        if (originalDecision) {
          await tx.insert(moderationDecisionNoticesTable).values({
            id: randomUUID(),
            decisionId: originalDecision.id,
            recipientUserId: appeal.appellantUserId,
            recipientRole: appeal.relationship as any,
            targetType: originalDecision.targetType,
            targetId: originalDecision.targetId,
            safeSummary: `Your appeal regarding ${originalDecision.targetType} was reviewed and the moderation decision was ${review.outcome}.`,
            action: originalDecision.action as any,
            appealEligible: false,
            createdAt: nowIso,
          });
        }
      }

      const [updatedAppeal] = await tx
        .update(moderationAppealsTable)
        .set({
          status: review.outcome,
          reviewerId,
          reviewerNotes: review.reviewerNotes,
          outcomeDecisionId,
          reviewedAt: nowIso,
          updatedAt: nowIso,
        })
        .where(eq(moderationAppealsTable.id, appealId))
        .returning();

      return updatedAppeal as ModerationAppealRecord;
    });
  }
}
