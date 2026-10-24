import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verificationConfiguration, verifyDeploymentBoundary } from '../ops/verify-deployment-boundary.mjs';

test('session verification requires explicit test credentials and a safe explicit target',()=>{
  assert.equal(verificationConfiguration({}).credentials,undefined);
  for (const environment of [
    {BASE_URL:'https://person:secret@example.test'},
    {BASE_URL:'https://example.test/path'},
    {SMOKE_AUTH_ENABLED:'true'},
    {SMOKE_AUTH_ENABLED:'true',SMOKE_LOGIN_IDENTIFIER:'test',SMOKE_LOGIN_PASSWORD:'secret'},
    {BASE_URL:'http://example.test',SMOKE_AUTH_ENABLED:'true',SMOKE_LOGIN_IDENTIFIER:'test',SMOKE_LOGIN_PASSWORD:'secret'},
  ]) assert.throws(()=>verificationConfiguration(environment));
});

test('failed deployment probes never report invented provider results or expose response credentials',async()=>{
  const report=await verifyDeploymentBoundary({baseUrl:'https://api.example.test',browserOrigin:'https://example.test'},
    {fetch:async()=>{throw new Error('secret-password-and-cookie');},
      realtime:async()=>{throw new Error('private-network');},privateChat:async()=>{throw new Error('private-account');}});
  assert.deepEqual(report.summary,{passed:0,failed:5,skipped:1});
  const output=JSON.stringify(report);
  assert.ok(!output.includes('secret-password')&&!output.includes('private-account'));
  assert.ok(!output.includes('zero provider')&&!output.includes('gitRevision'));
});
