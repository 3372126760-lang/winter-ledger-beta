import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStaticResponder,acceptsGzip} from '../scripts/static-response.mjs';

test('浏览器资料压缩，未变文件返回304，改动同路径后必须返回新内容',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'winter-static-')),file=join(directory,'data.json');
 const body=JSON.stringify({values:Array.from({length:500},(_,i)=>({level:i,cost:100}))});await writeFile(file,body);
 const respond=createStaticResponder(),server=createServer((req,res)=>respond(req,res,file).catch(()=>res.writeHead(404).end()));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}/data.json`;
 try{
  const first=await fetch(url,{headers:{'Accept-Encoding':'gzip'}});
  assert.equal(first.headers.get('content-encoding'),'gzip');assert.ok(Number(first.headers.get('content-length'))<body.length/3);
  assert.equal(await first.text(),body);const etag=first.headers.get('etag');
  const cached=await fetch(url,{headers:{'If-None-Match':etag}});assert.equal(cached.status,304);assert.equal(await cached.text(),'');
  await writeFile(file,JSON.stringify({changed:true}));
  const next=await fetch(url,{headers:{'If-None-Match':etag}});assert.equal(next.status,200);assert.deepEqual(await next.json(),{changed:true});
  const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 }finally{await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true});}
});

test('尊重禁止gzip的客户端，避免返回不能解码的内容',()=>{
 assert.equal(acceptsGzip('br, gzip, deflate'),true);assert.equal(acceptsGzip('gzip;q=0'),false);
 assert.equal(acceptsGzip('GZIP; q=0.5'),true);assert.equal(acceptsGzip('identity'),false);
});
