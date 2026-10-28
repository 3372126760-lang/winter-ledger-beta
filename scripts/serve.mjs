import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import {createStore} from './persistence.mjs';
import {validateState} from '../src/domain/model.js';
import {createStaticResponder} from './static-response.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 5173);
const catalog=JSON.parse(await readFile(resolve(root,'src/data/catalog.json'),'utf8'));
const store=createStore(resolve(root,'storage'),state=>validateState(state,catalog.items));
const respondStatic=createStaticResponder();
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname==='/api/health'&&req.method==='GET'){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({app:'winter-value-model',status:'ready'}));return;
    }
    if(pathname==='/api/state'){
      res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
      const allowed=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
      if(!allowed.has(`http://${req.headers.host}`)||(req.headers.origin&&!allowed.has(req.headers.origin))){res.writeHead(403).end(JSON.stringify({error:'仅支持本机页面保存'}));return;}
      try{
        if(req.method==='GET'){res.end(JSON.stringify(await store.read()));return;}
        if(req.method!=='PUT'||!allowed.has(req.headers.origin)){res.writeHead(403).end(JSON.stringify({error:'仅支持本机页面保存'}));return;}
        let size=0;const chunks=[];
        for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024){res.writeHead(413).end(JSON.stringify({error:'备份超过10MB，请导出并整理历史记录'}));return;}chunks.push(chunk);}
        const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const saved=await store.save(input.state,input.revision??null);
        res.end(JSON.stringify({revision:saved.revision,savedAt:saved.savedAt}));return;
      }catch(e){res.writeHead(e.status||400).end(JSON.stringify({error:e.message}));return;}
    }
    if(/^\/(storage|reference-archive)(\/|$)/.test(pathname)){res.writeHead(403).end('Forbidden');return;}
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const privatePaths=['storage','reference-archive'].map(name=>resolve(root,name).toLowerCase());
    if(privatePaths.some(privatePath=>path.toLowerCase()===privatePath||path.toLowerCase().startsWith(privatePath+sep))){res.writeHead(403).end('Forbidden');return;}
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || !['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(403).end('Forbidden'); return;
    }
    await respondStatic(req,res,path);
  } catch { res.writeHead(404).end('Not found'); }
});
server.on('error', e => { console.error(e.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
