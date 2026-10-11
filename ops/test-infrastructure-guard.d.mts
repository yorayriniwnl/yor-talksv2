export function assertIsolatedPostgres(
  environment: { NODE_ENV?: string; DATABASE_URL?: string; CI?: string },
  identity?: { database: string; port?: number },
  databasePattern?: RegExp,
): URL;
