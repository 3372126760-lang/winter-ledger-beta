import {readFile,writeFile,mkdir,readdir,copyFile,rm} from 'node:fs/promises';
import {resolve,relative,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export function normalizeBasePath(value='/'){
  if(!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(value)||value.split('/').some(p=>p==='.'||p==='..'))throw new Error('网站路径必须是 / 或 /仓库英文名/');
  return value;
}
export function publicText(text,basePath){
  return text.replace(/(["'`(])\/(src|public)\//g,(_,quote,folder)=>`${quote}${basePath}${folder}/`);
}
export function publicData(value){
  if(Array.isArray(value))return value.map(publicData);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['sourceFile','localFile','originalFile'].includes(key)).map(([key,v])=>[key,publicData(v)]));
  return value;
}
const unusedHeroFiles=new Set(['game-hero-3.png','game-hero-4.png','clean-equipment-atlas-v1.png']);
export async function buildPublic({root=projectRoot,out=resolve(root,'dist'),basePath='/'}={}){
  basePath=normalizeBasePath(basePath);
  const destination=resolve(out),allowedRoot=resolve(root,'dist');
  // Only clear the dedicated build output, never user storage or arbitrary paths.
  if(destination!==allowedRoot)throw new Error('内测版输出仅允许使用项目 dist 文件夹');
  await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
  let files=0,bytes=0;
  async function copy(path){
    const input=resolve(root,path),target=resolve(destination,path);
    if(relative(destination,target).startsWith('..'+sep))throw new Error('非法输出路径');
    const entries=await readdir(input,{withFileTypes:true});
    for(const entry of entries){
      if(entry.isSymbolicLink())throw new Error('发布内容不能包含符号链接');
      const next=path+'/'+entry.name;
      if(entry.isDirectory()){await copy(next);continue;}
      if(!entry.isFile()||entry.name==='SOURCES.md'||(path==='public/assets/hero-gear'&&unusedHeroFiles.has(entry.name)))continue;
      await emit(next);
    }
  }
  async function emit(path){
    const input=resolve(root,path),target=resolve(destination,path);await mkdir(dirname(target),{recursive:true});
    if(['.html','.js','.css','.json','.svg'].includes(extname(path))){
      let text=await readFile(input,'utf8');
      if(path.endsWith('.json'))text=JSON.stringify(publicData(JSON.parse(text)));
      text=publicText(text,basePath);
      if(path==='src/runtime.js')text=`export const PUBLIC_BETA = true;\nexport const BASE_PATH = ${JSON.stringify(basePath)};\n`;
      if(path==='index.html')text=text.replace('<title>冬日账本 · 无尽冬日性价比模型</title>','<title>冬日账本 · 内测版</title>').replace('正在载入本地资料与库存…','正在载入内测版资料…');
      await writeFile(target,text);bytes+=Buffer.byteLength(text);
    }else{await copyFile(input,target);bytes+=(await readFile(input)).length;}
    files++;
  }
  await emit('index.html');await copy('src');await copy('public');
  await writeFile(resolve(destination,'.nojekyll'),'');
  const manifest={version:'1.9.0-beta.1',builtAt:new Date().toISOString(),basePath,files,bytes,storage:'browser-only',excludes:['storage','reference','reference-archive','artifacts','docs','personal backups']};
  await writeFile(resolve(destination,'release.json'),JSON.stringify(manifest,null,2));
  return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const supplied=process.argv.find(a=>a.startsWith('--base-path='))?.slice('--base-path='.length);
  const repo=process.env.GITHUB_REPOSITORY?.split('/')[1];
  const basePath=supplied??(repo&&!repo.endsWith('.github.io')?`/${repo}/`:'/');
  console.log(JSON.stringify(await buildPublic({basePath}),null,2));
}
