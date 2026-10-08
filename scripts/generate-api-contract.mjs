import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routesDirectory = path.join(workspaceRoot, "api-server", "src", "routes");
const yamlTarget = path.join(workspaceRoot, "lib", "api-spec", "openapi.yaml");
const catalogTarget = path.join(workspaceRoot, "api-server", "src", "docs", "routes.generated.ts");

const mountPrefixes = {
  "ai.ts": "/ai",
  "business.ts": "/business",
  "creator-workspace.ts": "/creator",
  "economy-routes.ts": "/economy",
  "invites.ts": "/invites",
  "onboarding.ts": "/onboarding",
  "projects.ts": "/projects",
  "reports.ts": "/reports",
  "subscriptions.ts": "/subscriptions",
};

const methodOrder = ["get", "post", "put", "patch", "delete"];
const mediaPurposes = ["avatar", "post", "comment", "video_comment", "message", "story", "video", "product", "article", "event", "live_stream", "broadcast_channel", "highlight", "showcase", "business", "community"];
const mediaMimes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"];
const mediaId = { type: "string", format: "uuid", description: "An approved server-owned asset belonging to the authenticated owner and matching this consumer's purpose." };
const reservationId = { type: "string", format: "uuid", description: "Server-generated lifecycle record ID." };
const mediaIds = { type: "array", maxItems: 10, uniqueItems: true, items: mediaId };
const rawMediaFields = ["images", "mediaUrl", "videoUrl", "thumbnailUrl", "avatarUrl", "coverUrl", "logoUrl", "customImageUrl"];
const mediaSchemas = {
  MediaPresignRequest: { type: "object", additionalProperties: false, required: ["filename", "mimeType", "size", "purpose"], properties: {
    filename: { type: "string", minLength: 1, maxLength: 255 }, mimeType: { type: "string", enum: mediaMimes },
    size: { type: "integer", minimum: 1, maximum: 10485760, description: "Declared bytes; purpose-specific limits may be lower. Actual bytes are verified server-side." }, purpose: { type: "string", enum: mediaPurposes },
  } },
  MediaFinalizeRequest: { type: "object", additionalProperties: false },
  MediaReservation: { type: "object", required: ["id", "mediaId", "status", "purpose", "mimeType", "maxFileSize", "mode", "uploadUrl"], properties: {
    id: reservationId, mediaId: reservationId, status: { const: "pending" }, purpose: { type: "string", enum: mediaPurposes }, mimeType: { type: "string", enum: mediaMimes },
    maxFileSize: { type: "integer" }, mode: { type: "string", enum: ["server", "direct"] }, uploadUrl: { type: "string" },
    fields: { type: "object", additionalProperties: { type: "string" }, description: "Present only for restricted direct uploads. Send every field unchanged. Provider response URLs are never publication credentials." },
  }, allOf: [{ if: { properties: { mode: { const: "direct" } } }, then: { required: ["fields"] }, else: { not: { required: ["fields"] } } }] },
  MediaResult: { type: "object", required: ["id", "mediaId", "status"], properties: {
    id: reservationId, mediaId: reservationId, status: { type: "string", enum: ["pending", "uploaded", "verifying", "approved", "rejected", "failed", "deleted"] },
    purpose: { type: "string", enum: mediaPurposes }, url: { type: "string", description: "Signed delivery URL, available only to the owner after approval; expires and must never be submitted as proof of approval." },
    thumbnailUrl: { type: ["string", "null"] }, mimeType: { type: "string", enum: mediaMimes }, size: { type: "integer" }, width: { type: "integer" }, height: { type: "integer" }, duration: { type: "number", description: "Verified seconds." },
  }, allOf: [{ if: { properties: { status: { const: "approved" } } }, then: { required: ["purpose", "url", "mimeType", "size"] },
    else: { not: { anyOf: [{ required: ["url"] }, { required: ["thumbnailUrl"] }] } } }] },
};
const publicGrievanceSchema = {
  type: "object", additionalProperties: false, required: ["ticketId", "status", "createdAt"],
  properties: {
    ticketId: { type: "string" },
    status: { type: "string", enum: ["received", "under_review", "resolved", "dismissed"] },
    createdAt: { type: "string", format: "date-time" },
    slaDeadline: { type: "string", format: "date-time", description: "Operational review target, not a universal statutory deadline." },
  },
};
const authorizationPurposes = ['account_collection','account_activation','social_contact'];
const assurancePurposesSchema = { type: 'array',minItems: 1,maxItems: 3,uniqueItems: true,items: { type: 'string',enum: authorizationPurposes } };
const territorySchema = { type: 'string',pattern: '^[A-Z]{2}$' };
const eligibilitySchemas = {
  AssuranceChallengeRequest: { oneOf: [
    { type: 'object',additionalProperties: false,required: ['purpose','territory'],properties: { purpose: { const: 'age_assessment' },territory: territorySchema } },
    { type: 'object',additionalProperties: false,required: ['purpose','territory','purposes'],properties: { purpose: { const: 'guardian_authorization' },territory: territorySchema,purposes: assurancePurposesSchema } },
  ] },
  GuardianJourneyRequest: { type: 'object',additionalProperties: false,required: ['territory','purposes'],properties: { territory: territorySchema,purposes: assurancePurposesSchema } },
  AssuranceChallengeReceipt: { type: 'object',additionalProperties: false,required: ['challengeId','nextStep','redirectUrl','expiresAt'],properties: {
    challengeId: { type: 'string',format: 'uuid' },nextStep: { const: 'verification_required' },redirectUrl: { type: 'string',format: 'uri' },expiresAt: { type: 'string',format: 'date-time' },
  } },
  AssuranceChallengeStatus: { type: 'object',additionalProperties: false,required: ['challengeId','purpose','status','expiresAt'],properties: {
    challengeId: { type: 'string',format: 'uuid' },purpose: { type: 'string',enum: ['age_assessment','guardian_authorization'] },
    status: { type: 'string',enum: ['pending','consumed','revoked','expired'] },expiresAt: { type: 'string',format: 'date-time' },
  } },
  GuardianAuthorizationReceipt: { type: 'object',additionalProperties: false,required: ['id','purposes','status','expiresAt'],properties: {
    id: { type: 'string',format: 'uuid' },purposes: assurancePurposesSchema,status: { type: 'string',enum: ['granted','withdrawn','revoked'] },expiresAt: { type: 'string',format: 'date-time' },
  } },
  GuardianAuthorizationList: { type: 'array',maxItems: 100,items: { $ref: '#/components/schemas/GuardianAuthorizationReceipt' } },
  GuardianWithdrawalReceipt: { type: 'boolean',const: true },
  EligibilityDecision: { type: 'object',additionalProperties: false,required: ['experience','activated','capabilities','maximumContentRating','policyVersions','revision','reason','publicBrowsingAllowed'],properties: {
    experience: { type: 'string',enum: ['unknown','under_13','teen_13_17','adult_18_plus'] },activated: { type: 'boolean' },
    capabilities: { type: 'object',additionalProperties: false,required: ['social','publish','messaging','payments','seller','memberships','live','rtc','ai','analytics','profiling'],
      properties: Object.fromEntries(['social','publish','messaging','payments','seller','memberships','live','rtc','ai','analytics','profiling'].map(key => [key,{ type: 'boolean' }])) },
    maximumContentRating: { type: 'string',enum: ['child_safe','regular','mature'] },policyVersions: { type: 'array',items: { type: 'string' } },
    revision: { type: 'string',pattern: '^[a-f0-9]{64}$' },reason: { type: ['string','null'],enum: [null,'verification_required','territory_unavailable','guardian_required','reassessment_required','account_restricted'] },publicBrowsingAllowed: { type: 'boolean' },
  } },
};
function eligibilityContract(route) {
  const key = `${route.method} ${route.path}`;
  const definitions = {
    'get /users/me/eligibility': { result: 'EligibilityDecision' },
    'post /users/me/eligibility/challenges': { request: 'AssuranceChallengeRequest',result: 'AssuranceChallengeReceipt',created: true },
    'get /users/me/eligibility/challenges/{challengeId}': { result: 'AssuranceChallengeStatus' },
    'get /users/me/guardian-authorizations': { result: 'GuardianAuthorizationList' },
    'post /users/me/guardian-authorizations': { request: 'GuardianJourneyRequest',result: 'AssuranceChallengeReceipt',created: true },
    'post /users/me/guardian-authorizations/{authorizationId}/withdraw': { result: 'GuardianWithdrawalReceipt' },
  };
  return definitions[key];
}
const publicationMediaFields = {
  "post /posts": { mediaIds }, "post /products": { mediaIds }, "post /stories": { mediaId }, "post /messages": { mediaId },
  "post /posts/{postId}/comments": { mediaId }, "post /videos/{id}/comments": { mediaId },
  "post /videos": { mediaId, thumbnailMediaId: mediaId, externalVideoUrl: { type: "string", format: "uri", description: "Separate allowlisted external embed; requires an approved video-purpose image thumbnail." } },
  "put /users/me": { avatarMediaId: mediaId }, "post /articles": { coverMediaId: mediaId }, "post /events": { coverMediaId: mediaId },
  "post /streams": { coverMediaId: mediaId }, "post /broadcast-channels": { coverMediaId: mediaId }, "post /highlights": { coverMediaId: mediaId },
  "post /users/{userId}/showcases": { customImageMediaId: mediaId },
  "post /business": { logoMediaId: mediaId }, "post /communities": { coverMediaId: mediaId },
};
function mediaRequest(route) {
  if (route.path === "/media/presign") return { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MediaPresignRequest" } } } };
  if (route.path === "/media/{id}/finalize") return { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/MediaFinalizeRequest" } } } };
  const fileField = route.path === "/posts/upload-image" ? "image" : route.path === "/users/me/avatar" ? "avatar" : "file";
  if (["/media/upload", "/media/{id}/upload", "/posts/upload-image", "/users/me/avatar"].includes(route.path)) return { required: true, content: { "multipart/form-data": { schema: {
    type: "object", additionalProperties: false, required: route.path === "/media/upload" ? [fileField, "purpose"] : [fileField],
    properties: { [fileField]: { type: "string", format: "binary" }, ...(route.path === "/media/upload" ? { purpose: { type: "string", enum: mediaPurposes } } : {}) },
  } } } };
  const properties = publicationMediaFields[`${route.method} ${route.path}`];
  if (properties) return { required: true, description: "Media fields shown below replace uploaded URLs. Remaining content fields follow the route validator. Raw media URL fields are rejected; ownership, purpose and approved status are checked in the publication transaction.",
    content: { "application/json": { schema: { type: "object", properties, additionalProperties: true,
      not: { anyOf: rawMediaFields.map(field => ({ required: [field] })) } } } } };
}

function findInvocationEnd(source, start) {
  const opening = source.indexOf("(", start);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = opening; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  throw new Error(`Could not find the end of a route declaration at character ${start}`);
}

function joinRoute(prefix, route) {
  const combined = `${prefix ?? ""}${route === "/" ? "" : route}` || "/";
  return combined.replace(/\/+/g, "/").replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function toPascalCase(value) {
  return value
    .replace(/[{}]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function operationIdFor(method, route) {
  const segments = route.split("/").filter(Boolean);
  const suffix = segments.map((segment) => (
    segment.startsWith("{") ? `By${toPascalCase(segment)}` : toPascalCase(segment)
  )).join("") || "ApiRoot";
  return `${method}${suffix}`;
}

function titleFor(value) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function discoverRoutes() {
  const files = fs.readdirSync(routesDirectory)
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .sort();
  const routes = [];

  for (const file of files) {
    const source = fs.readFileSync(path.join(routesDirectory, file), "utf8");
    const routePattern = /router\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;
    for (const match of source.matchAll(routePattern)) {
      const invocation = source.slice(match.index, findInvocationEnd(source, match.index));
      const route = joinRoute(mountPrefixes[file], match[2]);
      // This callback is unmounted in production and has no approved provider
      // protocol. Explicit fixture injection does not create a public API.
      if (file === 'eligibility.ts' && route === '/eligibility/provider/callback') continue;
      const firstSegment = route.split("/").filter(Boolean)[0] ?? "system";
      routes.push({
        method: match[1],
        path: route,
        operationId: operationIdFor(match[1], route),
        tag: firstSegment,
        summary: `${titleFor(match[1])} ${route}`,
        authenticated: /\bauthenticate\b/.test(invocation),
        roles: [...invocation.matchAll(/requireRole\(([^)]+)\)/g)]
          .flatMap((roleMatch) => [...roleMatch[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1])),
      });
    }
  }

  routes.sort((left, right) => {
    const pathComparison = left.path.localeCompare(right.path);
    return pathComparison || methodOrder.indexOf(left.method) - methodOrder.indexOf(right.method);
  });

  const identities = new Set();
  const operationIds = new Set();
  for (const route of routes) {
    const identity = `${route.method} ${route.path}`;
    if (identities.has(identity)) throw new Error(`Duplicate API route: ${identity}`);
    if (operationIds.has(route.operationId)) throw new Error(`Duplicate operationId: ${route.operationId}`);
    identities.add(identity);
    operationIds.add(route.operationId);
  }
  return routes;
}

function renderCatalog(routes) {
  return `// Generated by scripts/generate-api-contract.mjs. Do not edit manually.\n` +
    `export interface ApiRouteDefinition {\n` +
    `  method: "get" | "post" | "put" | "patch" | "delete";\n` +
    `  path: string;\n` +
    `  operationId: string;\n` +
    `  tag: string;\n` +
    `  summary: string;\n` +
    `  authenticated: boolean;\n` +
    `  roles: readonly string[];\n` +
    `}\n\n` +
    `export const apiRouteCatalog = ${JSON.stringify(routes, null, 2)} as const satisfies readonly ApiRouteDefinition[];\n`;
}

function indent(lines, spaces) {
  const prefix = " ".repeat(spaces);
  return lines.map((line) => `${prefix}${line}`);
}

function renderYaml(routes) {
  const tags = [...new Set(routes.map((route) => route.tag))].sort();
  const byPath = new Map();
  for (const route of routes) {
    const existing = byPath.get(route.path) ?? [];
    existing.push(route);
    byPath.set(route.path, existing);
  }

  const lines = [
    "# Generated by scripts/generate-api-contract.mjs. Do not edit manually.",
    "openapi: 3.1.0",
    "info:",
    "  title: Yor Talks API",
    "  version: 1.0.0",
    "  description: Source-synchronized HTTP contract for the Yor Talks platform.",
    "servers:",
    "  - url: /api",
    "    description: Stable API",
    "  - url: /api/v1",
    "    description: Versioned API alias",
    "tags:",
    ...tags.map((tag) => `  - name: ${tag}`),
    "paths:",
  ];

  for (const [routePath, pathRoutes] of byPath) {
    lines.push(`  ${routePath}:`);
    for (const route of pathRoutes) {
      lines.push(`    ${route.method}:`);
      lines.push(...indent([
        `operationId: ${route.operationId}`,
        `summary: ${route.summary}`,
        `tags: [${route.tag}]`,
        ...(route.path === '/media/{id}/content' ? ['security:', '  - mediaGrant: []'] : route.authenticated ? ["security:", "  - bearerAuth: []"] : ["security: []"]),
      ], 6));

      const parameters = [...route.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
      if (parameters.length > 0) {
        lines.push("      parameters:");
        for (const parameter of parameters) {
          lines.push(...indent([
            `- name: ${parameter}`,
            "  in: path",
            "  required: true",
            "  schema:",
            "    type: string",
          ], 8));
        }
      }

      if (["post", "put", "patch"].includes(route.method)) {
        const eligibility = eligibilityContract(route);
        const request = eligibility?.request ? { required: true,content: { 'application/json': { schema: { $ref: `#/components/schemas/${eligibility.request}` } } } } : mediaRequest(route);
        if (request) lines.push(`      requestBody: ${JSON.stringify(request)}`);
        else lines.push(...indent([
          "requestBody:",
          "  required: false",
          "  content:",
          "    application/json:",
          "      schema:",
          "        type: object",
          "        additionalProperties: true",
        ], 6));
      }

      const publicGrievance = (route.path === "/reports/grievance" && route.method === "post") ||
        (route.path === "/reports/grievance/{ticketId}" && route.method === "get");
      const eligibility = eligibilityContract(route);
      const resultSchema = eligibility?.result ?? (publicGrievance ? "PublicGrievanceReceipt" : route.path === "/media/presign" ? "MediaReservation" : ["/media/upload", "/media/{id}/upload", "/media/{id}/finalize"].includes(route.path) ? "MediaResult" : undefined);
      const responseSchema = resultSchema ? `          ${JSON.stringify({ allOf: [{ $ref: "#/components/schemas/ApiEnvelope" }, { properties: { data: { $ref: `#/components/schemas/${resultSchema}` } } }] })}` : '          $ref: "#/components/schemas/ApiEnvelope"';
      if (route.path === '/media/{id}/content') {
        const binary = { description: 'Approved original bytes or a JPEG poster derived from verified original bytes', content: Object.fromEntries(mediaMimes.map(mime => [mime, { schema: { type: 'string', format: 'binary' } }])) };
        lines.push(`      responses: ${JSON.stringify({ '200': binary, '206': binary, '403': { description: 'Invalid or expired delivery grant' }, '404': { description: 'Media revoked or unavailable' }, '415': { description: 'Provider bytes no longer match the approved hash' }, '416': { description: 'Invalid or unsatisfiable single byte range' }, '502': { description: 'Provider unavailable' }, '503': { description: 'Media delivery busy or unavailable' } })}`);
      } else lines.push(...indent([
        "responses:",
        eligibility?.created || publicGrievance && route.method === "post" ? '  "201":' : '  "200":',
        "    description: Successful response",
        "    content:",
        "      application/json:",
        "        schema:",
        responseSchema,
        '  "400":',
        "    description: Invalid request",
        ...(route.authenticated ? ['  "401":', "    description: Authentication required"] : []),
        ...(route.roles.length > 0 ? ['  "403":', `    description: "Required role: ${route.roles.join(", ")}"`] : []),
      ], 6));
      if (eligibility) lines.push(...indent(['  "403":','    description: Current account or territory does not permit verification','  "404":','    description: Owner-bound record unavailable','  "429":','    description: Verification rate or outstanding challenge limit exceeded','  "503":','    description: Verification provider unavailable; no authority granted'],6));
      if (route.path.startsWith("/media/") && route.method !== "get") {
        if (route.path === "/media/{id}/finalize") lines.push('        "202":', '          description: Verification already in progress; retry the same media ID');
        if (route.path === "/media/upload") lines.push('        "201":', '          description: Media verified and approved');
        for (const [status, description] of [["403", "Media owner mismatch"], ["409", "Media closed, unapproved or in use"], ["413", "Purpose-specific byte limit exceeded"], ["415", "Unsupported type or verified metadata/byte mismatch"], ["502", "Provider unavailable"], ["503", "Storage, decoder or moderation unavailable; approval fails closed"]]) {
          lines.push(`        "${status}":`, `          description: ${description}`);
        }
      }
    }
  }

  lines.push(
    "components:",
    "  securitySchemes:",
    "    bearerAuth:",
    "      type: http",
    "      scheme: bearer",
    "      bearerFormat: JWT",
    "    mediaGrant:",
    "      type: apiKey",
    "      in: query",
    "      name: token",
    "  schemas:",
    "    ApiEnvelope:",
    "      type: object",
    "      required: [success, message, data, errors]",
    "      properties:",
    "        success: { type: boolean }",
    "        message: { type: string }",
    "        data: {}",
    "        errors:",
    "          type: array",
    "          items: { type: string }",
    "        meta:",
    "          type: object",
    "          additionalProperties: true",
  );
  for (const [name, schema] of Object.entries(mediaSchemas)) lines.push(`    ${name}: ${JSON.stringify(schema)}`);
  lines.push(`    PublicGrievanceReceipt: ${JSON.stringify(publicGrievanceSchema)}`);
  for (const [name,schema] of Object.entries(eligibilitySchemas)) lines.push(`    ${name}: ${JSON.stringify(schema)}`);
  return `${lines.join("\n")}\n`;
}

const routes = discoverRoutes();
const outputs = [
  [catalogTarget, renderCatalog(routes)],
  [yamlTarget, renderYaml(routes)],
];
const checkOnly = process.argv.includes("--check");

for (const [target, content] of outputs) {
  if (checkOnly) {
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") : "";
    if (current !== content) {
      console.error(`[api contract] ${path.relative(workspaceRoot, target)} is stale. Run pnpm contract:generate.`);
      process.exitCode = 1;
    }
  } else {
    fs.writeFileSync(target, content, "utf8");
  }
}

if (!process.exitCode) {
  console.log(`[api contract] ${checkOnly ? "Verified" : "Generated"} ${routes.length} operations across ${new Set(routes.map((route) => route.path)).size} paths.`);
}
