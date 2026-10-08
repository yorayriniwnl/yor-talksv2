import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
const bundled=await build({stdin:{contents:"export { api, setStoredTokens } from './social/src/lib/api-client'; export * from './social/src/lib/message-delivery';",resolveDir:process.cwd(),sourcefile:'media-client-test-entry.ts'},bundle:true,write:false,platform:'browser',format:'esm',define:{'import.meta.env':'{}'}});
async function clientModule(t){
  for(const [key,value]of Object.entries({localStorage:{getItem:()=>null,removeItem:()=>{}},window:{location:{origin:'https://app.example.test'}}})){
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,value});
    t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):Reflect.deleteProperty(globalThis,key));
  }
  const module=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text+'\n// '+randomUUID()).toString('base64')}`);
  module.setStoredTokens({accessToken:'synthetic-access'});return module;
}
const client=async t=>(await clientModule(t)).api;
const ok=data=>Response.json({success:true,message:'OK',data,errors:[],meta:{}});
const mediaId='b66d5b3e-e258-4932-9b99-d15cf3f33615';
const grant=(file,extra={})=>({id:mediaId,mediaId,status:'pending',mode:'server',purpose:'post',mimeType:file.type,maxFileSize:5*1024*1024,uploadUrl:`/api/media/${mediaId}/upload`,...extra});
const approved=file=>({id:mediaId,mediaId,status:'approved',mimeType:file.type,size:file.size,url:`https://app.example.test/api/media/${mediaId}/content?token=synthetic.signed`});
const directGrant=file=>grant(file,{mode:'direct',uploadUrl:'https://api.cloudinary.com/v1_1/fixture/image/upload',fields:{public_id:'yor-talks/owner/reservation',type:'authenticated',overwrite:'false',upload_preset:'restricted',signature:'signed',api_key:'key',timestamp:'123'}});
test('a finalize outage preserves the reservation and uploaded file; retry never repeats the provider write',async t=>{
  const api=await client(t),file=new File(['synthetic'],'a.png',{type:'image/png'});let prepares=0,uploads=0,finalizes=0;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(url.endsWith('/presign')){prepares++;assert.deepEqual(JSON.parse(options.body),{filename:'a.png',mimeType:'image/png',size:file.size,purpose:'post'});return ok(grant(file));}
    if(url.endsWith('/upload')){uploads++;assert.ok(options.body instanceof FormData);return ok({id:mediaId,status:'uploaded'});}
    finalizes++;return finalizes===1?Response.json({success:false,message:'Moderation unavailable',errors:['media_moderation_unavailable']},{status:503}):ok(approved(file));
  });
  await assert.rejects(()=>api.uploadMedia(file,'post'),/Moderation unavailable/);
  assert.equal((await api.uploadMedia(file,'post')).mediaId,mediaId);assert.equal(prepares,1);assert.equal(uploads,1);assert.equal(finalizes,2);
});

test('a lost server upload response retries the same reservation and reaches finalization',async t=>{
  const api=await client(t),file=new File(['synthetic'],'a.png',{type:'image/png'});let prepares=0,uploadRequests=0,finalizes=0;
  t.mock.method(globalThis,'fetch',async url=>{
    if(url.endsWith('/presign')){prepares++;return ok(grant(file));}
    if(url.endsWith('/upload')){
      uploadRequests++;
      if(uploadRequests===1)throw new TypeError('The successful upload response was lost');
      // The server recovers the same owned byte hash without a provider write.
      return ok({id:mediaId,mediaId,status:'uploaded'});
    }
    finalizes++;return ok(approved(file));
  });
  await assert.rejects(()=>api.uploadMedia(file,'post'),/response was lost/);
  assert.equal(finalizes,0);
  assert.equal((await api.uploadMedia(file,'post')).mediaId,mediaId);
  assert.equal(prepares,1);assert.equal(uploadRequests,2);assert.equal(finalizes,1);
});
test('direct uploads send every signed field unchanged and discard the provider URL before finalization',async t=>{
  const api=await client(t),file=new File(['synthetic'],'a.png',{type:'image/png'});
  const fields={public_id:'yor-talks/owner/reservation',type:'authenticated',overwrite:'false',upload_preset:'restricted',signature:'signed',api_key:'key',timestamp:'123',allowed_formats:'png'};
  const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls.push(url);if(url.endsWith('/presign'))return ok(grant(file,{mode:'direct',uploadUrl:'https://api.cloudinary.com/v1_1/fixture/image/upload',fields}));
    if(url.startsWith('https://api.cloudinary.com/')){for(const [key,value]of Object.entries(fields))assert.equal(options.body.get(key),value);assert.equal(options.headers,undefined);return Response.json({secure_url:'https://attacker.test/unapproved'});}
    return ok(approved(file));
  });
  const result=await api.uploadMedia(file,'post');assert.equal(result.url,approved(file).url);assert.equal(calls.length,3);
});

