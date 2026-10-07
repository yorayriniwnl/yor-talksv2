import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db, type DbTransaction } from '@workspace/db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AssuranceUnavailableError, UnavailableAssuranceAdapter, type AssuranceAdapter } from '../eligibility/assurance-adapter.js';
import { applicablePolicies, consistentThresholdAssertions, policyFingerprint } from '../eligibility/policy.js';
import { loadApprovedTerritoryPolicies, loadOperatorPolicyIds } from '../eligibility/territory-policy.js';
import type { ApprovedTerritoryPolicy, EligibilitySubject, PrivateAssuranceChallenge } from '../eligibility/types.js';
import { EligibilityRepository, EligibilitySubjectUnavailableError } from '../repositories/eligibility-repository.js';
import { assuranceChallengeSchema, type AssuranceChallengeInput } from '../validators/eligibility.js';
import { EligibilityService } from './eligibility-service.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const text = (max = 128) => z.string().trim().min(1).max(max);
const versions = z.record(text()).refine(value => Object.keys(value).length<=32 && Object.keys(value).every(key => key.length>0 && key.length<=128));
const purposes = z.array(z.enum(['account_collection','account_activation','social_contact'])).min(1).max(3)
  .refine(value => new Set(value).size === value.length);
const base = { userId: z.string().uuid().optional(), enrollmentId: z.string().uuid().optional(), issuer: text(),audience: text(),
  eventId: text(256),challengeId: z.string().uuid(),nonce: text(256),policyVersions: versions,
  verifiedAt: z.string().datetime({ offset: true }),expiresAt: z.string().datetime({ offset: true }) };
