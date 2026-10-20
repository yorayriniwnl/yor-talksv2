import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const envSource = read("api-server/src/config/env.ts");
const composeSource = read("docker-compose.production.yml");
const productionExample = read("ops/.env.production.example");
const ciFixture = read("ops/ci-production.env");
const prometheusConfig = read("ops/prometheus/prometheus.yml");
const alertRules = read("ops/prometheus/alerts.yml");
const alertmanagerConfig = read("ops/prometheus/alertmanager.yml");
const alertmanagerRenderer = read("ops/prometheus/render-alertmanager-config.sh");
const dockerIgnore = read(".dockerignore").split(/\r?\n/).map((line) => line.trim());

const schemaKeys = [...envSource.matchAll(/^\s{2}([A-Z][A-Z0-9_]*)\s*:\s*z\./gm)].map((match) => match[1]);
const apiSection = composeSource.match(/\n  api:\r?\n([\s\S]*?)(?=\r?\n  web:\r?\n)/)?.[1];
const webSection = composeSource.match(/\n  web:\r?\n([\s\S]*?)(?=\r?\nnetworks:\r?\n)/)?.[1];
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

const exampleKeys = new Set(envFileKeys(productionExample));
const fixtureKeys = new Set(envFileKeys(ciFixture));
const missingApiKeys = schemaKeys.filter((key) => !apiKeys.includes(key));
const missingExampleKeys = [...new Set(requiredComposeKeys)].filter((key) => !exampleKeys.has(key));
const missingFixtureKeys = [...new Set(requiredComposeKeys)].filter((key) => !fixtureKeys.has(key));

const failures = [];
if (!dockerIgnore.includes('**/.env*')) failures.push('Docker build context must exclude every .env variant, including production credentials');
if (!/^FROM node:24-alpine$/m.test(read('api-server/Dockerfile'))) {
  failures.push('API container must use the supported Node 24 Alpine runtime');
}
if (!/^FROM node:24-slim AS build$/m.test(read('social/Dockerfile'))) {
  failures.push('Web build container must use Node 24 Debian with the supported glibc Rollup binary');
}
if (!/^FROM nginx:1\.30-alpine$/m.test(read('social/Dockerfile'))) failures.push('Web container must use the maintained Nginx stable release');
if (!apiSection || !apiEnvironment) failures.push("Could not locate the production API environment block");
if (!webSection) failures.push("Could not locate the production web build arguments");
if (missingApiKeys.length) failures.push(`Production API does not pass env schema keys: ${missingApiKeys.join(", ")}`);
if (missingExampleKeys.length) failures.push(`Production env example omits required Compose keys: ${missingExampleKeys.join(", ")}`);
if (missingFixtureKeys.length) failures.push(`CI production fixture omits required Compose keys: ${missingFixtureKeys.join(", ")}`);
for (const service of ["backup:", "backup-metrics-exporter:", "prometheus:", "alertmanager:"]) {
  if (!composeSource.includes(`\n  ${service}`)) failures.push(`Production Compose is missing the ${service.slice(0, -1)} service`);
}
for (const key of [
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
if (composeSource.includes("--config.expand-env")) {
  failures.push("Pinned Alertmanager does not support --config.expand-env; use the rendered secret-aware configuration");
}
if (!composeSource.includes('entrypoint: ["/bin/sh", "/usr/local/bin/render-alertmanager-config.sh"]')) {
  failures.push("Alertmanager must render its secret-aware configuration before startup");
}
if (!alertmanagerRenderer.includes("--config.file=/run/alertmanager/alertmanager.yml")) {
  failures.push("Alertmanager must start with the rendered configuration file");
}
const quoteYamlParameters = alertmanagerRenderer.match(/function quote_yaml\(([^)]*)\)/)?.[1]
  .split(",")
  .map((parameter) => parameter.trim());
if (!quoteYamlParameters || quoteYamlParameters.includes("index")) {
  failures.push("Alertmanager renderer must not shadow awk's built-in index function");
}

// Keep the Vercel frontend/API build contract aligned with the working release.
// These are repository-only checks; production secrets stay in Vercel.
const rootPackage = JSON.parse(read("package.json"));
const socialPackage = JSON.parse(read("social/package.json"));
const vercelConfig = JSON.parse(read("vercel.json"));
if (rootPackage.packageManager !== "pnpm@11.28.5") {
  failures.push("The Vercel build requires the reviewed pnpm@11.28.5 lockfile toolchain");
}
if (rootPackage.scripts?.build !== "node ./build.mjs") {
  failures.push("The root build script must invoke the monorepo release builder");
}
if (socialPackage.scripts?.build !== "vite build --config vite.config.ts") {
  failures.push("The web build must use the explicit Vite configuration");
}
if (vercelConfig.framework !== null) {
  failures.push("Vercel must not autodetect the Express backend as the frontend framework");
}
if (vercelConfig.installCommand !== "pnpm install --frozen-lockfile") {
  failures.push("Vercel must install dependencies using the pinned frozen pnpm lockfile");
}
if (vercelConfig.buildCommand !== rootPackage.scripts?.build) {
  failures.push("Vercel must run the same root release build used in CI");
}
if (vercelConfig.outputDirectory !== "social/dist/public") {
  failures.push("Vercel must serve the generated public frontend, not unbuilt source");
}
if (!vercelConfig.functions?.["api/index.ts"]?.maxDuration) {
  failures.push("Vercel must declare the bundled Node API function configuration");
}
const rewrites = vercelConfig.rewrites ?? [];
const apiRewrites = ["/api", "/api/(.*)"];
for (const source of apiRewrites) {
  if (!rewrites.some((rule) => rule.source === source && rule.destination === "/api/index.ts")) {
    failures.push(`Vercel must route ${source} requests to the API handler before SPA fallback`);
  }
}
const spaIndex = rewrites.findIndex((rule) => rule.source === "/(.*)" && rule.destination === "/index.html");
if (spaIndex < 0 || apiRewrites.some((source) => rewrites.findIndex((rule) => rule.source === source) > spaIndex)) {
  failures.push("Vercel API routes must precede the frontend SPA fallback rewrite");
}

if (failures.length) {
  console.error("[production config] FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[production config] API env wiring covers ${schemaKeys.length} schema keys; Compose requirements are present in the production example and CI fixture.`);
}
