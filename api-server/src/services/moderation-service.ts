import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { grievanceTicketsTable } from "@workspace/db/schema";
import { readStaffQueueCursor, staffQueueAfter, staffQueuePage } from "../utils/staff-queue-page.js";
import { ModerationDecisionsService } from "./moderation-decisions-service.js";

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
  publicRationale: string | null;
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

export class ModerationService extends ModerationDecisionsService {

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

}
