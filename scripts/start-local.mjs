import {spawn} from 'node:child_process';
import {open,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function ready(){
 try{const r=await fetch('http://127.0.0.1:5173/api/health',{signal:AbortSignal.timeout(800)});return r.ok&&(await r.json()).app==='winter-value-model';}catch{return false;}
}
if(await ready()){console.log('冬日账本已经运行：http://127.0.0.1:5173/');}
else{
 await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
 const out=await open(new URL('../artifacts/server.log',import.meta.url),'a'),err=await open(new URL('../artifacts/server-error.log',import.meta.url),'a');
 const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,PORT:'5173'},detached:true,windowsHide:true,stdio:['ignore',out.fd,err.fd]});
 child.on('error',e=>{console.error('启动失败：'+e.message);process.exitCode=1;});child.unref();
 let started=false;
 for(let i=0;i<20;i++){if(await ready()){started=true;break;}await new Promise(r=>setTimeout(r,250));}
 await out.close();await err.close();
 if(!started){console.error('网站未启动，请检查5173端口或artifacts/server-error.log。');process.exitCode=1;}
 else console.log('冬日账本已在后台启动：http://127.0.0.1:5173/');
}
