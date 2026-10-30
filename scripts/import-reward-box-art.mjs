import fs from 'node:fs';
import crypto from 'node:crypto';
const root='reference/inventory-boxes-2026-10-30/';
const generated='C:/Users/33721/.codex/generated_images/01a1879b-01db-7120-9f8e-529799e32d56/';
const definitions=[
 ['fire-weekly-chest','火晶周卡宝箱','火晶','exec-a0363ec2-3890-4fa6-bfd1-fd5310d80c50.png'],
 ['mobilization-supply-chest','动员补给箱','宝箱','exec-653e32b9-de54-413f-86fa-ef8a131620f5.png'],
 ['seekers-chest','探寻者宝箱','宝箱','seekers-chest.png'],
 ['arena-star-chest','角斗之星宝箱','宝箱','arena-star-chest.png'],
 ['ironbark-chest','铁枝宝箱','宝箱','exec-92d4ceb9-668c-4fc8-ace3-4bfcd02437d8.png'],
 ['kingdom-light-chest','王国之光宝箱','宝箱','exec-cc580c1f-a320-4dc6-83ba-a6b498c76821.png'],
 ['elite-guard-chest','精英护卫宝箱','宝箱','exec-49db7147-36f1-4ad3-b48b-34fedc0e50e6.png'],
];
const manifest=JSON.parse(fs.readFileSync('src/data/item-art.json','utf8'));
const extra=JSON.parse(fs.readFileSync('src/data/item-art-extra.json','utf8'));
for(const [id,name,category,file]of definitions){
 const edited=file.startsWith('exec-'),sourceFile=root+(edited?id+'.png':file);
 if(id==='fire-weekly-chest')fs.copyFileSync('C:/Users/33721/AppData/Local/Temp/codex-clipboard-20be8e15-13a6-40d1-8d54-533b6cb933f4.png',sourceFile);
 if(edited&&!fs.existsSync(sourceFile))fs.copyFileSync(generated+file,sourceFile);
 const bytes=fs.readFileSync(sourceFile),sha=crypto.createHash('sha256').update(bytes).digest('hex');
 const localPath='/public/assets/items/'+sha.slice(0,24)+'.png';fs.writeFileSync('.'+localPath,bytes);
 const entry={id:'reward-box-'+id,name,category,sourceUrl:edited?'':'https://raw.githubusercontent.com/chiefpansancolt/whiteout-survival-data/main/images/items/'+file,sourceFile,localPath,sha256:sha,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),note:edited?'维护者截图经内置imagegen提取并移除库存数量、选中边框。':'公开游戏资料仓库物品原图；已与维护者截图核对。'};
 if(id==='fire-weekly-chest'){entry.sprite={x:92,y:301,width:42,height:42,hideQuantity:true};entry.note='直接显示维护者截图中的火晶周卡箱原始区域；CSS遮盖右下数量，箱体未重绘。';}
 for(const data of [manifest,extra]){data.entries=data.entries.filter(e=>e.name!==name);data.entries.push(entry);}
}
manifest.entryCount=manifest.entries.length;manifest.uniqueImageCount=new Set(manifest.entries.map(e=>e.localPath)).size;
for(const [file,data]of [['src/data/item-art.json',manifest],['src/data/item-art-extra.json',extra]])fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
