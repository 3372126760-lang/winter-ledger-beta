import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const data=await read('src/data/planning.json'),index=await read('reference/research-layout-2026-10-28/wiki-index-art.json');
const nodes=[],edges=[],assets=new Map();
const imageOf=entry=>{
 if(!entry?.image)return null;
 const filename=entry.image.split('/').at(-1),local='/public/research-icons/'+filename;
 assets.set(entry.image,{url:entry.image,local,file:filename,source:entry.url});return local;
};
const iconByName=name=>imageOf(index.find(e=>e.name===name));
const iconByFile=file=>imageOf(index.find(e=>e.image?.split('/').at(-1)===file));
const add=(id,pathId,x,y,extras={})=>{const p=data.systems.flatMap(s=>s.paths).find(p=>p.id===pathId);if(!p)throw Error('路径不存在 '+pathId);const node={id,pathId,name:p.name,x,y,max:p.rows.at(-1).level,...extras};nodes.push(node);return node;};
const connect=(a,b,type='tree')=>edges.push({from:a,to:b,type});
const battle=data.systems.find(s=>s.id==='research').paths.filter(p=>p.researchTree==='battle');
const family=['武器特训','稳守反击','精准射击','迅猛突刺','防御阵型','警戒队形','坚守阵地','防御特训','生存特训','突击特训','编制扩展','不懈奋战','定点狙击','长矛改良','盾牌改良','射手护甲','矛兵护甲'];
const slots=[[300,80],[90,220],[300,220],[510,220],[90,360],[300,360],[510,360],[300,500],[90,640],[510,640],[300,780],[90,920],[300,920],[510,920],[90,1060],[300,1060],[510,1060]];
for(let tier=1;tier<=6;tier++){
 const ids=[];for(let i=0;i<family.length;i++){const p=battle.find(p=>p.name===family[i]+tier),[x,y]=slots[i];const n=add('battle-'+tier+'-'+i,p.id,x,y+30+(tier-1)*1200,{systemId:'research',tier,icon:iconByName(p.englishName)});ids.push(n.id);}
 for(const [a,b] of [[0,1],[0,2],[0,3],[1,4],[2,5],[3,6],[4,7],[5,7],[6,7],[7,8],[7,9],[8,10],[9,10],[10,11],[10,12],[10,13],[11,14],[12,15],[13,16]])connect(ids[a],ids[b]);
 if(tier>1)for(const i of [14,15,16])connect('battle-'+(tier-1)+'-'+i,ids[0],'stage');
}
const troops=[{id:'marksman',name:'射手',color:'#efa442',iconPrefix:9000,dx:0,dy:-1},{id:'infantry',name:'盾兵',color:'#64c775',iconPrefix:7000,dx:1,dy:0},{id:'lancer',name:'矛兵',color:'#55baf0',iconPrefix:8000,dx:0,dy:1}];
// These ten paths are a shared material template in the original toolbox.
// A troop selection identifies the displayed branch, never a recorded level.
const t11Role=[['烈焰战队','容量'],['怒焰猛击','穿透'],['怒焰坚盾','生命'],['烈焰军团','集结容量'],['怒焰战斧','攻击'],['怒焰护佑','防御'],['烈日兵','烈日士兵'],['T11急救','急救'],['T11治疗','治疗'],['T11训练','训练']];
const iconOrder=[1,2,3,6,4,5,7,9,8,10];
const localPositions=[[0,200],[-140,365],[140,365],[0,520],[-205,610],[205,610],[0,790],[170,990],[-170,990],[0,1060]];
const rootPoint={x:1150,y:1250};
for(const troop of troops){
 const ids=[];
 for(let i=0;i<t11Role.length;i++){
  const [name,role]=t11Role[i],p=data.systems.find(s=>s.id==='t11').paths.find(p=>p.name===name),[across,forward]=localPositions[i];
  const x=rootPoint.x+troop.dx*forward+(troop.dy!==0?across:0),y=rootPoint.y+troop.dy*forward+(troop.dx!==0?across:0);
  const n=add('t11-'+troop.id+'-'+i,p.id,x,y,{systemId:'t11',troopId:troop.id,color:troop.color,role,name:troop.id==='infantry'?p.name:`${troop.name}${role}`,icon:iconByFile('science_icon_'+(troop.iconPrefix+iconOrder[i])+'.png')});ids.push(n.id);
 }
 for(const [a,b] of [[0,1],[0,2],[1,3],[2,3],[1,4],[2,5],[3,6],[4,6],[5,6],[6,7],[6,8],[6,9]])connect(ids[a],ids[b]);
 edges.push({from:'t11-core',to:ids[0],type:'root'});
}
const t12Troops=[{id:'infantry',suffix:'shield',prefix:10000,name:'煌耀盾兵'},{id:'lancer',suffix:'lancer',prefix:11000,name:'煌耀矛兵'},{id:'marksman',suffix:'marksman',prefix:12000,name:'煌耀射手'}];
for(const troop of t12Troops){
 const paths=data.systems.find(s=>s.id==='t12').paths.filter(p=>p.id.endsWith('-'+troop.suffix)),ids=[];
 const places=[[60,95],[180,95],[300,95],[420,95],[540,95],[300,330],[60,635],[220,635],[380,635],[540,635],[300,830],[60,1020],[220,1020],[380,1020],[540,1020],[300,1220],[60,1420],[220,1420],[380,1420],[540,1420]];
 for(let i=0;i<paths.length;i++){
  const p=paths[i],[x,y]=places[i],name=p.name.split(' · ')[1];let icon=null;
  if(i<5){const number=[1,2,5,3,4][i];icon=iconByFile(`refine_icon_${troop.prefix+number}-150x150.png`);}
  else if(i!==5){const number=([6,11,16].includes(i)?2:[7,12,17].includes(i)?4:[8,13,18].includes(i)?5:[9,14,19].includes(i)?3:i===10?11:1);icon=iconByFile(`science_icon_${troop.prefix+number}.png`);}
  const node=add('t12-'+troop.id+'-'+i,p.id,x,y,{systemId:'t12',troopId:troop.id,name,icon,unit:i===5,equipment:i<5,stage:i<5?'equipment':i===5?'unlock':i<=9?'I':i===10?'skill-I':i<=14?'II':i===15?'skill-II':'III'});ids.push(node.id);
 }
 for(let i=0;i<5;i++)connect(ids[i],ids[5],'equipment');
 for(let i=6;i<=9;i++){connect(ids[5],ids[i]);connect(ids[i],ids[10]);}
 for(let i=11;i<=14;i++){connect(ids[10],ids[i]);connect(ids[i],ids[15]);}
 for(let i=16;i<=19;i++)connect(ids[15],ids[i]);
}
await mkdir(new URL('public/research-icons/',root),{recursive:true});
let cursor=0;const downloads=[...assets.values()],failed=[];
async function download(){while(cursor<downloads.length){const a=downloads[cursor++];let bytes;try{bytes=await readFile(new URL('public/research-icons/'+a.file,root));}catch{}
 if(!bytes){try{const r=await fetch(a.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(r.status);bytes=Buffer.from(await r.arrayBuffer());if(!r.headers.get('content-type')?.startsWith('image/'))throw Error('并非图片');await writeFile(new URL('public/research-icons/'+a.file,root),bytes);}catch(e){failed.push({url:a.url,error:e.message});continue;}}
 a.sha256=createHash('sha256').update(bytes).digest('hex');}}
await Promise.all([download(),download(),download(),download()]);
if(failed.length)throw Error('贴图下载失败 '+JSON.stringify(failed));
const itemArt=await read('src/data/item-art.json');
for(const n of nodes)if(n.systemId==='t12'){if(n.equipment){n.x=300+(n.x-300)*.9;n.y=80;}else n.y-=100;}
const output={asOf:'2026-10-28',nodes,edges,t11Core:{id:'t11-core',...rootPoint,icon:itemArt.entries.find(e=>e.name==='火晶微粒')?.localPath||null},sizes:{research:{width:600,height:7200},t11:{width:2400,height:2450},t12:{width:600,height:1460}},troops,sources:[
 {title:'研究所实机截图',url:'https://ameblo.jp/luidasbar/entry-12884094031.html',local:'reference/research-layout-2026-10-28/battle-game.png'},
 {title:'T11实机截图',url:'https://www.bluestacks.com/blog/game-guides/white-out-survival/wos-troops-upgrade-guide-en.html',local:'reference/research-layout-2026-10-28/t11-game.webp'},
 {title:'T12实机截图',url:'https://ameblo.jp/luidasbar/entry-12964485630.html',local:'reference/research-layout-2026-10-28/t12-game.png'},
 {title:'官方Wiki科技图标',url:'https://www.whiteoutsurvival.wiki/research/'}],assets:downloads};
await writeFile(new URL('src/data/research-trees.json',root),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({nodes:nodes.length,edges:edges.length,images:downloads.length}));
