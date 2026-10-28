import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculatePlan} from '../src/domain/planning.js';
import {initialState,validateState} from '../src/domain/model.js';
const data=JSON.parse(await readFile(new URL('../src/data/planning.json',import.meta.url)));
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
test('九系统资料路径保留可追溯来源，全部已列区间可测算且未知属性不补造',()=>{
 assert.deepEqual(data.systems.map(s=>s.id),['chief-gear','chief-gems','hero-gear','research','t11','t12','experts','buildings','pets']);
 for(const system of data.systems)for(const path of system.paths){
  assert.ok(data.sources.some(s=>s.id===path.source),path.id+' source');
  assert.equal(new Set(path.rows.map(r=>r.level)).size,path.rows.length,path.id+' levels');
  const from=path.baseline?.level??path.rows[0].level;
  const result=calculatePlan(path,from,path.rows.at(-1).level,1,{items,stage:'gen7-fc10-gen8',progress:{heroGeneration:11,fireProgress:'fc10'},inventory:{}});
  assert.ok(Number.isFinite(result.partialValue)&&result.partialValue>=0,path.id);
  if(path.costStatus!=='available')assert.equal(result.ready,false,path.id);
 }
});
test('新规划选择随备份保留，旧备份仍能加载且库存不被改写',()=>{
 const state=initialState();state.account.inventory={'charm-guide':200};
 state.planning={systemId:'t12',pathId:'test-branch',from:1,to:5,pieces:1};
 const restored=validateState(JSON.parse(JSON.stringify(state)),items);
 assert.deepEqual(restored.planning,state.planning);assert.deepEqual(restored.account.inventory,state.account.inventory);
 delete state.planning;
 assert.equal(validateState(state,items).planning.systemId,'chief-gems');
 state.planning={systemId:'t12',pathId:'test',from:5,to:1,pieces:1};
 assert.throws(()=>validateState(state,items),/提升规划/);
});
