import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { grievanceTicketsTable } from "@workspace/db/schema";

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
  slaDeadline: string;
  createdAt: string;
  officerNote?: string | null;
}

const BLOCKED_PATTERNS = [
  /kill\s+yourself/i,
  /terrorist/i,
  /child\s+abuse/i,
  /credit\s+card\s+hack/i,
];

const FLAGGED_KEYWORDS = [
  "scam", "phishing", "pirated", "free nitro", "hack tool", "illegal"
];

export class ModerationService {
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
    // 24 hours acknowledgment, 15 days redressal as mandated by Indian IT Rules 2021
    const slaDeadline = new Date(now.getTime() + 15 * 86400 * 1000).toISOString();

    const [ticket] = await db.insert(grievanceTicketsTable).values({
      id: randomUUID(),
      ticketId,
      category: data.category,
      reportedUrl: data.reportedUrl,
      reporterName: data.reporterName,
      reporterEmail: data.reporterEmail,
      description: data.description,
      status: "received",
      slaDeadline,
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
}
