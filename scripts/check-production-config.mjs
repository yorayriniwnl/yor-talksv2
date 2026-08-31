import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const envSource = read("api-server/src/config/env.ts");
const composeSource = read("docker-compose.production.yml");
const productionExample = read("ops/.env.production.example");
const ciFixture = read("ops/ci-production.env");
const dockerIgnore = read(".dockerignore").split(/\r?\n/).map((line) => line.trim());

const schemaKeys = [...envSource.matchAll(/^\s{2}([A-Z][A-Z0-9_]*)\s*:\s*z\./gm)].map((match) => match[1]);
const apiSection = composeSource.match(/\n  api:\r?\n([\s\S]*?)(?=\r?\n  web:\r?\n)/)?.[1];
const apiEnvironment = apiSection?.match(/\r?\n    environment:\r?\n([\s\S]*?)(?=\r?\n    (?:expose|networks|depends_on|healthcheck|restart):)/)?.[1];
const apiKeys = [...(apiEnvironment ?? "").matchAll(/^\s{6}([A-Z][A-Z0-9_]*)\s*:/gm)].map((match) => match[1]);
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
for (const dockerfile of ['api-server/Dockerfile', 'social/Dockerfile']) {
  if (!/^FROM node:24-alpine(?: AS \w+)?$/m.test(read(dockerfile))) failures.push(`${dockerfile} must use the supported Node 24 LTS runtime`);
}
if (!/^FROM nginx:1\.30-alpine$/m.test(read('social/Dockerfile'))) failures.push('Web container must use the maintained Nginx stable release');
if (!apiSection || !apiEnvironment) failures.push("Could not locate the production API environment block");
if (missingApiKeys.length) failures.push(`Production API does not pass env schema keys: ${missingApiKeys.join(", ")}`);
if (missingExampleKeys.length) failures.push(`Production env example omits required Compose keys: ${missingExampleKeys.join(", ")}`);
if (missingFixtureKeys.length) failures.push(`CI production fixture omits required Compose keys: ${missingFixtureKeys.join(", ")}`);

if (failures.length) {
  console.error("[production config] FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[production config] API env wiring covers ${schemaKeys.length} schema keys; Compose requirements are present in the production example and CI fixture.`);
}
