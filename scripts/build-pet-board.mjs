import {readFile,writeFile,mkdir} from 'node:fs/promises';
const verified=JSON.parse(await readFile('reference/research-2026-10-27/pets-verified.json','utf8'));
const db=await fetch('https://www.whiteoutsurvival-community.com/data/pets-db/en.json',{signal:AbortSignal.timeout(15000)}).then(r=>r.json());
await mkdir('public/assets/pets',{recursive:true});
const pets=[];
for(let start=0;start<verified.pets.length;start+=4)await Promise.all(verified.pets.slice(start,start+4).map(async p=>{
 const slug=p.localFile.replace('.html',''),h=await readFile('reference/research-2026-10-27/'+p.localFile,'utf8'),text=h.slice(h.indexOf('<main')).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 const key=slug==='snowscale-chameleon'?'frostscale_chameleon':slug.replaceAll('-','_'),entry=db[key],image='https://www.whiteoutsurvival-community.com/assets/pets/db/'+key+'.webp';if(!entry)throw Error('缺少代数 '+slug);
 const bytes=await fetch(image,{signal:AbortSignal.timeout(20000)}).then(r=>{if(!r.ok)throw Error('头像下载失败');return r.arrayBuffer();});await writeFile('public/assets/pets/'+slug+'.webp',Buffer.from(bytes));
 const stats={};for(const row of p.rows){const cells=row.effect.replaceAll(',','.').split(/\s+/).slice(0,2).map(s=>s.split('/').map(v=>Number(v.replace('%',''))));if(cells.length!==2||cells.flat().some(n=>!Number.isFinite(n)))continue;stats[row.level]={before:cells.map(v=>v[0]),after:cells.map(v=>v.at(-1))};}
 pets.push({id:'pet-detailed-'+slug,name:p.name,generation:entry.g,rarity:slug==='cave-hyena'?'white':entry.r==='common'?'green':entry.r==='rare'?'blue':entry.r==='sr'?'purple':'orange',maxLevel:p.rows.at(-1).level,maxRefinement:Number(text.match(/洗练属性上限：([\d.]+)/)[1]),unlock:text.match(/解锁条件：(.*?)。/)?.[1]||'',image:'/public/assets/pets/'+slug+'.webp',imageSource:image,source:p.url,stats});
}));
await writeFile('src/data/pet-board.json',JSON.stringify({asOf:'2026-10-29',generationSource:'https://www.whiteoutsurvival-community.com/tools/wiki/pets-db.html',colorNote:'洗炼颜色由玩家按游戏实际填写，数值分界待核对；宠物品质与洗炼品质分开。',pets:pets.sort((a,b)=>a.generation-b.generation||a.maxLevel-b.maxLevel)},null,2)+'\n');
console.log('宠物资料和头像：'+pets.length);
