import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const envSource = read("api-server/src/config/env.ts");
const apiAppSource = read("api-server/src/app.ts");
const composeSource = read("docker-compose.production.yml");
const caddySource = read("ops/Caddyfile.example");
const productionExample = read("ops/.env.production.example");
const ciFixture = read("ops/ci-production.env");
const prometheusConfig = read("ops/prometheus/prometheus.yml");
const alertRules = read("ops/prometheus/alerts.yml");
const alertmanagerConfig = read("ops/prometheus/alertmanager.yml");
const nginxSecurityTemplate = read("social/security-headers.conf");
const webDockerfile = read("social/Dockerfile");
const dockerIgnore = read(".dockerignore").split(/\r?\n/).map((line) => line.trim());

function composeService(name) {
  return composeSource.match(new RegExp(`^  ${name}:\\r?\\n([\\s\\S]*?)(?=^  [a-zA-Z][a-zA-Z0-9_-]*:|^[a-zA-Z]|$(?![\\s\\S]))`, 'm'))?.[1];
}

const schemaKeys = [...envSource.matchAll(/^\s{2}([A-Z][A-Z0-9_]*)\s*:\s*z\./gm)].map((match) => match[1]);
const migrateSection = composeService('migrate');
const apiSection = composeService('api');
const webSection = composeService('web');
const apiEnvironment = apiSection?.match(/\r?\n    environment:\r?\n([\s\S]*?)(?=\r?\n    (?:expose|networks|depends_on|healthcheck|restart):)/)?.[1];
const apiKeys = [...(apiEnvironment ?? "").matchAll(/^\s{6}([A-Z][A-Z0-9_]*)\s*:/gm)].map((match) => match[1]);
const webBuildArgs = webSection?.match(/\r?\n      args:\r?\n([\s\S]*?)(?=\r?\n    ports:)/)?.[1] ?? "";
const webKeys = [...webBuildArgs.matchAll(/^\s{8}(VITE_[A-Z0-9_]*)\s*:/gm)].map((match) => match[1]);
const requiredComposeKeys = [...composeSource.matchAll(/\$\{([A-Z][A-Z0-9_]*):\?/g)].map((match) => match[1]);

function envFileKeys(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/)?.[1])
    .filter(Boolean);
}

function envFileValue(source, key) {
  return source.split(/\r?\n/).map((line) => line.match(new RegExp(`^\\s*${key}\\s*=(.*)$`))?.[1]?.trim())
    .find((value) => value !== undefined);
}

const exampleKeys = new Set(envFileKeys(productionExample));
const fixtureKeys = new Set(envFileKeys(ciFixture));
const missingApiKeys = schemaKeys.filter((key) => !apiKeys.includes(key));
const missingExampleKeys = [...new Set(requiredComposeKeys)].filter((key) => !exampleKeys.has(key));
const missingFixtureKeys = [...new Set(requiredComposeKeys)].filter((key) => !fixtureKeys.has(key));

const failures = [];
for (const [service, source] of [['migrate', migrateSection], ['backup', composeService('backup')]]) {
  if (!source?.includes('DATABASE_URL: ${DATABASE_MIGRATION_URL:?')) failures.push(`Production ${service} must use the isolated migration/backup database owner`);
}
if (!migrateSection?.includes('APP_DATABASE_URL: ${DATABASE_URL:?')
  || !migrateSection?.includes('APP_DB_USER: ${APP_DB_USER:?')
  || !migrateSection?.includes('APP_DB_PASSWORD: ${APP_DB_PASSWORD:?')) {
  failures.push('Production migration must provision and validate a distinct runtime role');
}
if (/DATABASE_MIGRATION_URL|APP_DB_PASSWORD|APP_DATABASE_URL|APP_DB_USER/.test(apiSection ?? '')) {
  failures.push('Production API must not receive migration/backup credentials or role provisioning controls');
}
for (const service of ['postgres', 'redis']) {
  if (!/^    restart: unless-stopped\s*$/m.test(composeService(service) ?? '')) {
    failures.push(`Production ${service} must restart after a host or Docker restart`);
  }
}
for (const service of ['api', 'prometheus', 'alertmanager']) {
  if (!/^    group_add:\r?\n      - "\$\{SECRET_READER_GID:\?[^\r\n]+\}"\s*$/m.test(composeService(service) ?? '')) {
    failures.push(`Production ${service} must receive the dedicated host secret-reader GID for file-backed secrets`);
  }
}
const readerServices = [...composeSource.matchAll(/^  ([a-zA-Z][a-zA-Z0-9_-]*):\r?\n/gm)]
  .map((match) => match[1])
  .filter((service) => /SECRET_READER_GID/.test(composeService(service) ?? ''));
