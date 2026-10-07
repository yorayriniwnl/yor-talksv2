import { db, type DbTransaction } from '@workspace/db';
import { sql } from 'drizzle-orm';
import type { ChallengeConsumption, EligibilityAssessment, EligibilityFacts, EligibilitySubject, GuardianAuthorization, PrivateAssuranceChallenge } from '../eligibility/types.js';

type PrivateRow = Record<string, unknown>;
const subjectFields = (row: PrivateRow): EligibilitySubject => row.user_id
  ? { userId: String(row.user_id) } : { enrollmentId: String(row.enrollment_id) };
const timestamp = (value: unknown): string | null => value == null ? null : new Date(String(value)).toISOString();
function assessmentFromRow(row: PrivateRow): EligibilityAssessment {
  return { ...subjectFields(row), id: String(row.id), status: row.status as EligibilityAssessment['status'],
    issuer: String(row.issuer), method: String(row.method), experience: row.experience as EligibilityAssessment['experience'],
    thresholds: row.threshold_assertions as EligibilityAssessment['thresholds'], territory: String(row.territory),
    policyVersions: row.policy_versions as EligibilityAssessment['policyVersions'], verifiedAt: timestamp(row.verified_at),
    expiresAt: timestamp(row.expires_at)!, evidenceReference: row.evidence_reference == null ? null : String(row.evidence_reference) };
}
function authorizationFromRow(row: PrivateRow): GuardianAuthorization {
  return { ...subjectFields(row), id: String(row.id), guardianUserId: row.guardian_user_id == null ? null : String(row.guardian_user_id),
    guardianReference: String(row.guardian_reference), issuer: String(row.issuer), responsibilityReference: String(row.responsibility_reference),
    status: row.status as GuardianAuthorization['status'], subjectRevision: String(row.subject_revision), purposes: row.purposes as GuardianAuthorization['purposes'],
    noticeVersions: row.notice_versions as GuardianAuthorization['noticeVersions'], policyVersions: row.policy_versions as GuardianAuthorization['policyVersions'],
    verifiedAt: timestamp(row.verified_at)!, grantedAt: timestamp(row.granted_at)!, expiresAt: timestamp(row.expires_at)!, withdrawnAt: timestamp(row.withdrawn_at) };
}

/** No profile repository, generic export or session claim reads these private records. */
export class EligibilityRepository {
  async readFacts(userId: string, tx?: DbTransaction): Promise<EligibilityFacts | undefined> {
    // A single statement keeps account, proof, guardian state and revision on
    // one READ COMMITTED snapshot. Select the latest record, never an older
    // permissive proof hidden behind a newer revocation/rejection.
    const result = await (tx ?? db).execute(sql`SELECT u.id,u.account_status,u.terms_version,u.terms_accepted_at,
      u.settings->>'contentFilter' AS content_preference,coalesce(r.revision,0)::text AS revision,
      (SELECT row_to_json(a) FROM eligibility_assessments a WHERE a.user_id=u.id ORDER BY a.subject_revision DESC,a.created_at DESC,a.id DESC LIMIT 1) AS assessment,
      coalesce((SELECT jsonb_agg(g ORDER BY g.created_at,g.id) FROM guardian_authorizations g WHERE g.user_id=u.id),'[]'::jsonb) AS guardians
      FROM users u LEFT JOIN eligibility_revisions r ON r.user_id=u.id WHERE u.id=${userId}`);
    const row = result.rows[0];
    if (!row) return undefined;
    const preference = row.content_preference;
    return { account: { id: String(row.id), status: String(row.account_status ?? 'active'),
      termsVersion: row.terms_version == null ? null : String(row.terms_version),
      termsAcceptedAt: row.terms_accepted_at == null ? null : new Date(row.terms_accepted_at as Date).toISOString(),
      contentPreference: preference === 'regular' || preference === 'mature' ? preference : 'child_safe' },
      revision: String(row.revision), assessment: row.assessment ? assessmentFromRow(row.assessment as PrivateRow) : undefined,
      guardianAuthorizations: (row.guardians as PrivateRow[]).map(authorizationFromRow) };
  }

  async lockSubject(subject: EligibilitySubject, tx: DbTransaction): Promise<void> {
    const result = subject.userId
      ? await tx.execute(sql`SELECT id FROM users WHERE id=${subject.userId} FOR UPDATE`)
      : await tx.execute(sql`SELECT id FROM eligibility_enrollments WHERE id=${subject.enrollmentId} FOR UPDATE`);
    if (!result.rowCount) throw new Error('Eligibility subject unavailable');
  }

  async advanceRevision(userId: string, tx: DbTransaction): Promise<string> {
    const result = await tx.execute(sql`INSERT INTO eligibility_revisions(user_id,revision) VALUES(${userId},1)
      ON CONFLICT(user_id) DO UPDATE SET revision=eligibility_revisions.revision+1,updated_at=clock_timestamp()
      RETURNING revision::text`);
    return String(result.rows[0].revision);
  }

