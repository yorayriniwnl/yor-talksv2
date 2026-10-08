import { assertReadiness } from './check-readiness.mjs';

const baseUrl = (process.env.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const syntheticProviders = process.env.SMOKE_SYNTHETIC_PROVIDERS === 'true';
if (syntheticProviders && (process.env.CI !== 'true' || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseUrl).hostname))) {
  throw new Error('Synthetic provider smoke is restricted to isolated loopback CI');
}

async function check(path, init, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (response.status !== expectedStatus) {
    const body = await response.text().catch(() => "");
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}: ${body.slice(0, 240)}`);
  }
  return response;
}

async function log(category, message) {
  console.log(`[${category}] ${message}`);
}

try {
  await log("SMOKE", syntheticProviders ? 'Starting isolated synthetic container smoke...' : 'Starting deployment smoke with required core media readiness...');

  // Web shell checks
  await log("WEB", "Checking web shell...");
  const web = await check("/", undefined, 200);
  const webHtml = await web.text();
  if (!webHtml.includes("<div id=\"root\">") && !webHtml.includes("<div id='root'>")) {
    throw new Error("/ does not look like the built Yor web shell");
  }
  await log("WEB", "Web shell structure is valid");

  // Security headers
  await log("SECURITY", "Verifying security headers...");
  const requiredHeaders = ["x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy", "content-security-policy"];
  const missingHeaders = requiredHeaders.filter((header) => !web.headers.get(header));
  if (missingHeaders.length > 0) {
    throw new Error(`/ is missing security headers: ${missingHeaders.join(", ")}`);
  }
  await log("SECURITY", "All required security headers present");

  // Asset bundle checks
  await log("ASSETS", "Verifying built asset bundle...");
  const referencedAssets = [...webHtml.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map((match) => match[1]);
  if (referencedAssets.length === 0) throw new Error("/ does not reference a built asset bundle");
  const uniqueAssets = new Set(referencedAssets);
  for (const assetPath of uniqueAssets) {
    await check(assetPath, undefined, 200);
  }
  await log("ASSETS", `Verified ${uniqueAssets.size} asset(s) are accessible`);

  // Service Worker
  await log("SW", "Verifying service worker...");
  const serviceWorker = await check("/sw.js", undefined, 200);
  const serviceWorkerCache = serviceWorker.headers.get("cache-control") || "";
  if (!/no-cache/i.test(serviceWorkerCache) || !/no-store/i.test(serviceWorkerCache)) {
    throw new Error("/sw.js must be served with no-cache and no-store headers");
  }
  await log("SW", "Service worker cache policy is correct");

  // API readiness and dependency checks
  await log("API-HEALTH", "Checking API readiness endpoint...");
  const readiness = await check("/api/readyz", undefined, 200);
  const readinessBody = await readiness.json();
  assertReadiness(readinessBody, { syntheticProviders });
  
  if (readinessBody.status !== "healthy") {
    throw new Error(`API readiness status is not 'healthy': ${readinessBody.status}`);
  }
  if (readinessBody.services?.database !== "up") {
    throw new Error(`Database is not healthy: ${readinessBody.services?.database || "unknown"}`);
  }
  if (readinessBody.services?.redis !== "up") {
    throw new Error(`Redis is not healthy: ${readinessBody.services?.redis || "unknown"}`);
  }
  await log("API-HEALTH", "✓ API healthy");
  await log("DATABASE", `✓ PostgreSQL connected and responding`);
  await log("CACHE", `✓ Redis connected and responding`);

  // API routing and endpoint tests
  await log("API-ROUTES", "Testing API endpoint availability...");
  const authResponse = await check("/api/auth/refresh", 
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 
    401
  );
  await log("API-ROUTES", "✓ Auth endpoints are accessible");

  const reportsResponse = await check("/api/reports", 
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, 
    401
  );
  await log("API-ROUTES", "✓ Reports endpoints are accessible");

  const grievanceResponse = await check("/api/reports/grievance", 
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, 
    400
  );
  await log("API-ROUTES", "✓ Grievance endpoints are accessible");

  // Uptime check
  const uptimeMatch = readinessBody.uptime ? `${Math.round(readinessBody.uptime)}s` : "unknown";
  await log("UPTIME", `API has been running for ${uptimeMatch}`);

  await log("SMOKE", `Deployment smoke passed for ${baseUrl}; provider journeys and operational acceptance remain separate`);
  process.exit(0);
} catch (error) {
  await log("ERROR", `❌ Production readiness check failed: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
