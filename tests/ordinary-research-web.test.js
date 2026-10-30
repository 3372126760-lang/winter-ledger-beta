import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {calculatePlan} from '../src/domain/planning.js';
import {ordinaryResearchPaths,ordinaryResearchControls,ordinaryResearchDetails} from '../src/ui/ordinary-research.js';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const data=await read('src/data/planning.json'),system=data.systems.find(s=>s.id==='research'),battle=system.paths.filter(p=>p.researchTree==='battle');
const archiveAvailable=existsSync(new URL('../reference/research-2026-10-28/battle-research.json',import.meta.url));
const imported=archiveAvailable?await read('reference/research-2026-10-28/battle-research.json'):null;
const {items}=await read('src/data/catalog.json');
const context={items,stage:'gen7-fc10-gen8',progress:{heroGeneration:11,fireProgress:'fc10'},inventory:{steel:1000}};
const path=name=>battle.find(p=>p.name===name);
test('战斗科技收录17类的全部1—6阶段，459个等级无断档，0级均可起算',()=>{
 assert.equal(battle.length,102);assert.equal(battle.reduce((n,p)=>n+p.rows.length,0),459);
 assert.deepEqual([...new Set(battle.map(p=>p.researchTier))],[1,2,3,4,5,6]);
 for(let tier=1;tier<=6;tier++){
  const rows=battle.filter(p=>p.researchTier===tier);assert.equal(rows.length,17);
  assert.equal(new Set(rows.map(p=>p.name.replace(/\d+$/,''))).size,17);
 }
 for(const p of battle){
  assert.equal(p.baseline.level,0);assert.equal(p.baseline.attributes[0].value,0);
  assert.deepEqual(p.rows.map(r=>r.level),Array.from({length:p.rows.length},(_,i)=>i+1));
  const source=data.sources.find(s=>s.id===p.source);assert.match(source.url,/^https:\/\/www\.whiteoutsurvival\.wiki\/research\//);
  assert.ok(p.rows.every(r=>r.cost.steel>0&&Object.keys(r.resources).length===4&&r.prerequisitesRaw));
  assert.ok(p.rows.every(r=>!Object.keys(r.cost).some(k=>k.includes('fire')||k.includes('refined'))));
 }
});
test('官方每级新增属性正确累加，跨级只计算目标减当前，不重复累加累计值',()=>{
 const p=path('武器特训1'),original=structuredClone(context);
 assert.deepEqual(p.rows.map(r=>r.attributes[0].value),[0.5,1,1.5]);
 const full=calculatePlan(p,0,3,1,context);
 assert.equal(full.materials[0].needed,2740);assert.equal(full.materials[0].gap,1740);
 assert.equal(full.timeHours,19/60);assert.equal(full.attributes[0].delta,1.5);
 assert.equal(full.resources.find(r=>r.name==='生肉').quantity,46700);
 assert.equal(full.fullValue,full.partialValue);assert.equal(full.ready,true);assert.ok(full.partialValue>0);
 const partial=calculatePlan(p,1,2,1,context);assert.equal(partial.attributes[0].delta,0.5);assert.equal(partial.materials[0].needed,720);
 assert.deepEqual(context,original);
 assert.equal(calculatePlan(path('编制扩展1'),0,3,1,context).attributes[0].delta,1000);
});
test('三兵种及全体攻击防御生命穿透分别保留，六阶段已有选择ID保持兼容',()=>{
 const expected={'稳守反击1':['infantry','attack'],'迅猛突刺1':['lancer','attack'],'精准射击1':['marksman','attack'],'防御阵型1':['infantry','defense'],'警戒队形1':['marksman','defense'],'坚守阵地1':['lancer','defense'],'不懈奋战1':['infantry','lethality'],'长矛改良1':['lancer','lethality'],'定点狙击1':['marksman','lethality'],'盾牌改良1':['infantry','health'],'矛兵护甲1':['lancer','health'],'射手护甲1':['marksman','health'],'生存特训1':['all','health'],'突击特训1':['all','lethality']};
 for(const [name,[troop,metric]] of Object.entries(expected)){const p=path(name);assert.equal(p.troopId,troop);assert.equal(p.metric,metric);assert.equal(p.rows[0].attributes[0].key,`research.${troop}.${metric}`);}
 assert.equal(path('武器特训6').id,'ordinary-research-1');assert.equal(path('矛兵护甲6').id,'ordinary-research-17');
 assert.equal(system.paths.filter(p=>p.researchTree==='growth').length,6);
 assert.equal(calculatePlan(path('武器特训6'),1,2,1,context).attributes[0].delta,2.25);
});
test('459个累计交叉核对值保留，来源错误工期和前置名称不擅自补造',{skip:!archiveAvailable},()=>{
 assert.equal(imported.checks.length,459);
 for(const check of imported.checks){const p=battle.find(p=>p.englishName===check.name);assert.equal(p.rows.find(r=>r.level===check.level).attributes[0].value,check.cumulative);}
 const unknown=battle.flatMap(p=>p.rows.filter(r=>r.timeHours===null).map(r=>({p,r})));assert.equal(unknown.length,2);
 for(const {p,r} of unknown){assert.equal(r.timeRaw,'08:53::20');assert.equal(calculatePlan(p,0,1,1,context).timeHours,null);}
 assert.match(path('长矛改良1').rows[0].prerequisites,/Survival Expansion/);
});
test('归档102份官方表哈希可校验',{skip:!archiveAvailable},async()=>{
 const manifest=await read('reference/research-2026-10-28/battle-manifest.json');assert.equal(manifest.entries.length,102);
 for(const entry of manifest.entries){const html=await readFile(new URL('../reference/research-2026-10-28/'+entry.file,import.meta.url));assert.equal(createHash('sha256').update(html).digest('hex'),entry.sha256);}
});
test('网页筛选各阶段17项并保留发展旧资料',()=>{
 const esc=String,options=(list,value)=>list.map(([id,name])=>id+':'+name+(id===value?'*':'')).join('|');
 for(let t=1;t<=6;t++){const p=path('武器特训'+t);assert.equal(ordinaryResearchPaths(system,p).length,17);assert.match(ordinaryResearchControls(system,p,{esc,options}),/第1阶段/);}
 const html=ordinaryResearchDetails(path('武器特训1'),0,2,{esc,fmt:String});assert.match(html,/解锁条件/);assert.match(html,/本阶段累计/);assert.equal((html.match(/class="research-selected"/g)||[]).length,2);
 assert.equal(ordinaryResearchDetails(system.paths.find(p=>p.researchTree==='growth'),0,1,{esc,fmt:String}),'');
});