if (readerServices.sort().join(',') !== 'alertmanager,api,prometheus') {
  failures.push('Only API, Prometheus and Alertmanager may receive the dedicated secret-reader GID');
}
if (!/^SECRET_READER_GID=[1-9]\d*\s*$/m.test(ciFixture)) {
  failures.push('CI must supply a non-root numeric SECRET_READER_GID');
}
const rendererSection = composeService('alertmanager-config');
for (const control of ['user: "0:0"', 'network_mode: none', 'read_only: true',
  'cap_drop: ["ALL"]', 'cap_add: ["DAC_OVERRIDE"]', 'no-new-privileges:true']) {
  if (!rendererSection?.includes(control)) failures.push(`Alertmanager renderer must retain confined one-shot permissions: ${control}`);
}
if (/^    (?:secrets|group_add):/m.test(rendererSection ?? '')) {
  failures.push('The Alertmanager renderer must not receive secrets or the secret-reader group');
}
if (!dockerIgnore.includes('**/.env*')) failures.push('Docker build context must exclude every .env variant, including production credentials');
if (!/^FROM node:24-alpine$/m.test(read("api-server/Dockerfile"))) {
  failures.push("API container must use the supported Node 24 LTS runtime");
}
if (!/^FROM node:24-slim AS build$/m.test(read("social/Dockerfile"))) {
  failures.push("Web build stage must use the supported Node 24 Debian toolchain for GNU native packages");
}
if (!/^FROM nginx:1\.30-alpine$/m.test(read('social/Dockerfile'))) failures.push('Web container must use the maintained Nginx stable release');
if (!apiAppSource.includes('app.set("trust proxy", 1)')) {
  failures.push("API proxy trust must remain limited to one configured reverse-proxy hop");
}
const apiDockerfile = read("api-server/Dockerfile");
if (!/^USER node$/m.test(apiDockerfile)) failures.push("API image must run as the unprivileged node user");
for (const hardening of ["read_only: true", "/tmp:size=64m,noexec,nosuid,nodev", 'cap_drop: ["ALL"]', "no-new-privileges:true"]) {
  if (!migrateSection?.includes(hardening)) failures.push(`Production migration service must retain container hardening: ${hardening}`);
}
for (const hardening of [
  "read_only: true",
  "/tmp:size=128m,noexec,nosuid,nodev",
  'cap_drop: ["ALL"]',
  "no-new-privileges:true",
]) {
  if (!apiSection?.includes(hardening)) failures.push(`Production API must retain container hardening: ${hardening}`);
}
if (!caddySource.includes("@api path /api /api/* /socket.io /socket.io/*")
  || !/handle @api\s*\{\s*reverse_proxy 127\.0\.0\.1:4000\s*\}/m.test(caddySource)
  || !/handle\s*\{\s*reverse_proxy 127\.0\.0\.1:8080\s*\}/m.test(caddySource)) {
  failures.push("Caddy must route API and Socket.IO traffic directly to the API and frontend assets to Nginx, preserving one trusted proxy hop");
}
if ((caddySource.match(/header Strict-Transport-Security "max-age=31536000"/g) ?? []).length !== 2) {
  failures.push('Both HTTPS Caddy origins must enforce HSTS without assuming every sibling subdomain is TLS-enabled');
}
if (!apiSection || !apiEnvironment) failures.push("Could not locate the production API environment block");
if (!apiSection?.includes('"127.0.0.1:${API_HOST_PORT:-4000}:4000"')) {
  failures.push("Production API host binding must be fixed to loopback so the TLS proxy is the only public edge");
}
if (!webSection) failures.push("Could not locate the production web build arguments");
if (!webSection?.includes('"127.0.0.1:${WEB_PORT:-8080}:80"')) {
  failures.push("Production web host binding must be fixed to loopback so the TLS proxy is the only public edge");
}
for (const hardening of [
  "read_only: true",
  "/var/cache/nginx:size=64m,noexec,nosuid,nodev",
  "/var/run:size=1m,noexec,nosuid,nodev",
  'cap_drop: ["ALL"]',
  'cap_add: ["NET_BIND_SERVICE", "CHOWN", "SETUID", "SETGID"]',
  "no-new-privileges:true",
]) {
  if (!webSection?.includes(hardening)) failures.push(`Production web service must retain container hardening: ${hardening}`);
}
if (!/^\s*WEB_PORT=\d+\s*$/m.test(productionExample)) {
  failures.push("Production env example must provide only the loopback web port number");
}
if (missingApiKeys.length) failures.push(`Production API does not pass env schema keys: ${missingApiKeys.join(", ")}`);
if (missingExampleKeys.length) failures.push(`Production env example omits required Compose keys: ${missingExampleKeys.join(", ")}`);
if (missingFixtureKeys.length) failures.push(`CI production fixture omits required Compose keys: ${missingFixtureKeys.join(", ")}`);
for (const [label, source] of [['production example', productionExample], ['CI fixture', ciFixture]]) {
  if (envFileValue(source, 'CLIENT_ORIGIN') !== envFileValue(source, 'VITE_PUBLIC_ORIGIN')) {
    failures.push(`${label} must keep VITE_PUBLIC_ORIGIN identical to CLIENT_ORIGIN`);
  }
}
if (envFileValue(productionExample, 'LEGAL_CONTENT_REVIEWED') !== 'false') {
  failures.push('Production example must keep legal content review disabled until the operator approves the exact policies');
}
if (envFileValue(ciFixture, 'LEGAL_CONTENT_REVIEWED') !== 'true') {
  failures.push('CI may enable the public-beta gate only with its explicitly synthetic policy fixture');
}
for (const key of ['TERMS_VERSION', 'VITE_TERMS_VERSION', 'LEGAL_EFFECTIVE_DATE', 'VITE_LEGAL_EFFECTIVE_DATE']) {
  if (!envFileValue(productionExample, key)?.toLowerCase().includes('change_me')) {
    failures.push(`Production example must not provide an unreviewed policy value for ${key}`);
  }
}
if (!apiSection?.includes('LEGAL_CONTENT_REVIEWED: ${LEGAL_CONTENT_REVIEWED:-false}')) {
  failures.push('API public beta must receive the fail-closed legal review setting');
}
for (const service of ["backup:", "backup-metrics-exporter:", "prometheus:", "alertmanager:"]) {
  if (!composeSource.includes(`\n  ${service}`)) failures.push(`Production Compose is missing the ${service.slice(0, -1)} service`);
}
for (const key of [
  "VITE_PUBLIC_ORIGIN",
  "VITE_LEGAL_CONTENT_REVIEWED",
  "VITE_PAYMENTS_ENABLED",
  "VITE_LIVE_ROOMS_ENABLED",
  "VITE_WEB_PUSH_ENABLED",
  "VITE_WEB_PUSH_VAPID_PUBLIC_KEY",
  "VITE_RTC_CALLS_ENABLED",
  "VITE_RTC_ICE_SERVERS",
  "VITE_REALTIME_URL",
  "VITE_REALTIME_ENABLED",
]) {
  if (!webKeys.includes(key)) failures.push(`Production web build is missing ${key}`);
}
for (const key of webKeys) {
  if (!new RegExp(`^ARG ${key}(?:=|$)`, 'm').test(webDockerfile)
    || !new RegExp(`^ENV ${key}=\\$${key}$`, 'm').test(webDockerfile)) {
    failures.push(`Production web Dockerfile must declare and expose the ${key} build argument`);
  }
}
if (!webBuildArgs.includes('VITE_PUBLIC_ORIGIN: ${VITE_PUBLIC_ORIGIN:?')) {
  failures.push('Production web build must require the public HTTPS origin for share-preview metadata');
}
if (!webBuildArgs.includes('VITE_LEGAL_CONTENT_REVIEWED: ${LEGAL_CONTENT_REVIEWED:-false}')) {
  failures.push('Production web build must receive the API legal review gate and fail closed by default');
}
if (!webBuildArgs.includes('CSP_LIVEKIT_URL: ${LIVEKIT_URL:-}')) {
  failures.push('The web image CSP must receive the configured LiveKit origin when calls or live rooms are enabled');
}
if (!nginxSecurityTemplate.includes("connect-src 'self' __CSP_CONNECT_ORIGINS__")
  || /connect-src[^;]*\s(?:https?|wss?):\s/.test(nginxSecurityTemplate)) {
  failures.push('Nginx CSP must use the explicit-origin template and must not allow every HTTPS or WebSocket host');
}
if (!webDockerfile.includes('node ./social/scripts/render-nginx-config.mjs')
  || !webDockerfile.includes('/app/social/dist/security-headers.conf /etc/nginx/snippets/security-headers.conf')) {
  failures.push('The production web image must render and install the configured security-header policy');
}
const frontendProviderWires = [
  ["VITE_PAYMENTS_ENABLED", "PAYMENTS_ENABLED"],
  ["VITE_LIVE_ROOMS_ENABLED", "LIVE_ROOMS_ENABLED"],
  ["VITE_WEB_PUSH_ENABLED", "WEB_PUSH_ENABLED"],
  ["VITE_WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PUBLIC_KEY"],
  ["VITE_RTC_CALLS_ENABLED", "RTC_CALLS_ENABLED"],
];
for (const [frontendKey, backendKey] of frontendProviderWires) {
  if (!webBuildArgs.includes(`${frontendKey}: \${${backendKey}`)) {
    failures.push(`${frontendKey} must be derived from the backend ${backendKey} setting`);
  }
}
for (const metric of ["/api/metrics", "metrics_bearer_token", "backup-metrics-exporter:9100"]) {
  if (!prometheusConfig.includes(metric)) failures.push(`Prometheus scrape configuration is missing ${metric}`);
}
for (const alert of ["YorBackgroundJobsFailing", "YorAnalyticsRollupStale", "YorDatabaseBackupStale"]) {
  if (!alertRules.includes(`alert: ${alert}`)) failures.push(`Prometheus alert rules are missing ${alert}`);
}
for (const file of ["ops/ci-metrics-bearer-token", "ops/ci-rclone.conf", "ops/ci-alertmanager-password"]) {
  if (!dockerIgnore.includes(file)) failures.push(`Docker build context must exclude the CI-only fixture ${file}`);
}
if (!alertmanagerConfig.includes("password_file: /run/secrets/alertmanager_webhook_password")) {
  failures.push("Alertmanager webhook authentication must use the mounted password secret, not credentials in the URL");
}

if (failures.length) {
  console.error("[production config] FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[production config] API env wiring covers ${schemaKeys.length} schema keys; Compose requirements are present in the production example and CI fixture.`);
}
