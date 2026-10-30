import fs from 'node:fs';
import crypto from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const catalog=read('src/data/catalog.json');
const categories={
 '领主宝石':['charm-guide','charm-design','codex','charm-random'],
 '领主装备':['polish','alloy','chief-design','amber','chief-box','chief-random'],
 '英雄装备':['screw','mastery-stone','mithril','orange-gear','equipment-box','equipment-choice-box','rare-gear','epic-gear'],
 '火晶':['fire-crystal','fire-particle','refined-fire-crystal','fire-crystal-box','fire-ember'],
 '英雄':['orange-shard','hero-component-choice','previous-hero-component','hero-song-choice','molly-shard','hero-xp','exploration-book','expedition-book','golden-key','heroic-proof','mystic-badge'],
};
for(const item of catalog.items){
 for(const [name,ids]of Object.entries(categories))if(ids.includes(item.id))item.category=name;
 if(item.id==='expert-mark'||item.expertSlug||item.affinityPoints||['affection','knowledge'].includes(item.id))item.category='专家';
 if(item.id==='screw'){item.aliases=[...new Set([...(item.aliases||[]),'强化经验零件','螺丝'])];item.name='100点强化经验零件';}
 if(item.id==='hero-component-choice')item.identityNote='按当前英雄代数显示专武箱；11代采用维护者截图去除数量后的贴图，其他代数保留现有图源。往届箱子在库存按代数独立记录，旧未分代库存保留。';
 if(item.id==='expert-sigil-justus')delete item.artNote;
}
for(let g=1;g<=14;g++)if(!catalog.items.some(i=>i.id===`hero-component-s${g}`))catalog.items.push({id:`hero-component-s${g}`,name:`第${g}代专武箱子`,unit:'个',priceScale:1,category:'英雄',prices:{},inventoryGeneration:g,artGeneration:g,unlock:{heroGeneration:g+1},identityNote:'往届专武箱按实际代数独立记录，不与当前代或其他代数库存合并；单价待核对。'});
write('src/data/catalog.json',catalog);
const manifest=read('src/data/item-art.json'),extra=read('src/data/item-art-extra.json');
const dir='C:/Users/33721/.codex/generated_images/01a1879b-01db-7120-9f8e-529799e32d56/';
for(const [file,name,g]of [['exec-920b59cb-82f7-4d53-9dff-d33b17b89a49.png','贾斯特斯印记',null],['exec-568f606c-4ebb-4e1e-9777-0e0acfb34d84.png','第11代英雄组件自选箱',11]]){
 const bytes=fs.readFileSync(dir+file),sha=crypto.createHash('sha256').update(bytes).digest('hex'),localPath='/public/assets/items/'+sha.slice(0,24)+'.png';
 fs.copyFileSync(dir+file,'.'+localPath);
 const entry={id:g?'owner-hero-widget-s11':'owner-justus-sigil',name,category:g?'英雄':'专家',sourceUrl:'',sourceFile:dir+file,localPath,sha256:sha,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),note:'维护者截图经 imagegen 提取并去除右下库存数量，保留物品图案与代数标识。',...(g?{modelItemId:'hero-component-choice',heroGeneration:g,representative:false,caption:'维护者提供的11代专武箱截图 · 已去除数量'}:{})};
 for(const data of [manifest,extra]){data.entries=data.entries.filter(e=>e.name!==name);data.entries.push(entry);}
}
manifest.entryCount=manifest.entries.length;manifest.uniqueImageCount=new Set(manifest.entries.map(e=>e.localPath)).size;
write('src/data/item-art.json',manifest);write('src/data/item-art-extra.json',extra);
