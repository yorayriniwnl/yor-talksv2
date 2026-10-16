/** Synthetic accounts and engagement are for explicitly selected disposable data only. */
export function assertSyntheticSeedAllowed(environment: NodeJS.ProcessEnv = process.env): void {
  if (!['development', 'test'].includes(environment.NODE_ENV ?? '')) {
    throw new Error('Synthetic seeding requires NODE_ENV=development or test; production seeding is disabled');
  }
  if (environment.ALLOW_SYNTHETIC_SEED !== 'true') {
    throw new Error('Synthetic seeding is disabled; opt in with ALLOW_SYNTHETIC_SEED=true for a disposable database');
  }
  let target: URL;
  try { target = new URL(environment.DATABASE_URL ?? ''); }
  catch { throw new Error('Synthetic seeding requires an explicit PostgreSQL database'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error('Synthetic seeding requires an explicit PostgreSQL database');
  }
  let database: string;
  try { database = decodeURIComponent(target.pathname.slice(1)); }
  catch { throw new Error('Synthetic seeding requires a valid database name'); }
  if (!database || database.includes('/') || environment.SYNTHETIC_SEED_DATABASE !== database) {
    throw new Error('Confirm the disposable database name with SYNTHETIC_SEED_DATABASE before seeding');
  }
}
