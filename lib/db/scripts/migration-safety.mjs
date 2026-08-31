/** Only a genuinely empty public schema can receive the initial schema push. */
export function planBaseSchema(existingObjects, requiredTables) {
  const existing = new Set(existingObjects);
  if (existing.size === 0) return 'bootstrap';
  const missing = requiredTables.filter((table) => !existing.has(table));
  if (missing.length) {
    throw new Error(`[production migration] Refusing bootstrap or migration into a non-empty, incomplete base schema. Missing tables: ${missing.join(', ')}`);
  }
  return 'migrate';
}

export function requireMigrationSecret(secret) {
  if (!secret || secret.length < 32 || secret === 'contact-shield-development-secret-change-me' || /change[_-]?me/i.test(secret)) {
    throw new Error('[production migration] Set the same unique CONTACT_SHIELD_SECRET (at least 32 characters) used by the API before migrating');
  }
}
