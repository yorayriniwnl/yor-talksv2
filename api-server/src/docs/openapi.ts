export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Yor Talks API",
    version: "1.0.0",
    description: "Backend API for Yor Talks social platform",
  },
  paths: {
    "/api/healthz": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "OK",
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register a new user",
        responses: {
          "201": {
            description: "Created",
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Login",
        responses: {
          "200": {
            description: "OK",
          },
        },
      },
    },
  },
};
