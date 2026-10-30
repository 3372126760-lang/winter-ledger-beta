import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('public/assets/chief/',root);
await mkdir(out,{recursive:true});
const jobs=[];
for(const slot of ['helmet','watch','chestplate','pants','ring','staff'])for(const quality of ['green','blue','purple','gold','red','t4-legendary'])jobs.push({key:`${slot}:${quality}`,file:`${slot}-${quality}.png`,url:`https://woscalc.com/images/gear/${slot}-${quality}.png`});
for(const troop of ['Lancer','Infantry','Marksman'])for(let level=1;level<=18;level++)jobs.push({key:`${troop}:${level}`,file:`${troop.toLowerCase()}-${level}.png`,url:`https://woscalc.com/images/charms/${troop}_${level}.png`});
const images={},failed=[];
for(let offset=0;offset<jobs.length;offset+=8){
 const batch=jobs.slice(offset,offset+8),results=await Promise.allSettled(batch.map(async job=>{
  const r=await fetch(job.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(String(r.status));
  const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length<100||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)throw new Error('非PNG图片');
  await writeFile(new URL(job.file,out),bytes);return {key:job.key,path:`/public/assets/chief/${job.file}`,sourceUrl:job.url};
 }));
 results.forEach((r,i)=>{if(r.status==='fulfilled')images[r.value.key]=r.value;else failed.push({...batch[i],reason:String(r.reason)});});
}
let maintained={};try{maintained=JSON.parse(await readFile(new URL('src/data/chief-art.json',root),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
for(const [key,record] of Object.entries(maintained.images||{}))if(record.source==='维护者游戏截图'||record.source==='维护者宝石图鉴截图')images[key]=record;
const unresolved=failed.filter(record=>!images[record.key]);
const manifest={asOf:'2026-10-26',sourceUrl:'https://woscalc.com/charms',gearSource:'https://woscalc.com/gear',mappingSource:'https://wjdrgl.wjdr.cn/chief-gear/chief-gear/',note:'独立装备与兵种宝石图。只引用公开静态图片，不执行外站脚本。缺失等级使用同兵种最高可用等级代表图并在界面说明；神话T5以上不用外站标为placeholder的图。',images,failed:unresolved};
await writeFile(new URL('src/data/chief-art.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({saved:Object.keys(images).length,failed:failed.map(j=>({key:j.key,reason:j.reason}))}));
