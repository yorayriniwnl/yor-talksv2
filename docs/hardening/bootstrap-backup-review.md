# Bootstrap and backup guard review

Reviewed the 8 October 2026 working copy independently of the root release checks. This is source-review and isolated PostgreSQL evidence; it does not claim a deployed backup, production off-host recovery, or a local Docker image run.

## Findings fixed

The bootstrap and restore guards previously counted only relations. A function-only or enum-only database could be accepted as empty, and restore could merge an archive into an existing empty custom schema. The reviewed `lib/db/scripts/schema-object-inspection.sql` now checks user schemas, relation kinds, routines, types, public extensions, operators, collations, conversions, text-search objects, event triggers and large-object metadata. PostgreSQL built-in objects and system-extension members do not block a fresh database. A user-created function in `pg_catalog` does block it; the system namespace alone is not an exemption. Public extension-owned routines/types are not exempted.

Both migration CLIs and the transactional bootstrap helper use this inspection. The shell restore script loads the same adjacent SQL and refuses a missing inspection file. Its `psql` calls use `ON_ERROR_STOP=1`, so an inspection SQL failure cannot become a zero-row success through the counting pipeline. The backup image copies the SQL alongside the script. The help example includes the required explicit `RESTORE_TARGET_DATABASE=restore_db` identity.

The acceptance drill now removes both its own `drill_extra` table and schema before the deliberately unauthorized restore. It checks refusal and preservation of public/system-schema function-only, type-only, empty custom-schema and public-extension targets. Its permission-failure assertion still requires a `pg_restore` permission error and no partial application tables, rather than accepting an earlier guard failure as proof of transactional rollback.

The drill also tracks every auxiliary PostgreSQL client and closes all connections in its global `finally`. An unexpected command/assertion failure while a fixture connection is open can therefore report failure promptly, rather than keeping Node alive until CI times out. This change does not delete the retained drill databases or evidence.

## Verification and limits

The final `bootstrap-schema.integration.test.ts` run completed with **5 passed, 0 failed, 0 skipped**, exit 0, against PostgreSQL 16.4 at verified loopback port 55447. It invokes the production migration CLI with explicit private database URLs; it covers reviewed fresh SQL, all current additive migration ledgers, repeat history preservation, representative legacy upgrade, strict-empty refusal/object preservation, and a real SQL failure rolling back all base DDL before retry. The test drops only its own randomly named private databases. Output is retained at `C:/Users/yoray/AppData/Local/Temp/yor-hardening-message-20261008/bootstrap-empty-guards.log`.

The first expanded run failed because the two CLI inspectors returned their query promise while `finally` was closing the connection. Both now await the inspection; the final run above passed. Node syntax checks for the helper/acceptance source and the scoped `git diff --check` passed.

CI wiring was reviewed: the backup image runs its bundled Bash/age/rclone/PostgreSQL tools with the temporary fixture directory mounted, forwards the explicit identity and encryption variables, and uses host networking to reach the disposable CI database. It is built before the Docker drill. The runtime backup service has staging/metrics volumes and an rclone secret mounted at the root user's expected path; metrics are published with mode 0644 for the read-only exporter. The image runs as root, which can read the CI runner's private temporary fixture directory and the Compose secret mount. The native rerun and container CI result belong to the [root acceptance evidence](monitoring-backup.md); source inspection alone does not establish either runtime result.

The drill labels its rclone transport as isolated local transport and explicitly reports production off-host acceptance as unexercised. The production smoke requires a healthy core, a real decoder and unavailable synthetic media providers; the separate provider gate remains required. The monitoring renderer/runtime acceptance and strict smoke source were also reviewed; no additional concrete failure was identified in their final wiring.

## Retained synthetic artifacts

The acceptance drill intentionally retains its generated source/target/failed databases, synthetic restore login role, encrypted staging/retrieval files and command logs. Its final report lists the exact database and role names plus evidence directory. This review did not delete earlier artifacts. Local infrastructure is a private temporary PostgreSQL cluster that will be stopped after the release checks; the CI cluster is disposable. Retention is evidence preservation, not cleanup proof.

A read-only snapshot during this review found `yor_backup_acceptance_{source,target,failed}_<suffix>` databases for suffixes `0bb1ae5f208a`, `0f0b5958c273`, `4caa28e3d43a`, `76683b8b56f2`, `e760ac43968f` and `fa47540a1138`, and `backup_restore_<suffix>` roles for `0f0b5958c273`, `4caa28e3d43a` and `76683b8b56f2`. Later drill runs can add further artifacts; use their final reports for exact names. No production artifact or account is involved.
