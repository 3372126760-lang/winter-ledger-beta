import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculatePlan} from '../src/domain/planning.js';
const data=JSON.parse(await readFile(new URL('../src/data/planning.json',import.meta.url)));
const research=JSON.parse(await readFile(new URL('../reference/research-2026-10-27/pets-verified.json',import.meta.url)));
const paths=data.systems.find(s=>s.id==='pets').paths;

test('14宠物的117段逐级口粮和突破消耗重建工具箱原始区间，不累计旧检查点',()=>{
 assert.equal(paths.length,14);let checked=0;
 for(const pet of research.pets){
  const path=paths.find(p=>p.id==='pet-detailed-'+pet.localFile.replace('.html',''));
  assert.equal(path.costStatus,'available');assert.ok(!path.costMode);
  let from=path.baseline.level;
  for(const c of pet.checks){
   assert.equal(c.consistent,true);
   const end=path.rows.find(r=>r.petLevel===c.level&&r.phase==='after-breakthrough');
   const r=calculatePlan(path,from,end.level,1),needed=Object.fromEntries(r.materials.map(m=>[m.itemId,m.needed]));
   assert.equal(needed['pet-food'],c.toolboxFood,pet.name+' '+c.level);
   for(const [i,id] of ['pet-manual','pet-vitality','pet-serum'].entries())assert.equal(needed[id]||0,c.toolboxBreakthrough[i]);
   from=end.level;checked++;
  }
 }
 assert.equal(checked,117);
});

test('同一宠物同级突破前后只计突破材料，明确档位不重复收口粮',()=>{
 const path=paths.find(p=>p.name.startsWith('冰霜古猿'));
 const before=path.rows.find(r=>r.petLevel===50&&r.phase==='before-breakthrough');
 const after=path.rows.find(r=>r.petLevel===50&&r.phase==='after-breakthrough');
 const result=calculatePlan(path,before.level,after.level,1);
 assert.deepEqual(Object.fromEntries(result.materials.map(m=>[m.itemId,m.needed])),{'pet-manual':220,'pet-vitality':50,'pet-serum':10});
 assert.equal(result.attributes.length,0);assert.equal(result.timeHours,null);
});