test('a lost direct upload acknowledgement probes server finalization and never repeats a completed provider write',async t=>{
  const api=await client(t),file=new File(['synthetic'],'a.png',{type:'image/png'});let prepares=0,uploads=0,finalizes=0;
  t.mock.method(globalThis,'fetch',async url=>{
    if(url.endsWith('/presign')){prepares++;return ok(directGrant(file));}
    if(url.startsWith('https://api.cloudinary.com/')){uploads++;throw new TypeError('The successful provider response was lost');}
    finalizes++;return ok(approved(file));
  });
  await assert.rejects(()=>api.uploadMedia(file,'post'),/provider response was lost/);
  assert.equal(finalizes,0);
  assert.equal((await api.uploadMedia(file,'post')).mediaId,mediaId);
  assert.deepEqual([prepares,uploads,finalizes],[1,1,1]);
});

test('an unreceived direct upload retries the same identity only after the server confirms the provider object is missing',async t=>{
  const api=await client(t),file=new File(['synthetic'],'a.png',{type:'image/png'});let prepares=0,uploads=0,finalizes=0;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(url.endsWith('/presign')){prepares++;return ok(directGrant(file));}
    if(url.startsWith('https://api.cloudinary.com/')){
      uploads++;assert.equal(options.body.get('public_id'),'yor-talks/owner/reservation');
      if(uploads===1)throw new TypeError('Network failed before upload');
      return Response.json({secure_url:'https://untrusted.test/not-publishable'});
    }
    finalizes++;return finalizes===1?Response.json({success:false,message:'Uploaded media was not found',errors:['media_upload_not_found']},{status:502}):ok(approved(file));
  });
  await assert.rejects(()=>api.uploadMedia(file,'post'),/before upload/);
  assert.equal((await api.uploadMedia(file,'post')).mediaId,mediaId);
  assert.deepEqual([prepares,uploads,finalizes],[1,2,2]);
});

test('direct upload recovery preserves the file through moderation and generic provider outages without another write',async t=>{
  const api=await client(t),file=new File(['synthetic'],'a.png',{type:'image/png'});let uploads=0,finalizes=0;
  t.mock.method(globalThis,'fetch',async url=>{
    if(url.endsWith('/presign'))return ok(directGrant(file));
    if(url.startsWith('https://api.cloudinary.com/')){uploads++;throw new TypeError('Upload response lost');}
    finalizes++;
    if(finalizes===1)return Response.json({success:false,message:'Moderation unavailable',errors:['media_moderation_unavailable']},{status:503});
    if(finalizes===2)return Response.json({success:false,message:'Media storage is temporarily unavailable',errors:['media_provider_unavailable']},{status:502});
    if(finalizes===3)return ok({...approved(file),url:'https://untrusted.test/raw-provider.png'});
    return ok(approved(file));
  });
  await assert.rejects(()=>api.uploadMedia(file,'post'),/response lost/);
  await assert.rejects(()=>api.uploadMedia(file,'post'),/Moderation unavailable/);
  await assert.rejects(()=>api.uploadMedia(file,'post'),/storage is temporarily unavailable/);
  assert.equal(uploads,1,'A generic provider 502 must never replay the direct upload');
  await assert.rejects(()=>api.uploadMedia(file,'post'),/delivery could not be verified/);
  assert.equal((await api.uploadMedia(file,'post')).mediaId,mediaId);
  assert.deepEqual([uploads,finalizes],[1,4]);
});

