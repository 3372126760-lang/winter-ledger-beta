import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/planning.json' with {type:'json'};
import {ORANGE_STEPS,masterySequence,migrateMasteryRecords} from '../src/domain/hero-mastery.js';
import {calculatePlan,validatePlanningState} from '../src/domain/planning.js';
const paths=data.systems.find(s=>s.id==='hero-gear').paths.filter(p=>p.id.startsWith('hero-mastery'));
test('五段专精逐段成本、整级守恒和倍率均分',()=>{
 for(const p of paths){
  assert.equal(p.rows.length,88);
  for(let level=4;level<=20;level++){
   const steps=p.rows.filter(r=>r.masteryLevel===level);
   assert.equal(steps.length,5);
   assert.deepEqual(steps.map(r=>r.cost['orange-gear']),[...(ORANGE_STEPS[level]||'00000')].map(Number));
   assert.equal(steps.reduce((n,r)=>n+r.cost['mastery-stone'],0),level*10);
   for(const [i,r] of steps.entries())assert.ok(Math.abs(r.masteryMultiplier-(1+(level-1+(i+1)/5)*.1))<1e-10);
   const result=calculatePlan(p,masterySequence(level-1),masterySequence(level),1);
   assert.equal(result.materials.find(m=>m.itemId==='mastery-stone').needed,level*10);
  }
 }
});
test('旧记录和计划迁移不改变实际整级，并且重复读取稳定',()=>{
 const old={'hero-mastery-infantry-goggles':10},next=migrateMasteryRecords(old);
 assert.equal(next['hero-mastery-infantry-goggles-staged'],38);
 assert.deepEqual(migrateMasteryRecords(next),next);
 const plan=validatePlanningState({systemId:'hero-gear',pathId:'hero-mastery-infantry-goggles',from:10,to:11,pieces:1});
 assert.equal(plan.from,38);assert.equal(plan.to,43);
 assert.deepEqual(validatePlanningState(plan),plan);
 const p=paths.find(p=>p.id===plan.pathId);
 assert.equal(calculatePlan(p,40,41,1).materials.find(m=>m.itemId==='orange-gear').needed,1);
});
