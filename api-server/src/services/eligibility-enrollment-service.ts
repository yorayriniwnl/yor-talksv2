import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { db, type DbTransaction } from '@workspace/db';
import { applicablePolicies, policyFingerprint } from '../eligibility/policy.js';
import { requiredGuardianPurposes, thresholdValue } from '../eligibility/enrollment-policy.js';
import type { ApprovedTerritoryPolicy, AuthorizationPurpose, EligibilityEnrollment, EnrollmentAuthorization, Experience, GuardianAuthorization, PolicyVersions } from '../eligibility/types.js';
import { loadApprovedTerritoryPolicies, loadOperatorPolicyIds } from '../eligibility/territory-policy.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import type { AssuranceService } from './assurance-service.js';
import type { AssuranceChallengeInput } from '../validators/eligibility.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function secretMatches(value: string, expected: string | null): boolean {
  if (!expected || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(digest(value), 'hex'), Buffer.from(expected, 'hex'));
}
function sameMap(a: Record<string,string>, b: Record<string,string>): boolean {
  return Object.keys(a).length===Object.keys(b).length && Object.keys(a).every(key => a[key]===b[key]);
}
function currentPolicies(enrollment: EligibilityEnrollment, policies: ApprovedTerritoryPolicy[], operatorPolicyIds: string[], now: Date) {
  return applicablePolicies({ declaredTerritory: enrollment.territory, operatorPolicyIds }, policies, now);
}
function validGuardianForPurpose(values: GuardianAuthorization[], purpose: AuthorizationPurpose, policies: ApprovedTerritoryPolicy[], now: Date): GuardianAuthorization | undefined {
  const candidates = values.filter(value => value.purposes.includes(purpose));
  if (!candidates.length || candidates.some(value => !/^[1-9]\d*$/.test(value.subjectRevision ?? ''))) return undefined;
  candidates.sort((a,b) => BigInt(a.subjectRevision!)>BigInt(b.subjectRevision!) ? -1 : BigInt(a.subjectRevision!)<BigInt(b.subjectRevision!) ? 1 : 0);
  const value = candidates[0];
  const versions = Object.fromEntries(policies.map(policy => [policy.id,policy.version]));
  if (candidates[1]?.subjectRevision===value.subjectRevision || value.status!=='granted' || value.withdrawnAt!==null
    || Date.parse(value.verifiedAt)>now.getTime() || Date.parse(value.grantedAt)>now.getTime() || Date.parse(value.expiresAt)<=now.getTime()
    || !sameMap(value.policyVersions,versions)
    || policies.some(policy => policy.requiredGuardianPurposes.includes(purpose) && value.noticeVersions[purpose]!==policy.guardianNoticeVersions[purpose])) return undefined;
  return value;
}

export type EnrollmentNextStep = 'guardian_authorization' | 'age_assessment' | 'complete_registration';
export type SafeEnrollmentStatus = {
  status: 'unavailable' | 'verification_required' | 'authorized';
  nextStep: EnrollmentNextStep | null;
  enrollment?: { id: string; registrationNonce: string; expiresAt: string };
};
export type SafeEnrollmentProgress = Omit<SafeEnrollmentStatus,'enrollment'> & { enrollment?: { id: string; expiresAt: string } };
export class EnrollmentUnavailableError extends Error { constructor() { super('Enrollment is unavailable'); } }

interface EnrollmentOptions {
  policies?: () => ApprovedTerritoryPolicy[];
  operatorPolicyIds?: string[];
  clock?: () => Date;
}

/** Creates only a private, short-lived opaque subject before ordinary profile collection. */
export class EligibilityEnrollmentService {
  constructor(private readonly assurance: AssuranceService, private readonly repository = new EligibilityRepository(), private readonly options: EnrollmentOptions = {}) {}

  private registry() { return (this.options.policies ?? loadApprovedTerritoryPolicies)(); }
  private operatorIds() { return this.options.operatorPolicyIds ?? loadOperatorPolicyIds(); }
  private now() { return (this.options.clock ?? (() => new Date()))(); }
  private collectionFirst(enrollment: EligibilityEnrollment) {
    return enrollment.requestedExperience==='under_13';
  }
  private hasUsableAssessment(enrollment: EligibilityEnrollment, assessment: EnrollmentAuthorization['assessment'] | undefined, policies: ApprovedTerritoryPolicy[], now: Date) {
    const verifiedExperience = assessment?.experience;
    if (!assessment || assessment.status!=='verified' || verifiedExperience==='unknown' || verifiedExperience!==enrollment.requestedExperience || assessment.territory!==enrollment.territory
      || !assessment.verifiedAt || Date.parse(assessment.verifiedAt)>now.getTime() || Date.parse(assessment.expiresAt)<=now.getTime()
      || !sameMap(assessment.policyVersions,Object.fromEntries(policies.map(policy => [policy.id,policy.version])))) return false;
    return policies.every(policy => policy.allowedExperiences.includes(verifiedExperience)
      && (policy.minimumAccessThreshold===null || thresholdValue(assessment.thresholds,policy.minimumAccessThreshold)===true));
  }
  private authorizationStatus(enrollment: EligibilityEnrollment, assessment: EnrollmentAuthorization['assessment'] | undefined,
    guardians: GuardianAuthorization[], policies: ApprovedTerritoryPolicy[], now: Date): 'authorized' | 'verification_required' {
    if (!this.hasUsableAssessment(enrollment,assessment,policies,now)) return 'verification_required';
    for (const purpose of requiredGuardianPurposes(enrollment.requestedExperience,policies,assessment)) {
      if (!validGuardianForPurpose(guardians,purpose,policies,now)) return 'verification_required';
    }
    return 'authorized';
  }

