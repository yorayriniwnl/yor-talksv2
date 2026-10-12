import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { assuranceConfiguration, eligibilityEnforced, readTerritoryPolicies } from '../config/eligibility.js';
import { decideEligibility, deniedEligibility, validThresholds, type EligibilityDecision } from '../features/eligibility-policy.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { fetchWithTimeout } from '../lib/fetch-with-timeout.js';
import type { UserRecord } from '../types/index.js';

export class EligibilityError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 403) { super(message); }
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const resultClaims = z.object({
  iss: z.string(), aud: z.string(), sub: z.string().uuid(), jti: z.string().min(1).max(200),
  iat: z.number().int(), exp: z.number().int(), nbf: z.number().int().optional(),
  challengeId: z.string().uuid(), nonce: z.string().regex(/^[A-Za-z0-9_-]{32,100}$/),
  kind: z.enum(['age', 'guardian']), country: z.string().regex(/^[A-Z]{2}$/), policyVersion: z.string().min(1).max(100),
  decision: z.enum(['verified', 'rejected']), thresholds: z.record(z.boolean()), evidenceReference: z.string().min(1).max(200),
  proofExpiresAt: z.string().datetime(), authorizationId: z.string().uuid().optional(), childId: z.string().uuid().optional(),
  parentalResponsibilityVerified: z.boolean().optional(), purposes: z.array(z.enum(['social_activation', 'contact'])).optional(),
}).strict();
interface ChallengeRow {
  id: string; user_id: string; kind: 'age' | 'guardian'; country: string; policy_version: string;
  guardian_authorization_id: string | null; status: string; nonce_hash: string; issuer: string; expires_at: Date;
  result_hash: string | null;
}

/** Shared decision; no JWT/profile preference supplies age or parental authority. */
export class EligibilityService {
  constructor(private readonly repository = new EligibilityRepository(), private readonly users = new UserRepository()) {}

  async decision(user: UserRecord): Promise<EligibilityDecision> {
    if (!eligibilityEnforced()) return { active: true, experience: 'adult_18_plus', maximumContentRating: 'mature',
      capabilities: { social: true, messages: true, commerce: true, live: true, rtc: true, ai: true, analytics: false, profiling: false },
      policyVersion: null, reason: 'verified' };
    const [assessment, authorizations] = await Promise.all([this.repository.latestAssessment(user.id), this.repository.authorizations(user.id)]);
    if (assessment && assessment.issuer !== assuranceConfiguration()?.issuer) return deniedEligibility('verification_required');
    return decideEligibility({ userId: user.id, accountStatus: user.accountStatus,
      currentTerms: user.termsVersion === env.TERMS_VERSION && Boolean(user.termsAcceptedAt), assessment,
      policy: readTerritoryPolicies().find(p => p.country === assessment?.country), authorizations, termsVersion: env.TERMS_VERSION });
  }
  async requireCapability(userId: string, capability: keyof EligibilityDecision['capabilities'] = 'social') {
    if (!eligibilityEnforced()) return;
    const user = await this.users.findById(userId);
    if (!user || !(await this.decision(user)).capabilities[capability]) throw new EligibilityError('Complete the required account verification to continue', 'eligibility_required');
  }
  async ownerStatus(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new EligibilityError('Account not found', 'account_not_found', 404);
    const decision = await this.decision(user);
    return { ...decision, verificationAvailable: Boolean(assuranceConfiguration() && readTerritoryPolicies().length),
      termsVersion: env.TERMS_VERSION };
  }
  async guardianSummaries(userId: string) {
    return (await this.repository.authorizations(userId)).map(g => ({ id: g.id, status: g.status,
      purposes: g.purposes, noticeVersion: g.noticeVersion, expiresAt: g.expiresAt,
      role: g.guardianId === userId ? 'guardian' : 'child', ...(g.guardianId === userId ? { childId: g.childId } : {}) }));
  }
  async requestGuardianAuthorization(childId: string, guardianId: string) {
    if (childId === guardianId) throw new EligibilityError('Choose a separate guardian account', 'invalid_guardian');
    const [child, guardian] = await Promise.all([this.users.findById(childId), this.users.findById(guardianId)]);
    if (!child || !guardian || !['active', null, undefined].includes(child.accountStatus)) throw new EligibilityError('Guardian authorization is unavailable', 'invalid_guardian');
    const guardianDecision = await this.decision(guardian), assessment = await this.repository.latestAssessment(childId);
    const policy = readTerritoryPolicies().find(p => p.country === assessment?.country);
    if (!guardianDecision.active || guardianDecision.experience !== 'adult_18_plus' || !policy || !assessment ||
      assessment.status !== 'verified' || assessment.thresholds['18'] !== false || Date.parse(assessment.expiresAt) <= Date.now()) throw new EligibilityError('Guardian authorization is unavailable', 'guardian_verification_denied');
    const id = randomUUID(), expiresAt = new Date(Math.min(Date.parse(assessment.expiresAt), Date.parse(policy.expiresAt))).toISOString();
    await pool.query(`INSERT INTO guardian_authorizations(id,child_id,guardian_id,issuer,purposes,notice_version,policy_version,expires_at)
      VALUES($1,$2,$3,$4,'["social_activation","contact"]'::jsonb,$5,$6,$7)`, [id, childId, guardianId, assessment.issuer, env.TERMS_VERSION, policy.version, expiresAt]);
    return { id, status: 'pending', purposes: ['social_activation', 'contact'], noticeVersion: env.TERMS_VERSION, expiresAt, role: 'child' };
  }
  async withdrawGuardianAuthorization(userId: string, id: string) {
    if (!(await this.repository.withdraw(userId, id))) throw new EligibilityError('Guardian authorization not found', 'authorization_not_found', 404);
    return { withdrawn: true };
  }

