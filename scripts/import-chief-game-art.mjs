import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),target=new URL('public/evidence/chief-icons/',root);
await mkdir(target,{recursive:true});
const file=new URL('src/data/chief-art.json',root),manifest=JSON.parse(await readFile(file,'utf8'));
// Keep original screenshots intact. The interface displays these exact regions
// with CSS clipping; no image generation or pixel edits are involved.
const slots=['helmet','watch','chestplate','pants','ring','staff'];
const entries=[
 ['4d99a688-405a-4b03-9a72-1a336f795370',5,'helmet',31,470],
 ['36167df1-1014-4f14-bd51-ee9d54e7bfb2',5,'watch',77,470],
 ['bf30714e-8041-4b31-9fde-37d487d17e5d',5,'chestplate',134,470],
 ['657abb57-9c18-4eba-8e88-b1233e974e60',5,'pants',31,248],
 ['056e9e6d-02aa-4354-a4e4-701e04228e09',5,'ring',77,248],
 ['fd914a68-a9c8-4105-8703-462e13dd9b93',5,'staff',134,248],
 ['dc4d00e9-cfe4-41d4-91d2-e4d8e5ba8892',6,'helmet',31,340],
 ['a8020c4f-02ed-4f1c-bbb8-ce3259699ea4',6,'watch',77,340],
 ['0f8a1d02-65d8-45b0-aae8-138138d2d2ea',6,'chestplate',134,340],
 ['2359d5cf-cb84-45dd-968f-2a431cb976cd',6,'pants',31,444],
 ['ae99356b-a4a0-4be3-89df-fe72afa573c1',6,'ring',77,444],
 ['ae07baf7-4665-40d4-bba5-913c90f951e0',6,'staff',134,444],
];
const gameNames={helmet:'极光使者',watch:'时光棱镜',chestplate:'星辰咏叹',pants:'幻夜舞曲',ring:'永夜印记',staff:'凛冬之心'};
for(const [id,tier,slot,x,y] of entries){
 const name=`${slot}-tier-${tier}.png`,key=`${slot}:t${tier}`;
 await copyFile(`C:/Users/33721/AppData/Local/Temp/codex-clipboard-${id}.png`,new URL(name,target));
 manifest.images[key]={key,path:`/public/evidence/chief-icons/${name}`,source:'维护者游戏截图',sourceId:id,bakedTier:tier,gameName:gameNames[slot],region:{x:x-1,y:y-1,width:72,height:72,imageWidth:489,imageHeight:871}};
}
const gemId='1a510a78-a417-4722-b5b2-c9884fe99c14';
await copyFile(`C:/Users/33721/AppData/Local/Temp/codex-clipboard-${gemId}.png`,new URL('gem-atlas.png',target));
for(const [troop,cx] of [['Infantry',205],['Lancer',293],['Marksman',381]])for(const [level,cy] of [[13,259],[14,355],[15,451],[16,548],[17,645],[18,742]]){
 const key=`${troop}:${level}`;
 manifest.images[key]={key,path:'/public/evidence/chief-icons/gem-atlas.png',source:'维护者宝石图鉴截图',sourceId:gemId,region:{x:cx-35,y:cy-35,width:70,height:70,imageWidth:528,imageHeight:905}};
}
manifest.failed=manifest.failed.filter(f=>!manifest.images[f.key]);
manifest.note='五阶/六阶及13—18级宝石采用维护者游戏截图原图区域，其余采用已保存独立贴图；阶星由档位文字解析显示，截图原件不作像素编辑。';
await writeFile(file,JSON.stringify(manifest,null,2)+'\n');
const evidence={asOf:'2026-10-26',source:'维护者提供的装备图鉴、宝石图鉴截图',gearSamples:[{name:'神话2星',attack:97.75,defense:97.75,capacity:120,power:2346000},{name:'神话T2-3星',attack:136,defense:136,capacity:660,power:3264000},{name:'神话T5',attack:195.5,defense:195.5,capacity:1340,power:4692000},{name:'神话T6',attack:229.5,defense:229.5,capacity:1630,power:5508000}],gemConfirmation:{level:16,health:100,lethality:100,note:'维护者明确每颗16级宝石同时增加对应兵种穿透100%、生命100%。'},names:gameNames};
await writeFile(new URL('src/data/chief-game-evidence.json',root),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({gearSprites:entries.length,gemSprites:18,missing:manifest.failed.length,slots}));
