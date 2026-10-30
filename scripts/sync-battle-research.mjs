import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),directory=new URL('reference/research-2026-10-28/',root);
await mkdir(directory,{recursive:true});
const links=JSON.parse(await readFile(new URL('battle-links.json',directory),'utf8'));
let cursor=0,finished=0;
const manifest=[];
async function worker(){
 while(cursor<links.length){
  const entry=links[cursor++],file=entry.url.split('/').filter(Boolean).at(-1)+'.html';let html;
  try{html=await readFile(new URL(file,directory),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!html){for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(entry.url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('HTTP '+response.status);html=await response.text();if(!html.includes('<table'))throw new Error('没有资料表');await writeFile(new URL(file,directory),html);break;}catch(error){if(attempt===2)throw new Error(entry.url+' '+error.message);}}}
  manifest.push({...entry,file,sha256:createHash('sha256').update(html).digest('hex')});
  finished++;if(finished%17===0)console.log('已保存 '+finished+'/'+links.length+' 份战斗科技表');
 }
}
await Promise.all([worker(),worker(),worker(),worker()]);
manifest.sort((a,b)=>links.findIndex(l=>l.url===a.url)-links.findIndex(l=>l.url===b.url));
await writeFile(new URL('battle-manifest.json',directory),JSON.stringify({asOf:'2026-10-28',indexUrl:'https://www.whiteoutsurvival.wiki/research/',entries:manifest},null,2)+'\n');
console.log('完成 '+manifest.length+' 份');