  /** Signed partner-adapter contract; deployment acceptance must prove its actual integration. */
  async startChallenge(userId: string, country: string, authorizationId?: string) {
    const configuration = assuranceConfiguration(), policy = readTerritoryPolicies().find(p => p.country === country);
    if (!configuration || !policy || Date.parse(policy.expiresAt) <= Date.now()) throw new EligibilityError('Verification is not available for this territory', 'assurance_unavailable', 503);
    const user = await this.users.findById(userId);
    if (!user || !['active', null, undefined].includes(user.accountStatus)) throw new EligibilityError('Account is restricted', 'account_restricted');
    const recent = await pool.query('SELECT count(*)::int AS total FROM eligibility_challenges WHERE user_id=$1 AND created_at>now()-interval \'1 day\'', [userId]);
    if (recent.rows[0].total >= 20) throw new EligibilityError('Too many verification attempts; try later', 'assurance_rate_limited', 429);
    let childId: string | undefined;
    if (authorizationId) {
      const authorization = (await pool.query(`SELECT child_id FROM guardian_authorizations
        WHERE id=$1 AND guardian_id=$2 AND status='pending' AND policy_version=$3 AND expires_at>now()`, [authorizationId, userId, policy.version])).rows[0];
      if (!authorization || !(await this.decision(user)).active || (await this.decision(user)).experience !== 'adult_18_plus') throw new EligibilityError('Guardian verification is not available', 'guardian_verification_denied');
      childId = authorization.child_id;
    }
    const id = randomUUID(), nonce = randomBytes(32).toString('base64url'), kind = authorizationId ? 'guardian' : 'age';
    await pool.query(`INSERT INTO eligibility_challenges(id,user_id,kind,country,policy_version,guardian_authorization_id,nonce_hash,issuer,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '15 minutes')`, [id, userId, kind, country, policy.version, authorizationId ?? null, hash(nonce), configuration.issuer]);
    const assertion = jwt.sign({ challengeId: id, nonce, kind, country, policyVersion: policy.version,
      requiredThresholds: [...new Set([13, 18, policy.minimumAccessAge, policy.independentConsentAge].filter(age => age > 0))],
      ...(authorizationId ? { authorizationId, childId, purposes: ['social_activation', 'contact'] } : {}) }, configuration.secret,
    { algorithm: 'HS256', issuer: configuration.audience, audience: configuration.issuer, subject: userId, jwtid: id, expiresIn: 900 });
    try {
      const response = await fetchWithTimeout(configuration.challengeUrl, { method: 'POST', redirect: 'error',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assertion }) }, 15000);
      if (!response.ok) throw new Error();
      const body = z.object({ challengeId: z.literal(id), verificationUrl: z.string().url() }).strict().parse(await response.json());
      const url = new URL(body.verificationUrl), issuer = new URL(configuration.issuer);
      if (url.protocol !== 'https:' || url.origin !== issuer.origin || url.username || url.password) throw new Error();
      return { challengeId: id, verificationUrl: url.href, expiresAt: new Date(Date.now() + 900000).toISOString() };
    } catch {
      await pool.query("UPDATE eligibility_challenges SET status='rejected' WHERE id=$1 AND status='pending'", [id]);
      throw new EligibilityError('Verification provider is temporarily unavailable', 'assurance_unavailable', 503);
    }
  }
  async challengeStatus(userId: string, id: string) {
    const row = (await pool.query(`SELECT id,status,expires_at::text AS "expiresAt" FROM eligibility_challenges WHERE id=$1 AND user_id=$2`, [id, userId])).rows[0];
    if (!row) throw new EligibilityError('Verification challenge not found', 'challenge_not_found', 404);
    return { challengeId: row.id, status: Date.parse(row.expiresAt) <= Date.now() && row.status === 'pending' ? 'expired' : row.status, expiresAt: row.expiresAt };
  }
  async acceptProviderResult(credential: string) {
    const configuration = assuranceConfiguration();
    if (!configuration) throw new EligibilityError('Verification provider is unavailable', 'assurance_unavailable', 503);
    let claims: z.infer<typeof resultClaims>;
    try {
      claims = resultClaims.parse(jwt.verify(credential, configuration.secret,
        { algorithms: ['HS256'], issuer: configuration.issuer, audience: configuration.audience, maxAge: '15m' }));
      const now = Math.floor(Date.now() / 1000);
      if (claims.iat > now || claims.exp <= now || claims.exp > claims.iat + 900 || !validThresholds(claims.thresholds) ||
        Date.parse(claims.proofExpiresAt) <= Date.now() || Date.parse(claims.proofExpiresAt) > Date.now() + 366 * 86400000) throw new Error();
    } catch { throw new EligibilityError('Verification result is invalid', 'invalid_assurance_result', 401); }
    const policy = readTerritoryPolicies().find(p => p.country === claims.country && p.version === claims.policyVersion);
    if (!policy || Date.parse(policy.expiresAt) <= Date.now()) throw new EligibilityError('Territory policy changed; reassessment required', 'policy_changed');
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      // Lock account before proof/challenge to serialize revocation and concurrent assertions.
      const owner = (await connection.query("SELECT id,account_status FROM users WHERE id=$1 FOR UPDATE", [claims.sub])).rows[0];
      const row = (await connection.query<ChallengeRow>('SELECT * FROM eligibility_challenges WHERE id=$1 FOR UPDATE', [claims.challengeId])).rows[0];
      if (!owner || !['active', null].includes(owner.account_status) || !row || row.user_id !== claims.sub || row.kind !== claims.kind || row.issuer !== claims.iss ||
        row.country !== claims.country || row.policy_version !== claims.policyVersion || row.nonce_hash !== hash(claims.nonce) || row.expires_at.getTime() <= Date.now()) {
        throw new EligibilityError('Verification challenge cannot be redeemed', 'challenge_not_pending');
      }
      if (row.status === 'consumed' && row.result_hash === hash(credential)) {
        await connection.query('COMMIT'); return { accepted: true };
      }
      if (row.status !== 'pending') throw new EligibilityError('Verification challenge cannot be redeemed', 'challenge_not_pending');
      const expiresAt = new Date(Math.min(Date.parse(claims.proofExpiresAt), Date.parse(policy.expiresAt))).toISOString();
      if (row.kind === 'guardian') {
        if (!claims.authorizationId || claims.authorizationId !== row.guardian_authorization_id || !claims.childId ||
          claims.parentalResponsibilityVerified !== true || claims.thresholds['18'] !== true || !claims.purposes?.includes('social_activation')) throw new EligibilityError('Parental responsibility was not verified', 'guardian_verification_denied');
        const authorization = (await connection.query('SELECT purposes,notice_version FROM guardian_authorizations WHERE id=$1 FOR UPDATE', [claims.authorizationId])).rows[0];
        if (!authorization || authorization.notice_version !== env.TERMS_VERSION ||
          !(authorization.purposes as string[]).every(purpose => claims.purposes!.includes(purpose as 'social_activation' | 'contact'))) throw new EligibilityError('Required parental authorization purposes were not verified', 'guardian_verification_denied');
        const changed = await connection.query(`UPDATE guardian_authorizations SET status=$1,parental_responsibility_verified=$2,
          evidence_reference=$3,expires_at=$4 WHERE id=$5 AND guardian_id=$6 AND child_id=$7 AND status='pending' AND policy_version=$8 RETURNING id`,
        [claims.decision, claims.decision === 'verified', claims.evidenceReference, expiresAt, claims.authorizationId, claims.sub, claims.childId, policy.version]);
        if (!changed.rowCount) throw new EligibilityError('Guardian authorization changed', 'guardian_verification_denied');
      } else {
        await connection.query("UPDATE eligibility_assessments SET is_current=false,status=CASE WHEN status='verified' THEN 'revoked' ELSE status END WHERE user_id=$1 AND is_current", [claims.sub]);
        await connection.query(`INSERT INTO eligibility_assessments(id,user_id,status,issuer,country,policy_version,thresholds,evidence_reference,verified_at,expires_at,is_current)
          VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,clock_timestamp(),$9,true)`, [randomUUID(), claims.sub, claims.decision, claims.iss, claims.country, claims.policyVersion,
          JSON.stringify(claims.thresholds), claims.evidenceReference, expiresAt]);
        if (claims.decision === 'verified' && !claims.thresholds['18']) {
          await connection.query(`UPDATE users SET settings=coalesce(settings,'{}')::jsonb || '{"privateAccount":true,"notificationsEnabled":false,"autoplay":false,"readReceipts":false}'::jsonb,
            privacy=coalesce(privacy,'{}')::jsonb || '{"profileVisibility":"private","messageRequests":false,"allowDmFromStrangers":false}'::jsonb, location=NULL WHERE id=$1`, [claims.sub]);
        }
      }
      await connection.query("UPDATE eligibility_challenges SET status='consumed',result_hash=$2 WHERE id=$1", [row.id, hash(credential)]);
      await connection.query('COMMIT');
      return { accepted: true };
    } catch (error) { await connection.query('ROLLBACK'); throw error; }
    finally { connection.release(); }
  }
}
