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
for (const header of ["x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"]) {
  if (!web.headers.get(header)) {
    throw new Error(`/ is missing the ${header} security header`);
  }
}

const health = await check("/api/healthz", undefined, 200);
const healthBody = await health.json();
if (healthBody.status !== "healthy") {
  throw new Error(`health endpoint did not report healthy: ${JSON.stringify(healthBody)}`);
}

await check("/api/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, 401);
await check("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, 401);
await check("/api/reports/grievance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, 400);

console.log(`Smoke checks passed for ${baseUrl}`);
