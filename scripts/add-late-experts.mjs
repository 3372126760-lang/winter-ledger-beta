import {splitExpertAdvancements} from '../src/domain/expert-advancement.js';
import {readFile,writeFile} from 'node:fs/promises';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [upstream,data,board,tree]=await Promise.all(['reference/expert-ui-2026-10-29/upstream-experts.json','src/data/planning.json','src/data/expert-board.json','reference/expert-ui-2026-10-29/wiki-source-tree.json'].map(read));
const sourceId='experts-late-community-2026-10-29';
const sourceInfo={id:sourceId,title:'专家新增资料 · 凯西与贾斯特斯（国际服社区参考）',url:'https://github.com/chiefpansancolt/whiteout-survival-data/blob/main/data/chief/experts.json',status:`2026-10-29读取；仓库树${tree.sha}。国际服社区整理，凯西中文名称与技能效果已对照国服官方百科；逐级消耗保留社区参考，贾斯特斯中文名由用户确认。`};
const sourceIndex=data.sources.findIndex(s=>s.id===sourceId);
if(sourceIndex<0)data.sources.push(sourceInfo);else data.sources[sourceIndex]=sourceInfo;
const cnSource={id:'expert-kathy-cn-official-2026-10-29',title:'国服官方百科 · 凯西',url:'https://wjdrgl.wjdr.cn/experts/凯西/',status:'中文名称、技能名称及效果表已对照；存档reference/expert-cn-2026-10-29/kathy-official.html。逐级消耗暂保留参考标记。'};
if(!data.sources.some(s=>s.id===cnSource.id))data.sources.push(cnSource);
const system=data.systems.find(s=>s.id==='experts');
const relations=['泛泛之交Ⅰ','泛泛之交Ⅱ','泛泛之交Ⅲ','志趣相投Ⅰ','志趣相投Ⅱ','志趣相投Ⅲ','推心置腹Ⅰ','推心置腹Ⅱ','推心置腹Ⅲ','莫逆于心'];
const labels={'Extra XP':'矿场巡逻兵额外经验','Deployment Capacity':'燃霜矿区额外出征容量','Rapid Recovery':'战败后恢复时间缩短','Item Gain':'额外道具数量','Income Per Minute':'每分钟额外奥利哈钢','Troop Lethality':'燃霜矿区部队穿透力','Troop Health':'燃霜矿区部队生命值','Glowstones from Labyrinth Raids':'地下迷宫扫荡辉光石增加','Double Reward Chance':'宠物寻宝双倍奖励概率'};
const percent=new Set(['Extra XP','Rapid Recovery','Troop Lethality','Troop Health','Glowstones from Labyrinth Raids','Double Reward Chance']);
const configs=[{id:'kathy',name:'凯西',source:'https://wjdrgl.wjdr.cn/experts/凯西/',names:['冰火游猎','霜风烈火','霜焰珍宝','效率开采'],talent:'燃霜之子',scope:['燃霜矿区：击败矿场巡逻兵时生效','燃霜矿区：出征容量及战败后恢复','燃霜矿区：获得20万奥利哈钢后额外获得宝石图纸','燃霜矿区：每分钟获得奥利哈钢；获得20万后额外获得宝石手册']},{id:'justus',name:'贾斯特斯',recordId:'Justus',localImages:true,source:'https://wostools.net/wiki/experts/justus',names:['Glorious Gains','Treasure Seeker','Master Diplomat','Fortune Wayfarer'],talent:'Former Glory',scope:['地下迷宫扫荡','宠物寻宝；额外次数的逐级变化待核对','巨兽集结：每次获得王朝荣耀箱的具体逐级数量待补','专家游历：触发间隔与箱子数量的具体逐级变化待补']}];
for(const config of configs){
 const expert=upstream.find(e=>e.id===config.id),id=config.recordId||config.name;
 const milestones=expert.affinityLevels.filter(r=>r.advancementCost!==undefined).map(r=>({afterLevel:r.level,mark:r.advancementCost,relation:relations[r.level/10-1]}));
 const prefix=`expert-${id}`,levelPath=prefix+'-relation';
 const prerequisiteNote=(config.id==='kathy'?'中文名称与技能效果已对照国服官方百科；逐级消耗保留参考标记。':'国服已上线，中文名贾斯特斯（用户确认）；数值待核对。')+'当前材料不自动连锁加入其他技能与关系前置。';
 const relationRows=expert.affinityLevels.map(r=>({level:r.level,label:r.level+'级'+(r.advancementCost?' · '+relations[r.level/10-1]:''),cost:{affection:r.affinityRequired,...(r.advancementCost?{'expert-mark':r.advancementCost}:{})},resources:{},timeHours:null,attributes:[],effect:r.statBonus!==undefined?`来源好感度参考：部队穿透力、生命值各${r.statBonus}%（突破口径待核对）`:'当前级常驻属性数据待核对',expertReference:true}));
 const paths=[{id:levelPath,name:config.name+' · 等级与关系',source:sourceId,unitLabel:'级',maxPieces:1,costStatus:'unverified',baseline:{level:0,label:'未结识',attributes:[]},coverage:config.id==='kathy'?'0—100级好感度与关系印记；官方中文资料已找到，消耗待实机核对':'国际服社区参考：0—100级好感度与关系印记；国服数值待核对',prerequisiteNote,rows:relationRows}];
 const skillMeta=[];
 for(const [index,skill]of expert.skills.entries()){
  const name=config.names[index],pathId=prefix+'-skill-'+(index+1);
  const rows=skill.costs.map(r=>{
   const progress=(skill.progressions||[]).filter(p=>p.label!=='Power'&&p.values[r.level-1]!==undefined).map(p=>(labels[p.label]||p.label)+'+'+p.values[r.level-1]+(percent.has(p.label)?'%':''));
   const requirements=[...(skill.affinityRequirements||[]).filter(q=>q.level<=r.level).slice(-1).map(q=>'好感度'+q.affinityLevel+'级'),...(skill.totalSkillRequirements||[]).filter(q=>q.level<=r.level).slice(-1).map(q=>'四项技能总等级'+q.totalSkillLevel)];
   return {level:r.level,label:r.level+'级',cost:{...(r.books?{knowledge:r.books}:{})},resources:r.exp?{'专家技能经验':r.exp}:{},timeHours:null,attributes:[],effect:config.scope[index]+(progress.length?'；'+progress.join('；'):'；当前级具体收益待核对')+(requirements.length?'；前置：'+requirements.join('、'):''),expertReference:true};
  });
  paths.push({id:pathId,name:config.name+' · '+name,source:sourceId,unitLabel:'级',maxPieces:1,costStatus:'unverified',baseline:{level:0,label:'未解锁',attributes:[]},coverage:config.id==='kathy'?`国服百科已对照${skill.maxLevel}级技能收益；消耗待实机核对`:`国际服社区参考：${skill.maxLevel}级技能；国服数值待核对`,prerequisiteNote,rows});
  skillMeta.push({name,englishName:skill.name,type:'skill',pathId,image:(skill.img||config.localImages)?`/public/assets/experts/${config.id}-skill-${index+1}.png`:null});
 }
 const talent=expert.talent;
 const talentLevels=Array.from({length:11},(_,i)=>({level:i?i*10:1,talentLevel:i+1,description:(talent.progressions||[]).filter(p=>p.label!=='Power'&&p.values[i]!==undefined).map(p=>(labels[p.label]||p.label)+'+'+p.values[i]+(percent.has(p.label)?'%':'')).join('；')}));
 const metadata={id,name:config.name,slug:config.id,portrait:`/public/assets/experts/${config.id}-avatar.png`,source:config.source,statLabel:config.id==='kathy'?'部队穿透力 部队生命值':'常驻属性逐级值待核对',levelPath,milestones,talents:[{name:config.talent,type:'talent',image:(talent.img||config.localImages)?`/public/assets/experts/${config.id}-talent.png`:null,levels:talentLevels}],skills:skillMeta,referenceIcons:[],maxLevel:100,referenceStatus:config.id==='kathy'?'国服中文资料已对照 · 逐级消耗待实机核对':'国服中文名已由用户确认 · 数值待核对',englishName:expert.name};
 for(const path of paths){const i=system.paths.findIndex(p=>p.id===path.id);if(i<0)system.paths.push(path);else system.paths[i]=path;}
 const i=board.experts.findIndex(e=>e.id===id);if(i<0)board.experts.push(metadata);else board.experts[i]=metadata;
 console.log(id,paths.length+'条路径',expert.affinityLevels.reduce((n,r)=>n+(r.advancementCost||0),0)+'印记',expert.skills.reduce((n,s)=>n+s.costs.reduce((n,r)=>n+r.books,0),0)+'学识之书');
}
splitExpertAdvancements(data,board);
for(const [file,value]of [['src/data/planning.json',data],['src/data/expert-board.json',board]])await writeFile(new URL('../'+file,import.meta.url),JSON.stringify(value,null,2)+'\n');
