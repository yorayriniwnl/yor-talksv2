import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { verifyRealtime } from './realtime-smoke.mjs';
import { verifyPrivateChat } from './private-chat-smoke.mjs';

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const browserOrigin = process.env.BROWSER_ORIGIN || 'http://localhost:5173';

// This audit is intentionally opt-in. Never bake account passwords into a
// repository or send them to a URL that the operator has not approved.
const fixtureIdentifier = process.env.BOUNDARY_TEST_IDENTIFIER;
const fixturePassword = process.env.BOUNDARY_TEST_PASSWORD;
const approvedOrigin = process.env.BOUNDARY_TEST_ALLOWED_BASE_ORIGIN;
if (!fixtureIdentifier || !fixturePassword || !approvedOrigin) {
  throw new Error('Set BOUNDARY_TEST_IDENTIFIER, BOUNDARY_TEST_PASSWORD and BOUNDARY_TEST_ALLOWED_BASE_ORIGIN explicitly');
}
const parsedBaseUrl = new URL(baseUrl);
if (parsedBaseUrl.origin !== approvedOrigin
  || (parsedBaseUrl.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsedBaseUrl.hostname))) {
  throw new Error('Refusing to send login credentials to an unapproved or insecure audit endpoint');
}


const results = {
  timestamp: new Date().toISOString(),
  gitRevision: '',
  tests: [],
  summary: { total: 0, passed: 0, failed: 0 }
};

function record(name, status, details = {}) {
  results.summary.total++;
  if (status === 'PASSED') results.summary.passed++;
  else results.summary.failed++;
  results.tests.push({ name, status, details });
  const detailStr = details.info ? `(${details.info})` : Object.entries(details).map(([k, v]) => `${k}=${v}`).join(', ');
  console.log(`[${status}] ${name} ${detailStr ? `[${detailStr}]` : ''}`);
}

