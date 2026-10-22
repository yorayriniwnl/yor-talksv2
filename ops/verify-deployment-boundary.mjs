import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { verifyRealtime } from './realtime-smoke.mjs';
import { verifyPrivateChat } from './private-chat-smoke.mjs';

export function verificationConfiguration(environment) {
  const baseUrl=environment.BASE_URL || 'http://127.0.0.1:4000';
  const browserOrigin=environment.BROWSER_ORIGIN || 'http://localhost:5173';
  for(const value of [baseUrl,browserOrigin]) {
    const url=new URL(value);
    assert.ok(['http:','https:'].includes(url.protocol)&&url.origin===value&&!url.username&&!url.password,
      'Verification endpoints must be exact HTTP(S) origins without credentials');
  }
  assert.ok(!environment.SMOKE_AUTH_ENABLED || ['true','false'].includes(environment.SMOKE_AUTH_ENABLED),'Invalid SMOKE_AUTH_ENABLED');
  let credentials;
  if(environment.SMOKE_AUTH_ENABLED==='true') {
    assert.ok(environment.BASE_URL&&environment.SMOKE_LOGIN_IDENTIFIER&&environment.SMOKE_LOGIN_PASSWORD,
      'An explicit target and dedicated test-account credentials are required for session checks');
    const target=new URL(baseUrl);
    assert.ok(target.protocol==='https:'||['localhost','127.0.0.1','[::1]'].includes(target.hostname),
      'Credentials require HTTPS or an explicit loopback test target');
    credentials={identifier:environment.SMOKE_LOGIN_IDENTIFIER,password:environment.SMOKE_LOGIN_PASSWORD};
  }
  return {baseUrl,browserOrigin,credentials};
}

/** Read-only boundaries by default. Session mutations require a dedicated opt-in account. */
export async function verifyDeploymentBoundary(config, dependencies={}) {
  const request=dependencies.fetch ?? fetch;
  const realtime=dependencies.realtime ?? verifyRealtime, privateChat=dependencies.privateChat ?? verifyPrivateChat;
  const checks=[];
  const probe=async(name,run)=>{
    try {await run();checks.push({name,status:'passed'});}
    catch {checks.push({name,status:'failed'});} // Never serialize responses, credentials, cookies or provider errors.
  };
  const call=(path,options={})=>request(new URL(path,config.baseUrl),{
    redirect:'error',signal:AbortSignal.timeout(8000),...options});
  const json=async(path,options)=>{
    const response=await call(path,options);return {response,body:await response.json()};
  };
  await probe('liveness',async()=>{
    const {response,body}=await json('/api/healthz');assert.equal(response.status,200);assert.equal(body.status,'live');
  });
  await probe('readiness and current worker heartbeats',async()=>{
    const {response,body}=await json('/api/readyz');assert.equal(response.status,200);assert.equal(body.status,'healthy');
    for(const name of ['database','redis','api','worker','lifecycleWorker']) assert.equal(body.services?.[name],'up');
    assert.equal(body.details?.lifecycleCleanup?.overdueJobs,0);assert.equal(body.details?.lifecycleCleanup?.deadJobs,0);
  });
  await probe('polling transport, browser origin and unauthenticated namespace rejection',()=>realtime({baseUrl:config.baseUrl,browserOrigin:config.browserOrigin}));
  await probe('private-chat authentication and no-store responses',()=>privateChat({baseUrl:config.baseUrl}));
  await probe('owner authentication and foreign-origin rejection',async()=>{
    assert.equal((await call('/api/users/me/eligibility')).status,401);
    const foreign=await call('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted-origin.invalid'},
      body:JSON.stringify({identifier:'synthetic-boundary@example.invalid',password:'synthetic-boundary-only'})});
    assert.equal(foreign.status,403);
  });
  if(config.credentials) await probe('dedicated test-account login, rotation and revocation',async()=>{
    let cookie,accessToken;
    const headers=()=>({'Content-Type':'application/json',Origin:config.browserOrigin,...(cookie?{Cookie:cookie}:{}),
      ...(accessToken?{Authorization:'Bearer '+accessToken}:{})});
    try {
      const login=await json('/api/auth/login',{method:'POST',headers:headers(),body:JSON.stringify(config.credentials)});
      assert.equal(login.response.status,200);
      const setCookie=login.response.headers.get('set-cookie')||'';
      assert.ok(setCookie.includes('refreshToken=')&&/HttpOnly/i.test(setCookie));
      cookie=setCookie.split(';')[0];accessToken=login.body.data?.tokens?.accessToken;assert.ok(typeof accessToken==='string');
      const oldCookie=cookie;
      const refreshed=await json('/api/auth/refresh',{method:'POST',headers:headers()});assert.equal(refreshed.response.status,200);
      cookie=(refreshed.response.headers.get('set-cookie')||'').split(';')[0];
      assert.ok(cookie.startsWith('refreshToken=')&&cookie!==oldCookie);
      accessToken=refreshed.body.data?.tokens?.accessToken;assert.ok(typeof accessToken==='string');
      const logout=await call('/api/auth/logout',{method:'POST',headers:headers()});assert.equal(logout.status,200);
      assert.ok((logout.headers.get('set-cookie')||'').includes('refreshToken=;'));
      assert.equal((await call('/api/auth/refresh',{method:'POST',headers:headers()})).status,401);
      assert.equal((await call('/api/users/me',{headers:headers()})).status,401);
    } finally {
      if(cookie&&accessToken) await call('/api/auth/logout',{method:'POST',headers:headers()}).catch(()=>{});
    }
  });
  else checks.push({name:'dedicated test-account login, rotation and revocation',status:'skipped'});
  return {timestamp:new Date().toISOString(),checks,summary:{passed:checks.filter(c=>c.status==='passed').length,
    failed:checks.filter(c=>c.status==='failed').length,skipped:checks.filter(c=>c.status==='skipped').length}};
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
