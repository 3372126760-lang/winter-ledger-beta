import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import data from '../src/data/planning.json' with {type:'json'};
import info from '../src/data/expert-board.json' with {type:'json'};
import {growthRecordsView} from '../src/ui/growth-records.js';
import {expertRelationAt,expertTalentAt,expertPathsForSelection} from '../src/domain/experts.js';
import {calculatePlan} from '../src/domain/planning.js';
const system=data.systems.find(s=>s.id==='experts');

test('专家各自等级与技能路径保持旧ID，头像与已匹配技能图标使用本地文件',async()=>{
 assert.equal(info.experts.length,11);
 const all=[];
 for(const expert of info.experts){
  assert.ok(expert.portrait);await access(new URL('..'+expert.portrait,import.meta.url));
  const paths=[expert.levelPath,expert.advancementPath,...expert.skills.map(s=>s.pathId)];
  assert.equal(paths.length,6);assert.ok(paths.every(id=>system.paths.some(p=>p.id===id)));
  all.push(...paths);
  for(const skill of expert.skills)if(skill.image)await access(new URL('..'+skill.image,import.meta.url));
 }
 assert.equal(new Set(all).size,system.paths.length);
});

test('选择单个专家只展示该专家编辑框，当前页无目标，全部原记录不修改',()=>{
 const state={battleProfile:{levels:{'expert-西里尔-relation':9,'expert-巴尔德-relation':20},planned:{'expert-西里尔-relation':20}},planning:{pathId:'expert-西里尔-skill-1'}};
 const before=structuredClone(state);
 const html=growthRecordsView(data,'experts',state,String);
 assert.equal((html.match(/data-expert-select=/g)||[]).length,11);
 assert.equal((html.match(/data-growth-record=/g)||[]).length,12);
 assert.ok(html.includes('data-growth-path="expert-西里尔-skill-1"'));
 assert.ok(!html.includes('data-growth-path="expert-巴尔德-relation"'));
 const current=growthRecordsView(data,'experts',state,String,{mode:'current'});
 assert.ok(!current.includes('data-growth-record="planned"'));
 assert.ok(!current.includes('data-expert-path='));
 assert.deepEqual(state,before);
});

test('关系与天赋按已有表提供参考，未知不假设已结识，切换不混合其他专家路径',()=>{
 const expert=info.experts.find(e=>e.name==='巴尔德');
 assert.equal(expertRelationAt(expert,undefined),null);
 assert.equal(expertRelationAt(expert,0),'萍水相逢');
 assert.equal(expertRelationAt(expert,1),'泛泛之交Ⅰ');
 assert.equal(expertTalentAt(expert.talents[0],undefined),null);
 assert.equal(expertTalentAt(expert.talents[0],10).talentLevel,2);
 const paths=expertPathsForSelection(system,system.paths.find(p=>p.id==='expert-西里尔-skill-1'));
 assert.equal(paths.length,6);assert.ok(paths.every(p=>p.name.startsWith('西里尔 · ')));
});

test('旧加雷斯独立记录仅在其页面保留，不自动迁移或覆盖好感度记录',()=>{
 const state={battleProfile:{levels:{gareth:12,'expert-加雷斯-relation':20},planned:{}},planning:{pathId:'expert-加雷斯-relation'}};
 const html=growthRecordsView(data,'experts',state,String);
 assert.ok(html.includes('data-growth-path="gareth"'));assert.ok(html.includes('旧记录单独保留'));
 assert.equal(state.battleProfile.levels['expert-加雷斯-relation'],20);
});

test('专家串用名称校正保留原ID和别名，技能效果不挪到其他路径',()=>{
 const cyrille=info.experts.find(e=>e.name==='西里尔'),skill=cyrille.skills[2];
 assert.equal(skill.pathId,'expert-西里尔-skill-3');assert.equal(skill.name,'武备专精');assert.equal(skill.originalName,'万金悬赏');assert.ok(skill.image);
 const path=system.paths.find(p=>p.id===skill.pathId);assert.equal(path.name,'西里尔 · 武备专精');assert.ok(path.rows[0].effect.includes('专精能源石'));
 assert.equal(info.experts.find(e=>e.name==='罗妮').talents[0].name,'商路掌控者');
});

test('凯西与Justus参考路线可测材料，印记和学识总量匹配来源，未核对状态保留',()=>{
 for(const [name,marks,books]of [['凯西',550,126000],['贾斯特斯',440,73500]]){
  const expert=info.experts.find(e=>e.name===name),relation=system.paths.find(p=>p.id===expert.levelPath);
  const result=calculatePlan(system.paths.find(p=>p.id===expert.advancementPath),0,10,1);
  assert.ok(!calculatePlan(relation,0,100,1).materials.some(m=>m.itemId==='expert-mark'));
  assert.equal(result.materials.find(m=>m.itemId==='expert-mark').needed,marks);
  assert.equal(result.ready,false);
  let total=0;
  for(const skill of expert.skills){const path=system.paths.find(p=>p.id===skill.pathId);total+=calculatePlan(path,0,path.rows.at(-1).level,1).materials.find(m=>m.itemId==='knowledge').needed;}
  assert.equal(total,books);assert.ok(expert.referenceStatus.includes('国服'));
 }
 const missing=system.paths.find(p=>p.id==='expert-Justus-skill-3');
 assert.ok(missing.rows.every(r=>r.effect.includes('当前级具体收益待核对')));
});


test('凯西国服名称采用官方百科，路径ID保持不变，贾斯特斯名称按用户确认更新且旧记录不变',()=>{
 const kathy=info.experts.find(e=>e.id==='凯西');
 assert.equal(kathy.source,'https://wjdrgl.wjdr.cn/experts/凯西/');
 assert.equal(kathy.talents[0].name,'燃霜之子');
 assert.deepEqual(kathy.skills.map(s=>s.name),['冰火游猎','霜风烈火','霜焰珍宝','效率开采']);
 for(const [i,skill]of kathy.skills.entries()){
  assert.equal(skill.pathId,`expert-凯西-skill-${i+1}`);
  assert.equal(system.paths.find(p=>p.id===skill.pathId).name,`凯西 · ${skill.name}`);
 }
 assert.ok(!kathy.referenceStatus.includes('开放条件'));
 const justus=info.experts.find(e=>e.id==='Justus');
 assert.equal(justus.name,'贾斯特斯');
 assert.equal(justus.levelPath,'expert-Justus-relation');
 assert.equal(expertPathsForSelection(system,system.paths.find(p=>p.id==='expert-Justus-skill-1')).length,6);
 const state={battleProfile:{levels:{'expert-Justus-relation':40},planned:{'expert-Justus-relation':60}},planning:{pathId:'expert-Justus-relation'}};
 const before=structuredClone(state),html=growthRecordsView(data,'experts',state,String);
 assert.ok(html.includes('贾斯特斯'));
 assert.ok(html.includes('data-growth-path="expert-Justus-relation"'));
 assert.deepEqual(state,before);
 assert.ok(justus.referenceStatus.includes('用户确认'));
 assert.ok(justus.referenceStatus.includes('数值待核对'));
});


test('贾斯特斯四个技能与天赋使用对应的本地图标',async()=>{
 const expert=info.experts.find(e=>e.id==='Justus');
 for(const [i,skill]of expert.skills.entries()){
  assert.equal(skill.image,`/public/assets/experts/justus-skill-${i+1}.png`);
  await access(new URL('..'+skill.image,import.meta.url));
 }
 assert.equal(expert.talents[0].image,'/public/assets/experts/justus-talent.png');
 await access(new URL('..'+expert.talents[0].image,import.meta.url));
});
