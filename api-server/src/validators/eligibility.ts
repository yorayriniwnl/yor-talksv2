import { z } from 'zod';

const territory = z.string().regex(/^[A-Z]{2}$/);
const purposes = z.array(z.enum(['account_collection','account_activation','social_contact'])).min(1).max(3)
  .refine(values => new Set(values).size === values.length,'Duplicate permission purpose');
export const assuranceChallengeSchema = z.discriminatedUnion('purpose',[
  z.object({ purpose: z.literal('age_assessment'),territory }).strict(),
  z.object({ purpose: z.literal('guardian_authorization'),territory,purposes }).strict(),
]);
export const guardianJourneySchema = z.object({ territory,purposes }).strict();
export const eligibilityChallengeParams = z.object({ challengeId: z.string().uuid() }).strict();
export const guardianAuthorizationParams = z.object({ authorizationId: z.string().uuid() }).strict();
export type AssuranceChallengeInput = z.infer<typeof assuranceChallengeSchema>;