const eventSchema = z.discriminatedUnion('purpose',[
  z.object({ ...base,purpose: z.literal('age_assessment'),assessment: z.object({ method: text(),
    experience: z.enum(['under_13','teen_13_17','adult_18_plus']),territory: z.string().regex(/^[A-Z]{2}$/),
    thresholds: z.array(z.object({ age: z.union([z.literal(13),z.literal(14),z.literal(15),z.literal(16),z.literal(17),z.literal(18)]),atLeast: z.boolean() }).strict()).max(6),
    evidenceReference: text(256) }).strict() }).strict(),
  z.object({ ...base,purpose: z.literal('guardian_authorization'),guardian: z.object({ guardianUserId: z.string().uuid().nullable(),
    guardianReference: text(256),responsibilityReference: text(256),purposes,noticeVersions: versions,
    grantedAt: z.string().datetime({ offset: true }) }).strict() }).strict(),
]).refine(value => Boolean(value.userId) !== Boolean(value.enrollmentId));
function sameMap(a: Record<string,string>,b: Record<string,string>) {
  return Object.keys(a).length===Object.keys(b).length && Object.keys(a).every(key => a[key]===b[key]);
}
export class AssuranceRequestError extends Error {
  constructor(readonly code: 'territory_unavailable' | 'challenge_limit_exceeded' | 'account_restricted') { super('Verification unavailable'); }
}
class CallbackRejected extends Error {}
function expectedDatabaseRejection(error: unknown): boolean {
  let current = error;
  for (let depth=0;depth<5 && current && typeof current==='object';depth++) {
    const value = current as { code?: string;cause?: unknown };
    if (value.code==='23505' || value.code==='23503') return true;
    current=value.cause;
  }
  return false;
}
interface AssuranceOptions {
  policies?: () => ApprovedTerritoryPolicy[]; operatorPolicyIds?: string[]; timeoutMs?: number; maxOutstanding?: number;
}
export class AssuranceService {
  constructor(private readonly repository = new EligibilityRepository(), private readonly adapter: AssuranceAdapter = new UnavailableAssuranceAdapter(),
    private readonly options: AssuranceOptions = {}) {
    if (adapter.kind==='test_fixture' && env.NODE_ENV!=='test') throw new AssuranceUnavailableError();
  }
  get callbacksEnabled() { return this.adapter.kind==='approved_provider' || this.adapter.kind==='test_fixture' && env.NODE_ENV==='test'; }
  private registry() { return (this.options.policies ?? loadApprovedTerritoryPolicies)(); }
  private operatorIds() { return this.options.operatorPolicyIds ?? loadOperatorPolicyIds(); }
  private available() { if (!this.callbacksEnabled) throw new AssuranceUnavailableError(); }
  private async bounded<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([operation,new Promise<never>((_,reject) => { timer=setTimeout(() => reject(new AssuranceUnavailableError()),this.options.timeoutMs ?? 5000); })]); }
    finally { if (timer) clearTimeout(timer); }
  }
  async startOwnerChallenge(userId: string,input: AssuranceChallengeInput) { return this.startChallenge({ userId },input); }
  async startChallenge(subject: EligibilitySubject,input: AssuranceChallengeInput) {
    const parsed = assuranceChallengeSchema.parse(input); this.available();
    const nonce = randomBytes(32).toString('base64url');
    const challenge = await db.transaction(async tx => {
      await this.repository.lockSubject(subject,tx);
      if (subject.userId && (await this.repository.readFacts(subject.userId,tx))?.account.status!=='active') throw new AssuranceRequestError('account_restricted');
      const now = await this.repository.databaseTime(tx); const registry = this.registry();
      const policies = applicablePolicies({ declaredTerritory: parsed.territory,operatorPolicyIds: this.operatorIds() },registry,now);
      if (!policies) throw new AssuranceRequestError('territory_unavailable');
      const requestedPurposes = parsed.purpose==='guardian_authorization' ? parsed.purposes : [];
      const notices: Record<string,string> = {};
      for (const purpose of requestedPurposes) {
        const values = policies.map(policy => policy.guardianNoticeVersions[purpose]);
        if (values.some(value => !value || value!==values[0])) throw new AssuranceRequestError('territory_unavailable');
        notices[purpose] = values[0];
      }
      if (await this.repository.pendingChallenges(subject,tx)>=(this.options.maxOutstanding ?? 3)) throw new AssuranceRequestError('challenge_limit_exceeded');
      const value: PrivateAssuranceChallenge = { ...subject,id: randomUUID(),issuer: this.adapter.issuer,audience: this.adapter.audience,
        purpose: parsed.purpose,nonceHash: digest(nonce),subjectRevision: await this.repository.subjectRevision(subject,tx),
        policyVersions: Object.fromEntries(policies.map(policy => [policy.id,policy.version])),noticeVersions: notices,requestedPurposes,
        territory: parsed.territory,policyFingerprint: policyFingerprint(registry,this.operatorIds()),expiresAt: new Date(now.getTime()+10*60_000).toISOString() };
      await this.repository.createChallenge(value,tx); return value;
    });
    try {
      const result = await this.bounded(this.adapter.start({ ...challenge,nonce }));
      const redirect = new URL(result.redirectUrl);
      if (redirect.protocol!=='https:' || redirect.username || redirect.password || !this.adapter.redirectOrigins.includes(redirect.origin)) throw new AssuranceUnavailableError();
      return { challengeId: challenge.id,nextStep: 'verification_required' as const,redirectUrl: redirect.href,expiresAt: challenge.expiresAt };
    } catch {
      await this.repository.revokeChallenge(challenge.id).catch(() => undefined);
      throw new AssuranceUnavailableError();
    }
  }
  async consumeCallback(rawBody: Buffer,headers: Record<string,unknown>): Promise<boolean> {
    this.available();
    let verified: unknown;
    try { verified = await this.bounded(this.adapter.verifyCallback(rawBody,headers)); }
    catch (error) { if (error instanceof AssuranceUnavailableError) throw error; return false; }
    const parsed = eventSchema.safeParse(verified); if (!parsed.success) return false;
    const event = parsed.data;
    if (event.issuer!==this.adapter.issuer || event.audience!==this.adapter.audience) return false;
    const subject: EligibilitySubject = event.userId ? { userId: event.userId } : { enrollmentId: event.enrollmentId! };
    try {
      return await db.transaction(async tx => {
        await this.repository.lockSubject(subject,tx);
        const challenge = await this.repository.readChallenge(event.challengeId,tx);
        const now = await this.repository.databaseTime(tx);
        if (!challenge || challenge.userId!==event.userId || challenge.enrollmentId!==event.enrollmentId || challenge.purpose!==event.purpose
          || challenge.issuer!==event.issuer || challenge.audience!==event.audience || challenge.nonceHash!==digest(event.nonce)
          || challenge.status!=='pending' || Date.parse(challenge.expiresAt)<=now.getTime()
          || Date.parse(event.verifiedAt)<Date.parse(challenge.createdAt) || Date.parse(event.verifiedAt)>now.getTime()
          || Date.parse(event.expiresAt)<=now.getTime() || Date.parse(event.expiresAt)<=Date.parse(event.verifiedAt)) return false;
        if (subject.userId && (await this.repository.readFacts(subject.userId,tx))?.account.status!=='active') return false;
        const registry = this.registry(); const fingerprint = policyFingerprint(registry,this.operatorIds());
        const policies = applicablePolicies({ declaredTerritory: challenge.territory ?? undefined,operatorPolicyIds: this.operatorIds() },registry,now);
        if (!policies || !challenge.policyFingerprint || challenge.policyFingerprint!==fingerprint || !sameMap(event.policyVersions,challenge.policyVersions)
          || !sameMap(challenge.policyVersions,Object.fromEntries(policies.map(policy => [policy.id,policy.version])))) return false;
        if (event.purpose==='age_assessment') {
          if (event.assessment.territory!==challenge.territory || !consistentThresholdAssertions(event.assessment.experience,event.assessment.thresholds)) return false;
        } else {
          if (event.guardian.purposes.length!==challenge.requestedPurposes.length || !event.guardian.purposes.every(purpose => challenge.requestedPurposes.includes(purpose))
            || !sameMap(event.guardian.noticeVersions,challenge.noticeVersions) || Date.parse(event.guardian.grantedAt)<Date.parse(event.verifiedAt)
            || Date.parse(event.guardian.grantedAt)>now.getTime() || Date.parse(event.guardian.grantedAt)>=Date.parse(event.expiresAt)) return false;
          if (event.guardian.guardianUserId) {
            if (event.guardian.guardianUserId===subject.userId) return false;
            const parent = await tx.execute(sql`SELECT account_status FROM users WHERE id=${event.guardian.guardianUserId} FOR UPDATE`);
            if (parent.rows[0]?.account_status!=='active') return false;
          }
        }
        if (!await this.repository.consumeChallenge({ ...subject,challengeId: challenge.id,issuer: event.issuer,audience: event.audience,
          purpose: event.purpose,nonceHash: digest(event.nonce),eventId: event.eventId,subjectRevision: challenge.subjectRevision },tx)) return false;
        if (event.purpose==='age_assessment') await this.repository.storeAssessment({ ...subject,id: randomUUID(),status: 'verified',issuer: event.issuer,
          ...event.assessment,policyVersions: event.policyVersions,verifiedAt: event.verifiedAt,expiresAt: event.expiresAt },tx);
        else await this.repository.storeGuardianAuthorization({ ...subject,id: randomUUID(),status: 'granted',issuer: event.issuer,...event.guardian,
          policyVersions: event.policyVersions,verifiedAt: event.verifiedAt,expiresAt: event.expiresAt,withdrawnAt: null },tx);
        // Re-check after awaited writes: withdrawal/policy replacement cannot
        // be silently authorised by an earlier in-process registry snapshot.
        await this.finalBoundary(tx,fingerprint,event.expiresAt,challenge.expiresAt,challenge.territory!);
        return true;
      });
    } catch (error) {
      if (error instanceof CallbackRejected || error instanceof EligibilitySubjectUnavailableError || expectedDatabaseRejection(error)) return false;
      // Never surface SQL parameters, provider output or raw callback causes.
      throw new AssuranceUnavailableError();
    }
  }
  private async finalBoundary(tx: DbTransaction,fingerprint: string,eventExpiry: string,challengeExpiry: string,territory: string) {
    const now = await this.repository.databaseTime(tx); const registry = this.registry();
    if (policyFingerprint(registry,this.operatorIds())!==fingerprint || Math.min(Date.parse(eventExpiry),Date.parse(challengeExpiry))<=now.getTime()
      || !applicablePolicies({ declaredTerritory: territory,operatorPolicyIds: this.operatorIds() },registry,now)) throw new CallbackRejected();
  }
  async ownerStatus(userId: string) {
    return new EligibilityService(this.repository,{ policies: () => this.registry(),operatorPolicyIds: this.operatorIds() }).decisionFor(userId);
  }
  async ownerChallengeStatus(userId: string,id: string) {
    const challenge = await this.repository.readChallenge(id);
    if (!challenge || challenge.userId!==userId) return undefined;
    return { challengeId: id,purpose: challenge.purpose,status: challenge.status==='pending' && Date.parse(challenge.expiresAt)<=Date.now() ? 'expired' : challenge.status,expiresAt: challenge.expiresAt };
  }
  async listGuardianAuthorizations(userId: string) {
    const result = await db.execute(sql`SELECT id,purposes,status,expires_at FROM guardian_authorizations WHERE user_id=${userId} OR guardian_user_id=${userId} ORDER BY created_at DESC LIMIT 100`);
    return result.rows.map(row => ({ id: String(row.id),purposes: row.purposes as string[],status: String(row.status),expiresAt: new Date(row.expires_at as Date).toISOString() }));
  }
  async withdrawGuardianAuthorization(userId: string,id: string) {
    return db.transaction(tx => this.repository.withdrawGuardianAuthorization(id,userId,tx));
  }
}
