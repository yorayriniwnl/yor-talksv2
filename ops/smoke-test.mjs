const baseUrl = (process.env.BASE_URL || "http://localhost:8080").replace(/\/$/, "");

async function check(path, init, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (response.status !== expectedStatus) {
    const body = await response.text().catch(() => "");
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}: ${body.slice(0, 240)}`);
  }
  return response;
}

const web = await check("/", undefined, 200);
const webHtml = await web.text();
if (!webHtml.includes("<div id=\"root\">") && !webHtml.includes("<div id='root'>")) {
  throw new Error("/ does not look like the built Yor web shell");
}
for (const header of ["x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy", "content-security-policy"]) {
  if (!web.headers.get(header)) {
    throw new Error(`/ is missing the ${header} security header`);
  }
}

const referencedAssets = [...webHtml.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map((match) => match[1]);
if (referencedAssets.length === 0) throw new Error("/ does not reference a built asset bundle");
for (const assetPath of new Set(referencedAssets)) {
  await check(assetPath, undefined, 200);
}
const serviceWorker = await check("/sw.js", undefined, 200);
const serviceWorkerCache = serviceWorker.headers.get("cache-control") || "";
if (!/no-cache/i.test(serviceWorkerCache) || !/no-store/i.test(serviceWorkerCache)) {
  throw new Error("/sw.js must be served with no-cache and no-store headers");
}

const readiness = await check("/api/readyz", undefined, 200);
const readinessBody = await readiness.json();
if (readinessBody.status !== "healthy" || readinessBody.services?.database !== "up" || readinessBody.services?.redis !== "up") {
  throw new Error(`readiness endpoint did not report healthy dependencies: ${JSON.stringify(readinessBody)}`);
}

await check("/api/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 401);
await check("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, 401);
await check("/api/reports/grievance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, 400);

console.log(`Smoke checks passed for ${baseUrl}`);
