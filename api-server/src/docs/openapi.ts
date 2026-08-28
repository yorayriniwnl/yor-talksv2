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
  },
};