  async prescreen(input: { requestedExperience: Exclude<Experience,'unknown'>; territory: string }): Promise<SafeEnrollmentStatus> {
    const now = this.now();
    if (!this.assurance.callbacksEnabled) return { status: 'unavailable', nextStep: null };
    const policies = applicablePolicies({ declaredTerritory: input.territory, operatorPolicyIds: this.operatorIds() },this.registry(),now);
    if (!policies || policies.some(policy => !policy.allowedExperiences.includes(input.requestedExperience))) return { status: 'unavailable', nextStep: null };
    if (input.requestedExperience==='under_13' && policies.some(policy => !policy.requiredGuardianPurposes.includes('account_collection')
      || !policy.guardianNoticeVersions.account_collection)) return { status: 'unavailable', nextStep: null };
    const enrollmentId = randomUUID();
    const registrationNonce = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime()+30*60_000).toISOString();
    try {
      await db.transaction(async tx => this.repository.createEnrollment({ id: enrollmentId, credentialHash: digest(registrationNonce),
        registrationNonceHash: digest(registrationNonce), requestedExperience: input.requestedExperience, territory: input.territory, expiresAt },tx));
    } catch {
      throw new EnrollmentUnavailableError();
    }
    const needsGuardian = input.requestedExperience==='under_13';
    return { status: 'verification_required', nextStep: needsGuardian ? 'guardian_authorization' : 'age_assessment',
      enrollment: { id: enrollmentId, registrationNonce, expiresAt } };
  }

  async status(enrollmentId: string, registrationNonce: string): Promise<SafeEnrollmentProgress | undefined> {
    const enrollment = await this.repository.readEnrollment(enrollmentId);
    if (!enrollment || !secretMatches(registrationNonce,enrollment.credentialHash) || !secretMatches(registrationNonce,enrollment.registrationNonceHash)) return undefined;
    const now = this.now();
    if (enrollment.status==='authorized' && Date.parse(enrollment.expiresAt)>now.getTime()) {
      const policies = currentPolicies(enrollment,this.registry(),this.operatorIds(),now);
      if (!policies) return { status: 'unavailable', nextStep: null };
      const evidence = await db.transaction(tx => this.repository.readEnrollmentEvidence(enrollmentId,tx));
      if (this.authorizationStatus(enrollment,evidence.assessment,evidence.guardianAuthorizations,policies,now)==='authorized'
        && sameMap(enrollment.policyVersions,Object.fromEntries(policies.map(policy => [policy.id,policy.version])))) {
        return { status: 'authorized', nextStep: 'complete_registration', enrollment: { id: enrollment.id, expiresAt: enrollment.expiresAt } };
      }
    }
    if (enrollment.status!=='pending' || Date.parse(enrollment.expiresAt)<=now.getTime() || !this.assurance.callbacksEnabled) return { status: 'unavailable', nextStep: null };
    const policies = currentPolicies(enrollment,this.registry(),this.operatorIds(),now);
    if (!policies) return { status: 'unavailable', nextStep: null };
    const evidence = await db.transaction(tx => this.repository.readEnrollmentEvidence(enrollmentId,tx));
    const needsGuardian = [...requiredGuardianPurposes(enrollment.requestedExperience,policies,evidence.assessment)]
      .some(purpose => !validGuardianForPurpose(evidence.guardianAuthorizations,purpose,policies,now));
    return { status: 'verification_required', nextStep: needsGuardian ? 'guardian_authorization' : 'age_assessment',
      enrollment: { id: enrollment.id, expiresAt: enrollment.expiresAt } };
  }

  async startChallenge(enrollmentId: string, registrationNonce: string, purpose: 'guardian_authorization' | 'age_assessment') {
    if (!this.assurance.callbacksEnabled) throw new EnrollmentUnavailableError();
    const prepared = await db.transaction(async tx => {
      await this.repository.lockSubject({ enrollmentId },tx);
      const enrollment = await this.repository.readEnrollment(enrollmentId,tx);
      const now = await this.repository.databaseTime(tx);
      if (!enrollment || !secretMatches(registrationNonce,enrollment.credentialHash) || enrollment.status!=='pending'
        || Date.parse(enrollment.expiresAt)<=now.getTime()) throw new EnrollmentUnavailableError();
      const registry = this.registry(); const operatorIds = this.operatorIds();
      const policies = currentPolicies(enrollment,registry,operatorIds,now);
      if (!policies || policies.some(policy => !policy.allowedExperiences.includes(enrollment.requestedExperience))) throw new EnrollmentUnavailableError();
      const evidence = await this.repository.readEnrollmentEvidence(enrollmentId,tx);
    const purposes = requiredGuardianPurposes(enrollment.requestedExperience,policies,evidence.assessment);
      if (purpose==='guardian_authorization') {
        if (![...purposes].some(value => !validGuardianForPurpose(evidence.guardianAuthorizations,value,policies,now))) throw new EnrollmentUnavailableError();
      } else if (this.collectionFirst(enrollment)
        && !validGuardianForPurpose(evidence.guardianAuthorizations,'account_collection',policies,now)) {
        throw new EnrollmentUnavailableError();
      }
      return { enrollment,registry,operatorIds,subjectRevision: await this.repository.subjectRevision({ enrollmentId },tx),
        policyFingerprint: policyFingerprint(registry,operatorIds),purposes };
    });
    const input: AssuranceChallengeInput = purpose==='guardian_authorization'
      ? { purpose,territory: prepared.enrollment.territory,purposes: [...prepared.purposes] }
      : { purpose,territory: prepared.enrollment.territory };
    let challenge: Awaited<ReturnType<AssuranceService['startChallenge']>>;
    try {
      challenge = await this.assurance.startChallenge({ enrollmentId },input,
        { subjectRevision: prepared.subjectRevision,policyFingerprint: prepared.policyFingerprint });
      await db.transaction(async tx => {
        await this.repository.lockSubject({ enrollmentId },tx);
        const current = await this.repository.readEnrollment(enrollmentId,tx);
        const now = await this.repository.databaseTime(tx);
        const registry = this.registry(); const operatorIds = this.operatorIds();
        if (!current || current.status!=='pending' || Date.parse(current.expiresAt)<=now.getTime()
          || await this.repository.subjectRevision({ enrollmentId },tx)!==prepared.subjectRevision
          || policyFingerprint(registry,operatorIds)!==prepared.policyFingerprint
          || !currentPolicies(current,registry,operatorIds,now)) throw new EnrollmentUnavailableError();
      });
    } catch {
      if (challenge!) await this.repository.revokeChallenge(challenge.challengeId).catch(() => undefined);
      throw new EnrollmentUnavailableError();
    }
    return challenge;
  }

  /** Call inside the account-create transaction. The enrollment row lock is held through binding. */
  async consumeAuthorizedEnrollment(enrollmentId: string, registrationNonce: string, tx: DbTransaction): Promise<EnrollmentAuthorization> {
    await this.repository.lockSubject({ enrollmentId },tx);
    const enrollment = await this.repository.readEnrollment(enrollmentId,tx);
    const now = await this.repository.databaseTime(tx);
    if (!enrollment || enrollment.status!=='authorized' || Date.parse(enrollment.expiresAt)<=now.getTime()
      || !secretMatches(registrationNonce,enrollment.credentialHash) || !secretMatches(registrationNonce,enrollment.registrationNonceHash)) throw new EnrollmentUnavailableError();
    const policies = currentPolicies(enrollment,this.registry(),this.operatorIds(),now);
    if (!policies || !sameMap(enrollment.policyVersions,Object.fromEntries(policies.map(policy => [policy.id,policy.version])))) throw new EnrollmentUnavailableError();
    const evidence = await this.repository.readEnrollmentEvidence(enrollmentId,tx);
    if (this.authorizationStatus(enrollment,evidence.assessment,evidence.guardianAuthorizations,policies,now)!=='authorized' || !evidence.assessment) {
      throw new EnrollmentUnavailableError();
    }
    return { enrollmentId,experience: enrollment.requestedExperience,territory: enrollment.territory,assessment: evidence.assessment,
      guardianAuthorizations: evidence.guardianAuthorizations,policyVersions: enrollment.policyVersions };
  }

  async bindAuthorizedEnrollment(authorization: EnrollmentAuthorization, registrationNonce: string, userId: string, tx: DbTransaction): Promise<void> {
    await this.repository.bindEnrollment(authorization.enrollmentId,userId,digest(registrationNonce),tx);
  }
}
