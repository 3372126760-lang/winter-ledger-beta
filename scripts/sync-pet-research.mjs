import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const directory=new URL('../reference/research-2026-10-27/',import.meta.url);
await mkdir(directory,{recursive:true});
const pets=[['洞斑鬣狗','cave-hyena'],['麝牛','musk-ox'],['北极狼','arctic-wolf'],['泰坦巨鸟','titan-roc'],['巨貘','giant-tapir'],['雪豹','snow-leopard'],['大角鹿','giant-elk'],['冰霜古猿','frost-gorilla'],['霜鳞避役','snowscale-chameleon'],['猛犸象','mammoth'],['剑齿虎','saber-tooth-tiger'],['板齿犀','iron-rhino'],['雪猿','snow-ape'],['穴狮','cave-lion']];
const index=await fetch('https://wosgift.com/zh-cn/pets/',{signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw new Error('宠物目录读取失败');return r.text();});
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const links=[...index.matchAll(/<a\b[^>]*href="(\/zh-cn\/pets\/[^"/]+\/)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({url:'https://wosgift.com'+m[1],text:clean(m[2])}));
const raw=JSON.parse(await readFile(new URL('../reference/planning-web-2026-10-26/extracted.json',import.meta.url),'utf8'));
const results=[];
for(let start=0;start<pets.length;start+=4){
 const batch=await Promise.all(pets.slice(start,start+4).map(async([name,slug])=>{
  const link=links.find(l=>l.text.startsWith(name));if(!link)throw new Error('宠物目录缺少：'+name);
  const response=await fetch(link.url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(name+'网页读取失败');
  const html=await response.text();await writeFile(new URL(slug+'.html',directory),html);
  const table=html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];if(!table)throw new Error(name+'无等级表');
  const rows=[...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(match=>{
   const cells=[...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>clean(m[1]));
   if(cells.length!==5)throw new Error(name+'表列发生变化');
   const level=Number(cells[0]),food=cells[1]==='—'?0:Number(cells[1].replace(/,/g,''));
   if(!Number.isInteger(level)||!Number.isFinite(food)||food<0)throw new Error(name+'等级或口粮无效');
   const breakthrough=cells[2]==='—'?[]:cells[2].split(' ').map(Number);
   if(breakthrough.length>3||breakthrough.some(v=>!Number.isFinite(v)||v<0))throw new Error(name+'突破材料格式变化');
   return {level,food,breakthrough,effect:cells[3],powerText:cells[4]};
  });
  if(!rows.length||rows.some((r,i)=>r.level!==i+1))throw new Error(name+'等级不连续');
  // Independent tables agree on ten-level food blocks and breakthrough counts.
  // This establishes that the old food checkpoints are interval costs, not totals.
  const modelName=name==='穴狮'?'洞狮':name;
  const group=raw.PET_GROUPS.find(g=>g.pets.includes(modelName));if(!group)throw new Error(name+'原分组不存在');
  const checks=[];
  for(const checkpoint of group.rows){
   const r=rows.find(r=>r.level===checkpoint.level);if(!r)throw new Error(name+'缺检查点');
   const sum=rows.filter(r=>r.level>checkpoint.level-10&&r.level<=checkpoint.level).reduce((n,r)=>n+r.food,0);
   const number=n=>Number(String(n||'').replace(/,/g,''))||0;
   const expected=[checkpoint.book,checkpoint.potion,checkpoint.serum].map(number);
   const actual=r.breakthrough.map(Number);
   const consistent=sum===number(checkpoint.feed)&&expected.every((n,i)=>n===(actual[i]||0));
   checks.push({level:r.level,foodBlock:sum,toolboxFood:number(checkpoint.feed),breakthrough:actual,toolboxBreakthrough:expected,consistent});
  }
  return {name,modelName,url:link.url,localFile:slug+'.html',sha256:createHash('sha256').update(html).digest('hex'),rows,checks};
 }));results.push(...batch);
}
await writeFile(new URL('pets-verified.json',directory),JSON.stringify({asOf:'2026-10-27',costConvention:'逐级口粮；逢十级突破材料；每十级区间与冬日工具箱交叉核对',pets:results},null,2)+'\n');
console.log(JSON.stringify(results.map(p=>({name:p.name,rows:p.rows.length,checks:p.checks.length,conflicts:p.checks.filter(c=>!c.consistent)})),null,2));