test('a session change during direct upload cannot finalize or reuse the old owner reservation',async t=>{
  const {api,setStoredTokens}=await clientModule(t),file=new File(['synthetic'],'a.png',{type:'image/png'});let prepares=0,uploads=0,finalizes=0;
  t.mock.method(globalThis,'fetch',async url=>{
    if(url.endsWith('/presign')){prepares++;return ok(directGrant(file));}
    if(url.startsWith('https://api.cloudinary.com/')){uploads++;if(uploads===1)setStoredTokens({accessToken:'new-session'});return Response.json({secure_url:'https://untrusted.test/uploaded'});}
    finalizes++;return ok(approved(file));
  });
  await assert.rejects(()=>api.uploadMedia(file,'post'),/session changed/);
  assert.equal(finalizes,0);
  assert.equal((await api.uploadMedia(file,'post')).mediaId,mediaId);
  assert.deepEqual([prepares,uploads,finalizes],[2,2,1]);
});
test('raw provider URLs and rejection never become publishable client attachments',async t=>{
  const api=await client(t),file=new File(['synthetic'],'a.png',{type:'image/png'});let finalizes=0;
  t.mock.method(globalThis,'fetch',async url=>url.endsWith('/presign')?ok(grant(file)):url.endsWith('/upload')?ok({status:'uploaded'}):(++finalizes===1?ok({...approved(file),url:'https://attacker.test/forged.png'}):ok({id:mediaId,mediaId,status:'rejected'})));
  await assert.rejects(()=>api.uploadMedia(file,'post'),/delivery could not be verified/);
  await assert.rejects(()=>api.uploadMedia(file,'post'),/could not be approved/);
  await assert.rejects(()=>api.uploadMedia(file,'post'),/could not be approved/);assert.equal(finalizes,2);
});
test('unsupported MIME and purpose-specific sizes fail before requesting a grant',async t=>{
  const api=await client(t),fetch=t.mock.method(globalThis,'fetch',()=>{throw new Error('must not fetch');});
  await assert.rejects(()=>api.uploadMedia(new File(['x'],'a.mov',{type:'video/quicktime'}),'video'),/not supported/);
  await assert.rejects(()=>api.uploadMedia(new File([new Uint8Array(2*1024*1024+1)],'avatar.png',{type:'image/png'}),'avatar'),/2 MB/);
  await assert.rejects(()=>api.uploadMedia(new File(['x'],'voice.webm',{type:'audio/webm'}),'avatar'),/not supported/);assert.equal(fetch.mock.callCount(),0);
});

const message=extra=>({id:'30000000-0000-4000-8000-000000000181',conversationId:'20000000-0000-4000-8000-000000000181',senderId:'10000000-0000-4000-8000-000000000181',createdAt:'2026-08-28T08:00:00.123456Z',mediaId,mediaType:'image',mediaLegacy:false,mediaUrl:`/api/media/${mediaId}/content?token=expired`,deletedAt:null,expiresAt:null,...extra});

