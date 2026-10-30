import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/planning.json' with {type:'json'};
import board from '../src/data/expert-board.json' with {type:'json'};
import {splitExpertAdvancements,expertAdvancementState} from '../src/domain/expert-advancement.js';
import {calculatePlan} from '../src/domain/planning.js';
import {growthRecordsView} from '../src/ui/growth-records.js';
import {validateBattleProfile} from '../src/domain/battle-profile.js';
const system=data.systems.find(s=>s.id==='experts');

test('普通升级跨10级不再混入印记，关系进阶单独累计，不丢原消耗',()=>{
 for(const expert of board.experts){
  const affinity=system.paths.find(p=>p.id===expert.levelPath),advance=system.paths.find(p=>p.id===expert.advancementPath);
  assert.ok(affinity.rows.every(r=>r.cost['expert-mark']===undefined));
  const normal=calculatePlan(affinity,9,11,1);
  assert.ok(normal.materials.every(m=>m.itemId!=='expert-mark'));
  assert.equal(calculatePlan(advance,0,1,1).materials.find(m=>m.itemId==='expert-mark').needed,expert.milestones[0].mark);
  assert.equal(calculatePlan(advance,0,10,1).materials.find(m=>m.itemId==='expert-mark').needed,expert.milestones.reduce((n,m)=>n+m.mark,0));
  assert.ok(advance.rows.every(r=>Object.keys(r.cost).length===1&&r.cost['expert-mark']>=0));
 }
});

test('旧好感度10级不推断已进阶，当前与目标关系阶段分别保存并在账号/规划隔离',()=>{
 const expert=board.experts.find(e=>e.id==='凯西');
 const profile=validateBattleProfile({levels:{[expert.levelPath]:10},planned:{[expert.levelPath]:20}});
 assert.equal(expertAdvancementState(expert,profile),null);
 assert.equal(profile.levels[expert.levelPath],10);
 const state={battleProfile:profile,planning:{pathId:expert.levelPath}},before=structuredClone(state);
 const html=growthRecordsView(data,'experts',state,String);
 assert.ok(html.includes('关系进阶未记录'));
 assert.ok(html.includes(`data-growth-path="${expert.advancementPath}"`));
 assert.deepEqual(state,before);
 profile.levels[expert.advancementPath]=0;profile.planned[expert.advancementPath]=2;
 assert.equal(expertAdvancementState(expert,profile),0);
 assert.equal(expertAdvancementState(expert,profile,'planned'),2);
 const current=growthRecordsView(data,'experts',state,String,{mode:'current'});
 assert.ok(!current.includes('data-growth-record="planned"'));
});

test('分离过程可重复运行，保持66条路径及原存储ID，成本不被重复扣除',()=>{
 const copy=structuredClone(data),meta=structuredClone(board);
 splitExpertAdvancements(copy,meta);const first=structuredClone(copy);
 splitExpertAdvancements(copy,meta);
 assert.deepEqual(copy,first);
 const paths=copy.systems.find(s=>s.id==='experts').paths;
 assert.equal(paths.length,66);assert.equal(new Set(paths.map(p=>p.id)).size,66);
 assert.ok(paths.some(p=>p.id==='expert-Justus-relation'));
 assert.ok(paths.some(p=>p.id==='expert-Justus-advancement'));
});
