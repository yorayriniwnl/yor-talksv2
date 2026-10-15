import { and, eq, or } from "drizzle-orm";
import { contentSafetyClassificationsTable, db } from "@workspace/db";
import { CONTENT_CLASSIFICATION_POLICY_VERSION, type ApprovedContentClassification, type ContentEntityType } from "../eligibility/content-policy.js";

export interface ContentClassificationSubject {
  entityType: ContentEntityType;
  entityId: string;
  contentRevision: string;
  contentHash: string;
}

/** Read-only consumer for private, exact-revision classification approvals. */
export class ContentClassificationRepository {
  async findApproved(subjects: ContentClassificationSubject[]): Promise<ApprovedContentClassification[]> {
    const unique = [...new Map(subjects.map(subject => [
      `${subject.entityType}:${subject.entityId}:${subject.contentRevision}:${subject.contentHash}`, subject,
    ])).values()];
    if (!unique.length) return [];
    const rows = await db.select().from(contentSafetyClassificationsTable).where(and(
      eq(contentSafetyClassificationsTable.status, "approved"),
      eq(contentSafetyClassificationsTable.policyVersion, CONTENT_CLASSIFICATION_POLICY_VERSION),
      or(...unique.map(subject => and(
        eq(contentSafetyClassificationsTable.entityType, subject.entityType),
        eq(contentSafetyClassificationsTable.entityId, subject.entityId),
        eq(contentSafetyClassificationsTable.contentRevision, subject.contentRevision),
        eq(contentSafetyClassificationsTable.contentHash, subject.contentHash),
      ))!),
    )).limit(1000);
    return rows as ApprovedContentClassification[];
  }
}
