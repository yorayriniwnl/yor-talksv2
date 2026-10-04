import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
const bundled=await build({entryPoints:['social/src/lib/api-client.ts'],bundle:true,write:false,platform:'browser',format:'esm',define:{'import.meta.env':'{}'}});
async function client(t){
  for(const [key,value]of Object.entries({localStorage:{getItem:()=>null,removeItem:()=>{}},window:{location:{origin:'https://app.example.test'}}})){
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,value});
    t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):Reflect.deleteProperty(globalThis,key));
  }
  const module=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text+'\n// '+randomUUID()).toString('base64')}`);
  module.setStoredTokens({accessToken:'synthetic-access'});return module.api;
}
const ok=data=>Response.json({success:true,message:'OK',data,errors:[],meta:{}});
const mediaId='b66d5b3e-e258-4932-9b99-d15cf3f33615';
const grant=(file,extra={})=>({id:mediaId,mediaId,status:'pending',mode:'server',purpose:'post',mimeType:file.type,maxFileSize:5*1024*1024,uploadUrl:`/api/media/${mediaId}/upload`,...extra});
const approved=file=>({id:mediaId,mediaId,status:'approved',mimeType:file.type,size:file.size,url:`https://app.example.test/api/media/${mediaId}/content?token=synthetic.signed`});
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
