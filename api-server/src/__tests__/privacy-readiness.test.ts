import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { assertRecoveryReplay } from '../services/privacy-readiness.js';
import express from 'express';
import { createRecoveryGate } from '../middlewares/recovery-gate.js';

test('recovery readiness requires the exact independent checkpoint and manifest digest', async () => {
  const through='2026-01-01T00:00:00Z',sha256='a'.repeat(64),dialect=new PgDialect();
  await assert.rejects(assertRecoveryReplay({enabled:true,through:'',sha256},async()=>({rows:[{one:1}]})));
  await assert.rejects(assertRecoveryReplay({enabled:true,through,sha256:''},async()=>({rows:[{one:1}]})));
  await assert.rejects(assertRecoveryReplay({enabled:true,through,sha256},async()=>({rows:[]})));
  await assertRecoveryReplay({enabled:true,through,sha256},async statement=>{
    const query=dialect.sqlToQuery(statement);
    assert.deepEqual(query.params,[through,sha256]);
    assert.ok(!query.sql.includes('>='));
    return {rows:[{one:1}]};
  });
  await assertRecoveryReplay({enabled:false,through:'',sha256:''},async()=>{throw new Error('should not query');});
});

test('HTTP application entry points cannot serve restored data while recovery is incomplete', async () => {
  let reconciled=false,served=0;
  const app=express();
  app.use(createRecoveryGate(async()=>{if(!reconciled) throw new Error('private database identity');}));
  app.use((_req,res)=>{served++;res.json({ok:true});});
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  try {
    const address=server.address(); assert.ok(address&&typeof address!=='string');
    for (const endpoint of ['/api/users/me','/api/v1/users/me','/api/posts','/api/readyz/private']) {
      const response=await fetch(`http://127.0.0.1:${address.port}${endpoint}`,{method:'POST'});
      assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
      assert.ok(!(await response.text()).includes('private database identity'));
    }
    assert.equal(served,0);
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/healthz`)).status,200);
    reconciled=true;
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/api/users/me`)).status,200);
    assert.equal(served,2);
  } finally { await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
});
