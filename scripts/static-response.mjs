import {readFile,stat} from 'node:fs/promises';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
import {extname} from 'node:path';

const zip=promisify(gzip);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.avif':'image/avif','.txt':'text/plain'};
const textExtensions=new Set(['.html','.js','.css','.json','.svg','.txt']);
export function acceptsGzip(header=''){
 return String(header).split(',').some(part=>{
  const [name,...params]=part.trim().split(';');
  const q=params.find(p=>p.trim().startsWith('q='));
  return name.toLowerCase()==='gzip'&&(!q||Number(q.trim().slice(2))>0);
 });
}

export function createStaticResponder(){
 const cache=new Map();let cachedBytes=0;
 return async function respond(req,res,path){
  const info=await stat(path);if(!info.isFile())throw new Error('Not a file');
  const extension=extname(path),text=textExtensions.has(extension);
  const stamp=`${info.size}-${info.mtimeMs}`,etag=`W/"${stamp}"`;
  const headers={'Content-Type':(types[extension]||'application/octet-stream')+(text?'; charset=utf-8':''),'Cache-Control':'no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'};
  if(text)headers.Vary='Accept-Encoding';
  const matches=String(req.headers['if-none-match']||'').split(',').map(s=>s.trim());
  if(matches.includes(etag)||matches.includes('*')){res.writeHead(304,headers);res.end();return;}
  let entry=cache.get(path);
  if(!entry||entry.stamp!==stamp){
   const content=await readFile(path);
   const compressed=text&&content.length>=1024?await zip(content):null;
   if(entry){cachedBytes-=entry.bytes;cache.delete(path);}
   entry={stamp,content,compressed,bytes:content.length+(compressed?.length||0)};
   if(text&&entry.bytes<=8*1024*1024){
    while(cache.size&&(cache.size>=64||cachedBytes+entry.bytes>16*1024*1024)){
     const oldest=cache.keys().next().value;cachedBytes-=cache.get(oldest).bytes;cache.delete(oldest);
    }
    cache.set(path,entry);cachedBytes+=entry.bytes;
   }
  }
  const zipped=entry.compressed&&acceptsGzip(req.headers['accept-encoding']);
  const body=zipped?entry.compressed:entry.content;
  if(zipped)headers['Content-Encoding']='gzip';
  headers['Content-Length']=body.length;
  res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
 };
}
