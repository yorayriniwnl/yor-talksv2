import { pool } from '@workspace/db';
import type { EligibilityAssessment, GuardianAuthorization } from '../features/eligibility-policy.js';

export class EligibilityRepository {
  async latestAssessment(userId: string): Promise<EligibilityAssessment | undefined> {
    return (await pool.query<EligibilityAssessment>(`SELECT id,user_id AS "userId",status,issuer,country,
      policy_version AS "policyVersion",thresholds,verified_at::text AS "verifiedAt",expires_at::text AS "expiresAt",
      evidence_reference AS "evidenceReference" FROM eligibility_assessments
      WHERE user_id=$1 AND is_current LIMIT 1`, [userId])).rows[0];
  }
  async authorizations(userId: string): Promise<GuardianAuthorization[]> {
    return (await pool.query<GuardianAuthorization>(`SELECT id,child_id AS "childId",guardian_id AS "guardianId",status,
      parental_responsibility_verified AS "parentalResponsibilityVerified",purposes,policy_version AS "policyVersion",
      notice_version AS "noticeVersion",expires_at::text AS "expiresAt" FROM guardian_authorizations
      WHERE child_id=$1 OR guardian_id=$1 ORDER BY created_at DESC,id DESC`, [userId])).rows;
  }
  async withdraw(userId: string, id: string): Promise<boolean> {
    return Boolean((await pool.query(`UPDATE guardian_authorizations SET status='withdrawn',withdrawn_at=coalesce(withdrawn_at,now())
      WHERE id=$1 AND (child_id=$2 OR guardian_id=$2) AND status IN ('pending','verified','withdrawn') RETURNING id`, [id, userId])).rowCount);
  }
}
