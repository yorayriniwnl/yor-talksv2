import type { PoolClient } from 'pg';

export function migrateEligibility(client: PoolClient): Promise<void>;
