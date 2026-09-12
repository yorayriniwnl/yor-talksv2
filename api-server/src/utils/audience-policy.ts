export type AudienceKind = "public" | "followers" | "close_friends" | "selected_people" | "everyone_except" | "custom";

export type AudienceDecisionReason =
  | "owner"
  | "public"
  | "follower"
  | "close_friend"
  | "selected_member"
  | "excluded"
  | "blocked"
  | "not_authenticated"
  | "not_in_audience";

export interface AudiencePolicyInput {
  ownerId: string;
  viewerId?: string;
  audience: AudienceKind;
  isFollowing: boolean;
  isCloseFriend: boolean;
  selectedMember: boolean;
  excluded: boolean;
  blocked: boolean;
}

export interface AudienceDecision {
  allowed: boolean;
  reason: AudienceDecisionReason;
}

export function evaluateAudience(input: AudiencePolicyInput): AudienceDecision {
  if (input.blocked) return { allowed: false, reason: "blocked" };
  if (input.ownerId === input.viewerId) return { allowed: true, reason: "owner" };
  if (!input.viewerId) return { allowed: false, reason: "not_authenticated" };

  switch (input.audience) {
    case "public":
      return { allowed: true, reason: "public" };
    case "followers":
      return input.isFollowing
        ? { allowed: true, reason: "follower" }
        : { allowed: false, reason: "not_in_audience" };
    case "close_friends":
      return input.isCloseFriend
        ? { allowed: true, reason: "close_friend" }
        : { allowed: false, reason: "not_in_audience" };
    case "selected_people":
    case "custom":
      return input.selectedMember
        ? { allowed: true, reason: "selected_member" }
        : { allowed: false, reason: "not_in_audience" };
    case "everyone_except":
      return input.excluded
        ? { allowed: false, reason: "excluded" }
        : { allowed: true, reason: "public" };
    default:
      return { allowed: false, reason: "not_in_audience" };
  }
}