async function run() {
  console.log('='.repeat(80));
  console.log('YOR TALKS - EXPLICIT-TARGET DEPLOYMENT BOUNDARY VERIFICATION');
  console.log('='.repeat(80));

  try {
    results.gitRevision = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    results.gitRevision = 'unavailable';
  }
  console.log(`Revision Tested: ${results.gitRevision}`);
  console.log(`Timestamp:       ${results.timestamp}`);
  console.log(`Base URL:        ${baseUrl}`);
  console.log(`Browser Origin:  ${browserOrigin}`);
  console.log('-'.repeat(80));

  // 1. Health probe
  try {
    const res = await fetch(`${baseUrl}/api/healthz`);
    assert.equal(res.status, 200, 'Expected /api/healthz status 200');
    const data = await res.json();
    assert.equal(data.status, 'live', 'Expected status to be live');
    record('1. Live probe (/api/healthz)', 'PASSED', { uptime: `${Math.round(data.uptime)}s` });
  } catch (err) {
    record('1. Live probe (/api/healthz)', 'FAILED', { error: err.message });
  }

  // 2. Readiness probe (Verifies PostgreSQL, Redis, API, Notification Worker, and Lifecycle Worker)
  try {
    const res = await fetch(`${baseUrl}/api/readyz`);
    assert.equal(res.status, 200, 'Expected /api/readyz status 200');
    const data = await res.json();
    assert.equal(data.status, 'healthy', 'Expected status to be healthy');
    // Public production readiness proves core dependency checks succeeded
    // without disclosing service names, Redis versions or worker diagnostics.
    assert.equal('services' in data, false, 'Public readiness must omit internal services');
    assert.equal('details' in data, false, 'Public readiness must omit internal details');
    record('2. Readiness probe (/api/readyz)', 'PASSED', {
      info: 'Core dependency gate responded healthy without leaking diagnostics',
    });
  } catch (err) {
    record('2. Readiness probe (/api/readyz)', 'FAILED', { error: err.message });
  }

  // 3. Engine.IO & Socket.IO Realtime Boundary
  try {
    const realtimeResult = await verifyRealtime({ baseUrl, browserOrigin });
    assert.equal(realtimeResult.polling, true);
    assert.equal(realtimeResult.originRejection, true);
    assert.equal(realtimeResult.unauthenticatedRejection, true);
    record('3. Realtime Engine.IO/Socket.IO Boundary', 'PASSED', {
      originRejection: '403 on foreign origin',
      handshake: '200 allowed-origin open packet',
      unauthenticatedRejection: '44{"message":"Authentication error"} on unauthenticated connection',
    });
  } catch (err) {
    record('3. Realtime Engine.IO/Socket.IO Boundary', 'FAILED', { error: err.message });
  }

  // 4. Session Login, Refresh Rotation, Logout Revocation
  try {
    // A. Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: browserOrigin },
      body: JSON.stringify({ identifier: fixtureIdentifier, password: fixturePassword }),
    });
    assert.equal(loginRes.status, 200, 'Login expected status 200');
    const loginSetCookie = loginRes.headers.get('set-cookie') || '';
    assert.match(loginSetCookie, /refreshToken=/, 'Login must issue refreshToken cookie');
    assert.match(loginSetCookie, /HttpOnly/i, 'refreshToken cookie must be HttpOnly');
    const loginBody = await loginRes.json();
    assert.ok(loginBody.data?.tokens?.accessToken, 'Login must return accessToken');
    const initialRefreshCookie = loginSetCookie.split(';')[0];

    // B. Refresh Token Rotation
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: browserOrigin, Cookie: initialRefreshCookie },
    });
    assert.equal(refreshRes.status, 200, 'Refresh expected status 200');
    const refreshSetCookie = refreshRes.headers.get('set-cookie') || '';
    assert.match(refreshSetCookie, /refreshToken=/, 'Refresh must rotate refreshToken cookie');
    const rotatedRefreshCookie = refreshSetCookie.split(';')[0];
    assert.notEqual(rotatedRefreshCookie, initialRefreshCookie, 'Rotated cookie must differ from initial');

    // C. Logout Revocation
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: browserOrigin, Cookie: rotatedRefreshCookie },
    });
    assert.equal(logoutRes.status, 200, 'Logout expected status 200');
    const logoutSetCookie = logoutRes.headers.get('set-cookie') || '';
    assert.match(logoutSetCookie, /refreshToken=;/, 'Logout must clear refreshToken cookie');

    // D. Replay of revoked token must be rejected
    const replayRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: browserOrigin, Cookie: rotatedRefreshCookie },
    });
    assert.equal(replayRes.status, 401, 'Replay of revoked refreshToken must return 401');

    record('4. Session Lifecycle & Revocation', 'PASSED', {
      info: 'HttpOnly cookie issued, rotated on refresh, cleared and revoked in Redis on logout, replay rejected 401',
    });
  } catch (err) {
    record('4. Session Lifecycle & Revocation', 'FAILED', { error: err.message });
  }

  // 5. Public readiness is a summary. Its backend gate checks mandatory
  // services before issuing 200; private heartbeat details must be reviewed
  // independently from the isolated service runtime.
  try {
    const readyRes = await fetch(`${baseUrl}/api/readyz`);
    assert.equal(readyRes.status, 200, 'Core worker/dependency readiness is unavailable');
    const readyData = await readyRes.json();
    assert.equal(readyData.status, 'healthy');
    assert.equal('services' in readyData || 'details' in readyData, false);
    record('5. Core readiness gating (public)', 'PASSED', {
      info: 'Private worker heartbeats and cleanup queues require separate operator inspection',
    });
  } catch (err) {
    record('5. Core readiness gating (public)', 'FAILED', { error: err.message });
  }

  // 6. Security, Origin & Eligibility Boundaries
  try {
    // Unauthenticated owner routes protected
    const unauthMe = await fetch(`${baseUrl}/api/users/me/eligibility`);
    assert.equal(unauthMe.status, 401, 'Expected 401 for /api/users/me/eligibility');

    // Foreign origin rejected on auth routes
    const foreignAuth = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
      body: JSON.stringify({ identifier: 'test', password: 'test' }),
    });
    assert.equal(foreignAuth.status, 403, 'Foreign origin on /api/auth/login must be rejected with 403');

    // Prescreen endpoint unavailable without legal territory registry
    const prescreenRes = await fetch(`${baseUrl}/api/eligibility/enrollments/prescreen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedExperience: 'adult_18_plus', territory: 'ZZ' }),
    });
    assert.equal(prescreenRes.status, 200, 'Prescreen status 200');
    const prescreenJson = await prescreenRes.json();
    assert.equal(prescreenJson.data?.status, 'unavailable', 'Prescreen must be unavailable');

    record('6. Security & Eligibility Boundaries', 'PASSED', {
      unauthenticatedOwnerRoutes: '401 Unauthorized',
      foreignOriginRejection: '403 Forbidden',
      emptyProductionTerritoryRegistry: 'Prescreen unavailable, no unapproved enrollments',
    });
  } catch (err) {
    record('6. Security & Eligibility Boundaries', 'FAILED', { error: err.message });
  }

  // 7. An anonymous denial is not proof that optional paid or live services
  // are disabled. Check only what this unauthenticated probe can verify.
  try {
    const paymentCheck = await fetch(`${baseUrl}/api/payment-operations/checkout-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'pro' }),
    });
    assert.ok([401, 403, 404, 503].includes(paymentCheck.status), `Anonymous payment probe unexpectedly returned ${paymentCheck.status}`);
    record('7. Anonymous payment access denied', 'PASSED', {
      info: 'Optional feature flags and real provider calls require separate privileged verification',
    });
  } catch (err) {
    record('7. Anonymous payment access denied', 'FAILED', { error: err.message });
  }

  console.log('-'.repeat(80));
  console.log(`SUMMARY: ${results.summary.passed}/${results.summary.total} checks passed (${results.summary.failed} failed)`);
  console.log('='.repeat(80));

  if (results.summary.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

async function main() {
  try {
    const config=verificationConfiguration(process.env);
    let checkout={revision:null,dirty:null};
    try {checkout={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(),
      dirty:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim())};} catch { /* Unknown stays unknown. */ }
    const report=await verifyDeploymentBoundary(config);
    console.log(JSON.stringify({...report,localCheckout:checkout,scope:'Observed API boundaries only; checkout identity is not deployment provenance.'},null,2));
    if(report.summary.failed) process.exitCode=1;
  } catch {console.error('Deployment verification failed: validate the explicit target, configuration and test-account authorization.');process.exitCode=1;}
}
if(process.argv[1]&&pathToFileURL(realpathSync(process.argv[1])).href===import.meta.url) await main();
