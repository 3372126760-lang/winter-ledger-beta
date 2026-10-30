import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/planning.json' with {type:'json'};
import manifest from '../src/data/research-trees.json' with {type:'json'};
import {applyTechnologyQuickEdit} from '../src/domain/technology-quick-entry.js';
import {calculatePlan} from '../src/domain/planning.js';
import {normalizeT12Attributes} from '../src/domain/t12-attributes.js';

test('三兵种顶部六项无工期，材料仍逐级累计，重复规范化不改变原始证据',()=>{
 const paths=data.systems.find(s=>s.id==='t12').paths;
 const instant=paths.filter(p=>p.timeMode==='instant');assert.equal(instant.length,18);
 for(const p of instant){assert.ok(p.rows.every(r=>r.timeHours===0));assert.equal(calculatePlan(p,0,p.rows.at(-1).level,1).timeHours,0);assert.deepEqual(normalizeT12Attributes(p),p);}
 const result=calculatePlan(paths.find(p=>p.id==='t12-g1-shield'),0,5,1);
 assert.equal(result.materials.find(m=>m.itemId==='refined-fire-crystal').needed,100);
 assert.equal(result.materials.find(m=>m.itemId==='steel').needed,400000);
 assert.equal(result.materials.find(m=>m.itemId==='fire-particle').needed,700);
 assert.ok(paths.filter(p=>p.timeMode!=='instant').some(p=>p.rows.some(r=>r.timeHours>0)));
});

test('快速录入：未记录与零、当前和目标独立；清空、满级、越界和小数验证',()=>{
 for(const systemId of ['research','t11','t12']){
  const n=manifest.nodes.find(n=>n.systemId===systemId),levels={},targets={};
  let result=applyTechnologyQuickEdit(n,levels,targets,'target',String(n.max));
  assert.deepEqual(result.levels,{});assert.equal(result.targets[n.id],n.max);
  result=applyTechnologyQuickEdit(n,result.levels,result.targets,'current','0');assert.equal(result.levels[n.id],0);
  result=applyTechnologyQuickEdit(n,result.levels,result.targets,'current','');assert.deepEqual(result.levels,{});assert.equal(result.targets[n.id],n.max);
  result=applyTechnologyQuickEdit(n,result.levels,result.targets,'target','');assert.deepEqual(result.targets,{});
  assert.throws(()=>applyTechnologyQuickEdit(n,levels,targets,'current','0.5'));
  assert.throws(()=>applyTechnologyQuickEdit(n,levels,targets,'current',String(n.max+1)));
  assert.throws(()=>applyTechnologyQuickEdit(n,{[n.id]:n.max},targets,'target',String(n.max)));
  assert.deepEqual(levels,{});assert.deepEqual(targets,{});
 }
});