test('old message delivery renews one exact history tuple, including the zero UUID-tail boundary and microseconds',async t=>{
  const {readFreshMessageDelivery}=await clientModule(t);let current=message();const queries=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(options.headers.Authorization,'Bearer synthetic-access');
    const query=new URL(url,'https://app.example.test').searchParams;queries.push(Object.fromEntries(query));
    return ok([{...current,mediaUrl:`/api/media/${mediaId}/content?token=renewed`}]);
  });
  for(const id of ['30000000-0000-4000-8000-000000000181','30000000-0000-4000-8000-000000000000']){
    current=message({id});assert.equal(await readFreshMessageDelivery(current),`https://app.example.test/api/media/${mediaId}/content?token=renewed`);
  }
  assert.deepEqual(queries,[
    {direction:'newer',cursorAt:current.createdAt,cursorId:'30000000-0000-4000-8000-000000000180',limit:'1'},
    {direction:'older',cursorAt:current.createdAt,cursorId:'30000000-0000-4000-8000-000000000001',limit:'1'},
  ]);
});

test('message delivery rejects mismatched rows, missing or unchanged grants, external URLs, deletion and expiry',async t=>{
  const {readFreshMessageDelivery}=await clientModule(t),current=message();let page;
  t.mock.method(globalThis,'fetch',async()=>ok(page));
  const fresh={...current,mediaUrl:`/api/media/${mediaId}/content?token=renewed`};
  for(const candidate of [
    [],[fresh,fresh],{0:fresh,length:1},[null],
    [{...fresh,id:randomUUID()}],[{...fresh,conversationId:randomUUID()}],[{...fresh,senderId:randomUUID()}],
    [{...fresh,createdAt:'2026-08-28T08:00:00.123457Z'}],[{...fresh,mediaId:randomUUID()}],[{...fresh,mediaType:'audio'}],
    [{...fresh,mediaUrl:undefined}],[current],[{...fresh,mediaUrl:'https://untrusted.test/raw-provider.png'}],
    [{...fresh,mediaLegacy:true}],[{...fresh,deletedAt:'2026-08-28T08:02:00Z'}],[{...fresh,expiresAt:'2026-08-28T08:02:00Z'}],
  ]){
    page=candidate;await assert.rejects(()=>readFreshMessageDelivery(current));
  }
});

test('invalid original message delivery fails before any authorized read or provider request',async t=>{
  const {approvedMessageDeliveryUrl,readFreshMessageDelivery}=await clientModule(t),fetch=t.mock.method(globalThis,'fetch',()=>{throw new Error('must not fetch');});
  for(const invalid of [
    {mediaLegacy:true},{mediaId:'invalid'},{mediaType:'video'},{deletedAt:'2026-08-28T08:00:00Z'},{expiresAt:'invalid'},
    {mediaUrl:'https://untrusted.test/raw-provider.png'},{mediaUrl:`/api/media/${randomUUID()}/content?token=forged`},
    {mediaUrl:`https://user:pass@app.example.test/api/media/${mediaId}/content?token=forged`},
    {mediaUrl:`/api/media/${mediaId}/content?token=forged#fragment`},{mediaUrl:`/api/media/${mediaId}/content`},
  ]){
    const original=message(invalid);assert.equal(approvedMessageDeliveryUrl(original),null);await assert.rejects(()=>readFreshMessageDelivery(original));
  }
  for(const invalid of [{id:'invalid'},{conversationId:'invalid'},{createdAt:'not-a-timestamp'}])await assert.rejects(()=>readFreshMessageDelivery(message(invalid)));
  assert.equal(fetch.mock.callCount(),0);
});

test('message renewal cannot return a grant from an old session, and a denied read stays denied',async t=>{
  const {readFreshMessageDelivery,setStoredTokens}=await clientModule(t);let denied=true;
  t.mock.method(globalThis,'fetch',async()=>{
    if(denied)return Response.json({success:false,message:'Conversation access denied'},{status:403});
    setStoredTokens({accessToken:'new-session'});return ok([{...message(),mediaUrl:`/api/media/${mediaId}/content?token=renewed`}]);
  });
  await assert.rejects(()=>readFreshMessageDelivery(message()),/Conversation access denied/);
  denied=false;await assert.rejects(()=>readFreshMessageDelivery(message()),/session changed/);
});
