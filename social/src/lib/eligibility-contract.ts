import { z } from 'zod';

const capabilityNames = ['social', 'publish', 'messaging', 'payments', 'seller', 'memberships', 'live', 'rtc', 'ai', 'analytics', 'profiling'] as const;
const capabilitySchema = z.object(Object.fromEntries(capabilityNames.map((name) => [name, z.boolean()])) as Record<(typeof capabilityNames)[number], z.ZodBoolean>).strict();
const policyVersionsSchema = z.array(z.string().min(1).max(128)).max(32);

export const eligibilityDecisionSchema = z.object({
  experience: z.enum(['unknown', 'under_13', 'teen_13_17', 'adult_18_plus']),
  activated: z.boolean(),
  capabilities: capabilitySchema,
  maximumContentRating: z.enum(['child_safe', 'regular', 'mature']),
  policyVersions: policyVersionsSchema,
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  reason: z.enum(['verification_required', 'territory_unavailable', 'guardian_required', 'reassessment_required', 'account_restricted']).nullable(),
  publicBrowsingAllowed: z.boolean(),
}).strict().refine((decision) => decision.experience !== 'unknown' || !decision.activated, 'Unknown experience cannot activate an account');

export const challengeReceiptSchema = z.object({
  challengeId: z.string().uuid(),
  nextStep: z.literal('verification_required'),
  redirectUrl: z.string().url().refine((value) => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
  }),
  expiresAt: z.string().datetime({ offset: true }),
}).strict();

export const challengeStatusSchema = z.object({
  challengeId: z.string().uuid(),
  purpose: z.enum(['age_assessment', 'guardian_authorization']),
  status: z.enum(['pending', 'consumed', 'revoked', 'expired']),
  expiresAt: z.string().datetime({ offset: true }),
}).strict();

const enrollmentSchema = z.object({
  id: z.string().uuid(),
  expiresAt: z.string().datetime({ offset: true }),
}).strict();

export const enrollmentPrescreenSchema = z.object({
  status: z.enum(['unavailable', 'verification_required']),
  nextStep: z.enum(['guardian_authorization', 'age_assessment']).nullable(),
  enrollment: z.object({ ...enrollmentSchema.shape, registrationNonce: z.string().min(32).max(128) }).strict().optional(),
}).strict().refine((value) => value.status === 'unavailable' ? value.nextStep === null && !value.enrollment : Boolean(value.nextStep && value.enrollment));

export const enrollmentProgressSchema = z.object({
  status: z.enum(['unavailable', 'verification_required', 'authorized']),
  nextStep: z.enum(['guardian_authorization', 'age_assessment', 'complete_registration']).nullable(),
  enrollment: enrollmentSchema.optional(),
}).strict().refine((value) => value.status === 'authorized' ? value.nextStep === 'complete_registration' && Boolean(value.enrollment) : true);

export const guardianAuthorizationSchema = z.object({
  id: z.string().uuid(),
  purposes: z.array(z.enum(['account_collection', 'account_activation', 'social_contact'])).min(1).max(3),
  status: z.enum(['granted', 'withdrawn', 'revoked']),
  expiresAt: z.string().datetime({ offset: true }),
}).strict();

export const contactRulesSchema = z.object({
  decision: eligibilityDecisionSchema,
  guardianContactsRequired: z.boolean(),
  guardianPolicyVersions: z.record(z.string(), z.string().min(1).max(128)),
  guardianNoticeVersions: z.record(z.string(), z.string().min(1).max(128)),
}).strict();

export const contactRequestSchema = z.object({
  id: z.string().uuid(),
  initiatorId: z.string().uuid(),
  recipientId: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'rejected', 'revoked']),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  requiresYourAcceptance: z.boolean(),
  guardianApprovalRequired: z.boolean(),
}).strict();
export const contactRequestListSchema = z.array(contactRequestSchema).max(200);
export const guardianWithdrawalReceiptSchema = z.literal(true);
export const nullReceiptSchema = z.null();

export const groupInvitationSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  inviterId: z.string().uuid(),
  recipientId: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'rejected', 'revoked']),
  memberIds: z.array(z.string().uuid()).max(100),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  requiresYourAcceptance: z.boolean(),
  guardianApprovalRequired: z.boolean(),
}).strict();
export const groupInvitationListSchema = z.array(groupInvitationSchema).max(200);
export const groupInvitationAcceptanceSchema = z.object({
  invitation: groupInvitationSchema,
  refreshedInvitations: groupInvitationListSchema,
}).strict();
export const invitationSummarySchema = groupInvitationSchema;

export type EligibilityDecision = z.infer<typeof eligibilityDecisionSchema>;
export type ChallengeReceipt = z.infer<typeof challengeReceiptSchema>;
export type ChallengeStatus = z.infer<typeof challengeStatusSchema>;
export type EnrollmentPrescreen = z.infer<typeof enrollmentPrescreenSchema>;
export type EnrollmentProgress = z.infer<typeof enrollmentProgressSchema>;
export type GuardianAuthorizationSummary = z.infer<typeof guardianAuthorizationSchema>;
export type ContactRules = z.infer<typeof contactRulesSchema>;
export type ContactRequestSummary = z.infer<typeof contactRequestSchema>;
export type InvitationSummary = z.infer<typeof groupInvitationSchema>;

export function parseEligibilityDecision(value: unknown): EligibilityDecision | null {
  const parsed = eligibilityDecisionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
