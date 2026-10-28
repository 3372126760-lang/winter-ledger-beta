import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStaticResponder} from './static-response.mjs';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const {basePath}=JSON.parse(await readFile(resolve(root,'release.json'),'utf8'));
const respond=createStaticResponder(),port=Number(process.env.PREVIEW_PORT||5174);
createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(basePath)||!['GET','HEAD'].includes(req.method)){res.writeHead(404).end();return;}
  const suffix=path.slice(basePath.length),file=resolve(root,suffix||'index.html');
  if(!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
  await respond(req,res,file);
 }catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log(`Public preview: http://127.0.0.1:${port}${basePath}`));
