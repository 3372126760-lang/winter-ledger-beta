import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {technologyEffects} from '../src/ui/technology-effects.js';
const data=JSON.parse(await readFile(new URL('../src/data/planning.json',import.meta.url)));
const manifest=JSON.parse(await readFile(new URL('../src/data/research-trees.json',import.meta.url)));
const path=id=>data.systems.flatMap(s=>s.paths).find(p=>p.id===id);
const esc=s=>String(s).replaceAll('<','&lt;');
test('节点效果显示实际起点与目标属性，零级、未知与预览分开',()=>{
 const n=manifest.nodes.find(n=>n.id==='battle-1-0'),p=path(n.pathId);
 const known=technologyEffects(p,n,0,3,{esc});assert.ok(known.includes('0%'));assert.ok(known.includes('1.5%'));assert.ok(known.includes('+1.5个百分点'));
 const unknown=technologyEffects(p,n,null,null,{esc});assert.ok(unknown.includes('未记录'));assert.ok(unknown.includes('1级效果预览'));assert.ok(!unknown.includes('+1.5个百分点'));
 const current=technologyEffects(p,n,1,null,{esc});assert.ok(current.includes('0.5%'));assert.ok(!current.includes('<th>计划</th>'));
});
test('T12保留原文效果，T11缺数值明确待补，不编造数值',()=>{
 for(const id of ['t12-infantry-0','t11-lancer-0']){
  const n=manifest.nodes.find(n=>n.id===id),html=technologyEffects(path(n.pathId),n,1,2,{esc});
  assert.ok(html.includes(id.startsWith('t12')?'出征部队容量+600':'效果数值待补'));
 }
});
test('T12三兵种各五件装备同一排且顺序保持，解锁与后续分支保留',()=>{
 for(const troop of ['infantry','lancer','marksman']){
  const nodes=manifest.nodes.filter(n=>n.systemId==='t12'&&n.troopId===troop),gear=nodes.filter(n=>n.equipment);
  assert.equal(gear.length,5);assert.equal(new Set(gear.map(n=>n.y)).size,1);
  assert.deepEqual(gear.map(n=>n.x),[84,192,300,408,516]);
  assert.ok(nodes.find(n=>n.unit).y>gear[0].y);assert.equal(nodes.length,20);
 }
});
