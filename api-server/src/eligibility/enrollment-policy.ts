import type { ApprovedTerritoryPolicy, AuthorizationPurpose, EnrollmentAuthorization, Experience } from './types.js';

export function thresholdValue(assertions: Array<{ age: number; atLeast: boolean }>, threshold: number): boolean | undefined {
  const direct = assertions.find(item => item.age===threshold);
  if (direct) return direct.atLeast;
  if (assertions.some(item => item.atLeast && item.age>threshold)) return true;
  if (assertions.some(item => !item.atLeast && item.age<threshold)) return false;
  return undefined;
}

/** Guardian purposes are derived from verified age evidence and the current territory policies. */
export function requiredGuardianPurposes(
  experience: Experience,
  policies: ApprovedTerritoryPolicy[],
  assessment?: EnrollmentAuthorization['assessment'],
): Set<AuthorizationPurpose> {
  const required = new Set<AuthorizationPurpose>();
  if (experience==='under_13') {
    for (const purpose of policies.flatMap(policy => policy.requiredGuardianPurposes)) required.add(purpose);
    required.add('account_collection');
    return required;
  }
  if (!assessment || assessment.status!=='verified') return required;
  const needsGuardian = policies.some(policy => thresholdValue(assessment.thresholds,policy.independentConsentThreshold)!==true
    || policy.guardianRequiredBelow!=null && thresholdValue(assessment.thresholds,policy.guardianRequiredBelow)!==true);
  if (needsGuardian) for (const purpose of policies.flatMap(policy => policy.requiredGuardianPurposes)) required.add(purpose);
  return required;
}
