import { apiRouteCatalog } from "./routes.generated.js";

type OpenApiOperation = {
  operationId: string;
  summary: string;
  tags: string[];
  security: Array<{ bearerAuth: never[] }>;
  parameters?: Array<{
    name: string;
    in: "path";
    required: true;
    schema: { type: "string" };
  }>;
  responses: Record<string, { description: string }>;
};

const capabilityNames = ["social", "publish", "messaging", "payments", "seller", "memberships", "live", "rtc", "ai", "analytics", "profiling"];
const publicEligibilitySchemas = {
  EligibilityDecision: {
    type: "object", additionalProperties: false,
    required: ["experience", "activated", "capabilities", "maximumContentRating", "policyVersions", "revision", "reason", "publicBrowsingAllowed"],
    properties: {
      experience: { type: "string", enum: ["unknown", "under_13", "teen_13_17", "adult_18_plus"] },
      activated: { type: "boolean" },
      capabilities: { type: "object", additionalProperties: false, required: capabilityNames, properties: Object.fromEntries(capabilityNames.map((name) => [name, { type: "boolean" }])) },
      maximumContentRating: { type: "string", enum: ["child_safe", "regular", "mature"] },
      policyVersions: { type: "array", maxItems: 32, items: { type: "string", minLength: 1, maxLength: 128 } },
      revision: { type: "string", pattern: "^[a-f0-9]{64}$" },
      reason: { type: ["string", "null"], enum: [null, "verification_required", "territory_unavailable", "guardian_required", "reassessment_required", "account_restricted"] },
      publicBrowsingAllowed: { type: "boolean" },
    },
  },
  AssuranceChallengeReceipt: {
    type: "object", additionalProperties: false, required: ["challengeId", "nextStep", "redirectUrl", "expiresAt"],
    properties: { challengeId: { type: "string", format: "uuid" }, nextStep: { const: "verification_required" },
      redirectUrl: { type: "string", format: "uri", description: "HTTPS provider redirect with no user credentials in its query string." }, expiresAt: { type: "string", format: "date-time" } },
  },
  AssuranceChallengeStatus: {
    type: "object", additionalProperties: false, required: ["challengeId", "purpose", "status", "expiresAt"],
    properties: { challengeId: { type: "string", format: "uuid" }, purpose: { type: "string", enum: ["age_assessment", "guardian_authorization"] },
      status: { type: "string", enum: ["pending", "consumed", "revoked", "expired"] }, expiresAt: { type: "string", format: "date-time" } },
  },
  SafeEnrollmentStatus: {
    type: "object", additionalProperties: false, required: ["status", "nextStep"],
    properties: { status: { type: "string", enum: ["unavailable", "verification_required", "authorized"] }, nextStep: { type: ["string", "null"], enum: [null, "guardian_authorization", "age_assessment", "complete_registration"] },
      enrollment: { type: "object", additionalProperties: false, required: ["id", "registrationNonce", "expiresAt"], properties: { id: { type: "string", format: "uuid" }, registrationNonce: { type: "string", minLength: 32, maxLength: 128 }, expiresAt: { type: "string", format: "date-time" } } } },
  },
  SafeEnrollmentProgress: {
    type: "object", additionalProperties: false, required: ["status", "nextStep"],
    properties: { status: { type: "string", enum: ["unavailable", "verification_required", "authorized"] }, nextStep: { type: ["string", "null"], enum: [null, "guardian_authorization", "age_assessment", "complete_registration"] },
      enrollment: { type: "object", additionalProperties: false, required: ["id", "expiresAt"], properties: { id: { type: "string", format: "uuid" }, expiresAt: { type: "string", format: "date-time" } } } },
  },
  OwnerSafeGuardianAuthorization: {
    type: "object", additionalProperties: false, required: ["id", "purposes", "status", "expiresAt"],
    properties: { id: { type: "string", format: "uuid" }, purposes: { type: "array", items: { type: "string", enum: ["account_collection", "account_activation", "social_contact"] } },
      status: { type: "string", enum: ["granted", "withdrawn", "revoked"] }, expiresAt: { type: "string", format: "date-time" } },
  },
  OwnerSafeContactRules: {
    type: "object", additionalProperties: false, required: ["decision", "guardianContactsRequired", "guardianPolicyVersions", "guardianNoticeVersions"],
    properties: { decision: { $ref: "#/components/schemas/EligibilityDecision" }, guardianContactsRequired: { type: "boolean" },
      guardianPolicyVersions: { type: "object", additionalProperties: { type: "string" } }, guardianNoticeVersions: { type: "object", additionalProperties: { type: "string" } } },
  },
  SafeContactRequest: {
    type: "object", additionalProperties: false, required: ["id", "initiatorId", "recipientId", "status", "createdAt", "updatedAt", "requiresYourAcceptance", "guardianApprovalRequired"],
    properties: { id: { type: "string", format: "uuid" }, initiatorId: { type: "string", format: "uuid" }, recipientId: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["pending", "accepted", "rejected", "revoked"] }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
      requiresYourAcceptance: { type: "boolean" }, guardianApprovalRequired: { type: "boolean" } },
  },
  SafeInvitationSummary: {
    type: "object", additionalProperties: false, required: ["id", "conversationId", "inviterId", "recipientId", "status", "memberIds", "createdAt", "updatedAt", "requiresYourAcceptance", "guardianApprovalRequired"],
    properties: { id: { type: "string", format: "uuid" }, conversationId: { type: "string", format: "uuid" }, inviterId: { type: "string", format: "uuid" }, recipientId: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["pending", "accepted", "rejected", "revoked"] }, memberIds: { type: "array", maxItems: 100, items: { type: "string", format: "uuid" } },
      createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }, requiresYourAcceptance: { type: "boolean" }, guardianApprovalRequired: { type: "boolean" } },
  },
  SafeGroupInvitationList: { type: "array", maxItems: 200, items: { $ref: "#/components/schemas/SafeInvitationSummary" } },
  SafeGroupAcceptanceResult: { type: "object", additionalProperties: false, required: ["invitation", "refreshedInvitations"],
    properties: { invitation: { $ref: "#/components/schemas/SafeInvitationSummary" }, refreshedInvitations: { $ref: "#/components/schemas/SafeGroupInvitationList" } } },
  InviteToGroupRequest: { type: "object", additionalProperties: false, required: ["inviteeIds"],
    properties: { inviteeIds: { type: "array", minItems: 1, maxItems: 99, uniqueItems: true, items: { type: "string", format: "uuid" } } } },
  GroupInvitationDecisionRequest: { type: "object", additionalProperties: false, required: ["updatedAt"], properties: { updatedAt: { type: "string", format: "date-time" } } },
};

const paths: Record<string, Record<string, OpenApiOperation>> = {};
for (const route of apiRouteCatalog) {
  const parameters = [...route.path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1],
    in: "path" as const,
    required: true as const,
    schema: { type: "string" as const },
  }));
  paths[route.path] ??= {};
  paths[route.path][route.method] = {
    operationId: route.operationId,
    summary: route.summary,
    tags: [route.tag],
    security: route.authenticated ? [{ bearerAuth: [] }] : [],
    ...(parameters.length > 0 ? { parameters } : {}),
    responses: {
      "200": { description: "Successful response" },
      "400": { description: "Invalid request" },
      ...(route.authenticated ? { "401": { description: "Authentication required" } } : {}),
      ...(route.roles.length > 0 ? { "403": { description: `Required role: ${route.roles.join(", ")}` } } : {}),
    },
  };
}

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Yor Talks API",
    version: "1.0.0",
    description: "Source-synchronized HTTP contract for the Yor Talks platform.",
  },
  servers: [
    { url: "/api", description: "Stable API" },
    { url: "/api/v1", description: "Versioned API alias" },
  ],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: publicEligibilitySchemas,
  },
};