  async advanceSubjectRevision(subject: EligibilitySubject, tx: DbTransaction): Promise<string> {
    if (subject.userId) return this.advanceRevision(subject.userId, tx);
    const result = await tx.execute(sql`UPDATE eligibility_enrollments SET revision=revision+1 WHERE id=${subject.enrollmentId} RETURNING revision::text`);
    if (!result.rowCount) throw new Error('Eligibility subject unavailable');
    return String(result.rows[0].revision);
  }

  async storeAssessment(value: EligibilityAssessment, tx: DbTransaction): Promise<void> {
    await this.lockSubject(value, tx);
    const revision = await this.advanceSubjectRevision(value, tx);
    await tx.execute(sql`INSERT INTO eligibility_assessments(id,user_id,enrollment_id,status,issuer,method,subject_revision,experience,threshold_assertions,
      territory,policy_versions,verified_at,expires_at,evidence_reference)
      VALUES(${value.id},${value.userId ?? null},${value.enrollmentId ?? null},${value.status},${value.issuer},${value.method},${revision}::bigint,${value.experience},
      ${JSON.stringify(value.thresholds)}::jsonb,${value.territory},${JSON.stringify(value.policyVersions)}::jsonb,
      ${value.verifiedAt},${value.expiresAt},${value.evidenceReference})`);
  }

  async createChallenge(value: PrivateAssuranceChallenge, tx: DbTransaction): Promise<void> {
    await this.lockSubject(value, tx);
    await tx.execute(sql`INSERT INTO eligibility_challenges(id,user_id,enrollment_id,issuer,audience,purpose,nonce_hash,subject_revision,
      policy_versions,notice_versions,requested_purposes,expires_at)
      VALUES(${value.id},${value.userId ?? null},${value.enrollmentId ?? null},${value.issuer},${value.audience},${value.purpose},${value.nonceHash},
      ${value.subjectRevision}::bigint,${JSON.stringify(value.policyVersions)}::jsonb,${JSON.stringify(value.noticeVersions)}::jsonb,
      ${JSON.stringify(value.requestedPurposes)}::jsonb,${value.expiresAt})`);
  }

  async consumeChallenge(value: ChallengeConsumption, tx: DbTransaction): Promise<boolean> {
    await this.lockSubject(value, tx);
    const result = await tx.execute(sql`UPDATE eligibility_challenges c SET status='consumed',consumed_at=clock_timestamp(),consumed_event_id=${value.eventId}
      WHERE c.id=${value.challengeId} AND c.user_id IS NOT DISTINCT FROM ${value.userId ?? null}::uuid
      AND c.enrollment_id IS NOT DISTINCT FROM ${value.enrollmentId ?? null}::uuid
      AND c.issuer=${value.issuer} AND c.audience=${value.audience} AND c.purpose=${value.purpose} AND c.nonce_hash=${value.nonceHash}
      AND c.status='pending' AND c.consumed_at IS NULL AND c.expires_at>clock_timestamp() AND c.subject_revision=${value.subjectRevision}::bigint
      AND c.subject_revision=CASE WHEN c.user_id IS NOT NULL
        THEN coalesce((SELECT revision FROM eligibility_revisions WHERE user_id=c.user_id),0)
        ELSE (SELECT revision FROM eligibility_enrollments WHERE id=c.enrollment_id) END RETURNING c.id`);
    return Boolean(result.rowCount);
  }

  async storeGuardianAuthorization(value: GuardianAuthorization, tx: DbTransaction): Promise<void> {
    await this.lockSubject(value, tx);
    const revision = await this.advanceSubjectRevision(value, tx);
    await tx.execute(sql`INSERT INTO guardian_authorizations(id,user_id,enrollment_id,guardian_user_id,guardian_reference,issuer,
      responsibility_reference,status,subject_revision,purposes,notice_versions,policy_versions,verified_at,granted_at,expires_at,withdrawn_at)
      VALUES(${value.id},${value.userId ?? null},${value.enrollmentId ?? null},${value.guardianUserId},${value.guardianReference},${value.issuer},
      ${value.responsibilityReference},${value.status},${revision}::bigint,${JSON.stringify(value.purposes)}::jsonb,${JSON.stringify(value.noticeVersions)}::jsonb,
      ${JSON.stringify(value.policyVersions)}::jsonb,${value.verifiedAt},${value.grantedAt},${value.expiresAt},${value.withdrawnAt})`);
  }

  async withdrawGuardianAuthorization(authorizationId: string, actorId: string, tx: DbTransaction): Promise<boolean> {
    const candidate = await tx.execute(sql`SELECT user_id,enrollment_id FROM guardian_authorizations
      WHERE id=${authorizationId} AND (user_id=${actorId} OR guardian_user_id=${actorId})`);
    if (!candidate.rowCount) return false;
    const subject = subjectFields(candidate.rows[0]);
    await this.lockSubject(subject, tx);
    const result = await tx.execute(sql`UPDATE guardian_authorizations SET status='withdrawn',withdrawn_at=clock_timestamp()
      WHERE id=${authorizationId} AND status='granted' AND (user_id=${actorId} OR guardian_user_id=${actorId}) RETURNING id`);
    if (!result.rowCount) return false;
    const revision = await this.advanceSubjectRevision(subject, tx);
    await tx.execute(sql`UPDATE guardian_authorizations SET subject_revision=${revision}::bigint WHERE id=${authorizationId}`);
    return true;
  }
}
