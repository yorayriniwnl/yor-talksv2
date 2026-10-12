import { db, type DbTransaction } from '@workspace/db';
import { sql, type SQL } from 'drizzle-orm';
import type { EligibilityAssessment, GuardianAuthorization } from '../features/eligibility-policy.js';

export interface ContactRecord {
  id: string; userAId: string; userBId: string; requestedBy: string; status: string;
  policyVersions: Record<string, string>; recipientAcceptedAt: string | null; acceptedAt: string | null;
}
export interface AuthorityUser { id: string; accountStatus: string | null; termsVersion: string | null; termsAcceptedAt: string | null; blockedUsers: string[] }
export interface ContactApproval { contactId: string; childId: string; guardianId: string; authorizationId: string }
export interface AuthorityContext {
  users: AuthorityUser[]; assessments: EligibilityAssessment[]; guardians: Array<GuardianAuthorization & { issuer: string }>;
  contacts: ContactRecord[]; approvals: ContactApproval[];
}
export interface GroupInvitation { id: string; conversationId: string; inviteeId: string; invitedBy: string | null; status: string }
export async function authorityRows<T>(tx: DbTransaction, query: SQL): Promise<T[]> {
  return (await tx.execute(query)).rows as T[];
}
const contactColumns = sql`id,user_a_id AS "userAId",user_b_id AS "userBId",requested_by AS "requestedBy",status,
  policy_versions AS "policyVersions",recipient_accepted_at::text AS "recipientAcceptedAt",accepted_at::text AS "acceptedAt"`;
const invitationColumns = sql`id,conversation_id AS "conversationId",invitee_id AS "inviteeId",invited_by AS "invitedBy",status`;

export class ContactAuthorityRepository {
  async lockContext(tx: DbTransaction, participantIds: string[]): Promise<AuthorityContext> {
    const ids = [...new Set(participantIds)].sort();
    // All contact mutations acquire accounts first in a deterministic order;
    // existing block/erasure operations already acquire these same row locks.
    const users = await authorityRows<AuthorityUser>(tx, sql`SELECT id,account_status AS "accountStatus",terms_version AS "termsVersion",
      terms_accepted_at::text AS "termsAcceptedAt",coalesce(blocked_users,'[]'::jsonb) AS "blockedUsers"
      FROM users WHERE id=ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`);
    const assessments = await authorityRows<EligibilityAssessment>(tx, sql`SELECT id,user_id AS "userId",status,issuer,country,
      policy_version AS "policyVersion",thresholds,verified_at::text AS "verifiedAt",expires_at::text AS "expiresAt",evidence_reference AS "evidenceReference"
      FROM eligibility_assessments WHERE user_id=ANY(${ids}::uuid[]) ORDER BY user_id,created_at DESC,id DESC FOR SHARE`);
    const guardians = await authorityRows<AuthorityContext['guardians'][number]>(tx, sql`SELECT id,child_id AS "childId",guardian_id AS "guardianId",status,
      parental_responsibility_verified AS "parentalResponsibilityVerified",purposes,policy_version AS "policyVersion",notice_version AS "noticeVersion",
      expires_at::text AS "expiresAt",issuer FROM guardian_authorizations WHERE child_id=ANY(${ids}::uuid[]) ORDER BY id FOR SHARE`);
    const contacts = await authorityRows<ContactRecord>(tx, sql`SELECT ${contactColumns} FROM contact_authorities
      WHERE user_a_id=ANY(${ids}::uuid[]) AND user_b_id=ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`);
    const contactIds = contacts.map(contact => contact.id);
    const approvals = contactIds.length ? await authorityRows<ContactApproval>(tx, sql`SELECT contact_id AS "contactId",child_id AS "childId",
      guardian_id AS "guardianId",authorization_id AS "authorizationId" FROM contact_guardian_approvals
      WHERE contact_id=ANY(${contactIds}::uuid[]) ORDER BY contact_id,child_id FOR SHARE`) : [];
    return { users, assessments, guardians, contacts, approvals };
  }
  async findContact(id: string): Promise<ContactRecord | undefined> {
    return (await db.execute(sql`SELECT ${contactColumns} FROM contact_authorities WHERE id=${id}`)).rows[0] as ContactRecord | undefined;
  }
  async findInvitation(id: string): Promise<GroupInvitation | undefined> {
    return (await db.execute(sql`SELECT ${invitationColumns} FROM group_invitations WHERE id=${id}`)).rows[0] as GroupInvitation | undefined;
  }
  async listContacts(userId: string): Promise<ContactRecord[]> {
    return (await db.execute(sql`SELECT ${contactColumns} FROM contact_authorities WHERE user_a_id=${userId} OR user_b_id=${userId}`)).rows as ContactRecord[];
  }
  async listInvitations(userId: string): Promise<GroupInvitation[]> {
    return (await db.execute(sql`SELECT ${invitationColumns} FROM group_invitations WHERE invitee_id=${userId} AND status='pending'`)).rows as GroupInvitation[];
  }
  async memberIds(conversationId: string, tx?: DbTransaction, lock = false): Promise<string[]> {
    const executor = tx ?? db;
    const rows = (await executor.execute(sql`SELECT user_id AS id FROM conversation_members WHERE conversation_id=${conversationId}
      ORDER BY user_id ${lock ? sql`FOR UPDATE` : sql``}`)).rows as Array<{ id: string }>;
    if (rows.length) return rows.map(row => row.id);
    const [legacy] = (await executor.execute(sql`SELECT participant_ids,participant_a,participant_b FROM conversations WHERE id=${conversationId}`)).rows as
      Array<{ participant_ids: string[] | null; participant_a: string | null; participant_b: string | null }>;
    return [...new Set((legacy?.participant_ids ?? [legacy?.participant_a, legacy?.participant_b]).filter((id): id is string => Boolean(id)))];
  }
}
