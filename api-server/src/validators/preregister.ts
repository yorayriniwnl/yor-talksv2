import { z } from "zod";

export const preregisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please provide a valid email address")
    .max(255, "Email address is too long"),
  username: z.string().trim().toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must not exceed 24 characters")
    .regex(/^[a-z0-9_][a-z0-9_-]{2,23}$/, "Username must contain only letters, numbers, underscores, or hyphens"),
  launchUpdatesConsent: z.literal(true, { error: "Please agree to receive launch and early member updates" }),
  referralCode: z.string().trim().toUpperCase().max(28)
    .regex(/^YOR-[A-F0-9]{6,24}$/, "Invalid invite code").optional(),
  perks: z.array(z.enum(["founder-badge", "priority-access", "community-input", "username-preference"]))
    .max(4).optional(),
}).strict();

export type PreregisterInput = z.infer<typeof preregisterSchema>;
