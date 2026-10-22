// Uses a real dump and complete migrated application schema. Requires explicit
// loopback RECOVERY_TEST_ADMIN_URL, RECOVERY_TEST_SCHEMA_URL and PostgreSQL tools.
// Encrypted off-host transport has its separate ops/backup/ci-roundtrip-smoke.sh drill.
import '../ops/backup/privacy-recovery-database.test.mjs';
