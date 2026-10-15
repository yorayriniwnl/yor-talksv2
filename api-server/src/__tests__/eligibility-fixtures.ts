import { randomUUID } from 'node:crypto';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';
import type { EligibilityFacts } from '../eligibility/types.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';

/** Synthetic authority is importable only from test setup, never production configuration. */
export async function createEligibilityFixture(userId: string, overrides: Partial<EligibilityFacts> = {}): Promise<void> {
  const now = new Date();
  const repository = new EligibilityRepository();
  await db.transaction(async tx => {
    await tx.execute(sql`DELETE FROM eligibility_assessments WHERE user_id=${userId}`);
    if (!('assessment' in overrides) || overrides.assessment) await repository.storeAssessment({
      id: randomUUID(), status: 'verified', issuer: 'isolated-fixture', method: 'synthetic-thresholds',
      experience: 'adult_18_plus', thresholds: [{ age: 13, atLeast: true }, { age: 18, atLeast: true }],
      territory: 'ZZ', policyVersions: { 'fixture-recipient': 'fixture-1', 'fixture-operator': 'fixture-1' },
      verifiedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
      evidenceReference: 'opaque-fixture-reference', ...overrides.assessment, userId, enrollmentId: undefined,
    }, tx);
    for (const authorization of overrides.guardianAuthorizations ?? []) {
      if (authorization.userId !== userId) throw new Error('Fixture authorization subject mismatch');
      await repository.storeGuardianAuthorization(authorization, tx);
    }
    if (overrides.account) await tx.execute(sql`UPDATE users SET account_status=${overrides.account.status},
      terms_version=${overrides.account.termsVersion},terms_accepted_at=${overrides.account.termsAcceptedAt},
      settings=jsonb_set(settings,'{contentFilter}',${JSON.stringify(overrides.account.contentPreference)}::jsonb)
      WHERE id=${userId}`);
    if (overrides.revision !== undefined) await tx.execute(sql`INSERT INTO eligibility_revisions(user_id,revision)
      VALUES(${userId},${overrides.revision}::bigint) ON CONFLICT(user_id) DO UPDATE SET revision=greatest(eligibility_revisions.revision,excluded.revision)`);
  });
}
