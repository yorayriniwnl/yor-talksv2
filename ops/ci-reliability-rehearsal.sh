#!/usr/bin/env bash
set -euo pipefail
# Run after the isolated production stack starts. Every target is fixed to its
# synthetic Compose project; nothing accepts production database/provider URLs.
compose=(docker compose --project-name yor-talks-ci-release --env-file ops/ci-production.env -f docker-compose.production.yml -f ops/ci-provider-isolation.compose.yml -f ops/ci-reliability.compose.yml)

for service in alertmanager prometheus ci-alert-receiver ci-restore-postgres; do
  id=$("${compose[@]}" ps --quiet "$service")
  test -n "$id"
  timeout 90 sh -c 'until [ "$(docker inspect --format "{{.State.Health.Status}}" "$1")" = healthy ]; do sleep 2; done' -- "$id"
done
"${compose[@]}" exec -T ci-alert-receiver node /app/ci-alert-probe.mjs

# A Redis outage must reject readiness immediately; restarting the synthetic
# service must restore queue readiness without discarding durable work/data.
"${compose[@]}" exec -T postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-psqlrc --set=ON_ERROR_STOP=1' >/dev/null <<'SQL'
INSERT INTO background_jobs(id,kind,dedup_key,payload)
VALUES('00000000-0000-4000-8000-000000000042','ci_recovery_probe','ci:reliability:recovery','{"synthetic":true}');
SQL
"${compose[@]}" exec -T redis sh -c 'redis-cli --no-auth-warning -a "$REDIS_PASSWORD" SET yor:ci:reliability retained' >/dev/null
"${compose[@]}" stop redis >/dev/null
timeout 30 sh -c 'until [ "$(curl --silent --output /dev/null --write-out "%{http_code}" http://127.0.0.1:18080/api/readyz)" = 503 ]; do sleep 1; done'
"${compose[@]}" start redis >/dev/null
timeout 150 sh -c 'until curl --fail --silent --show-error http://127.0.0.1:18080/api/readyz >/dev/null; do sleep 2; done'
"${compose[@]}" exec -T redis sh -c 'redis-cli --no-auth-warning -a "$REDIS_PASSWORD" GET yor:ci:reliability' | grep -qx retained
"${compose[@]}" exec -T postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-psqlrc -Atq' <<'SQL' | grep -qx 'pending|0'
SELECT status || '|' || attempts FROM background_jobs WHERE dedup_key='ci:reliability:recovery';
SQL
echo '[reliability] Redis outage rejected readiness; queue/worker readiness recovered after restart and durable state survived'

# Seed a known source row, generate a temporary encryption identity privately,
# encrypt/upload with the real backup image, retrieve it from the other volume,
# verify/decrypt, and restore into the fresh isolated PostgreSQL service.
"${compose[@]}" exec -T postgres sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-psqlrc --set=ON_ERROR_STOP=1' >/dev/null <<'SQL'
CREATE TABLE ci_backup_probe(id integer PRIMARY KEY, value text NOT NULL);
INSERT INTO ci_backup_probe VALUES(1,'synthetic-encrypted-round-trip');
SQL
"${compose[@]}" run --rm --no-deps -T --entrypoint /bin/bash backup /app/ci-backup-rehearsal.sh
"${compose[@]}" exec -T ci-restore-postgres psql -U restore -d yor_ci_restore --no-psqlrc --set=ON_ERROR_STOP=1 -Atqc "SELECT value FROM ci_backup_probe WHERE id=1" | grep -qx synthetic-encrypted-round-trip
echo '[reliability] Encrypted archive retrieval/restore passed; upload failure retained recovery evidence; corrupt and nonempty-target restores rejected'
