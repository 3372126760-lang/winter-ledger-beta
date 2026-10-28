import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {technologyTree,planTechnologyNode} from '../src/domain/research-tree.js';
import {validatePlanningState} from '../src/domain/planning.js';
import {initialState,validateState} from '../src/domain/model.js';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const data=await read('src/data/planning.json'),manifest=await read('src/data/research-trees.json'),{items}=await read('src/data/catalog.json');
const system=id=>data.systems.find(s=>s.id===id),path=id=>data.systems.flatMap(s=>s.paths).find(p=>p.id===id);
test('三类科技树全部节点可定位到原计算路径，无孤立连线，三兵种布局分开',()=>{
 const ids=new Set(manifest.nodes.map(n=>n.id));ids.add('t11-core');assert.equal(ids.size,193);
 for(const n of manifest.nodes){assert.ok(path(n.pathId),n.id);assert.equal(n.max,path(n.pathId).rows.at(-1).level);assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));}
 for(const edge of manifest.edges){assert.ok(ids.has(edge.from));assert.ok(ids.has(edge.to));}
 for(const troop of ['infantry','lancer','marksman']){assert.equal(manifest.nodes.filter(n=>n.systemId==='t11'&&n.troopId===troop).length,10);assert.equal(manifest.nodes.filter(n=>n.systemId==='t12'&&n.troopId===troop).length,20);}
});
test('普通战斗科技跨阶段串联，每阶段保持1→3→3→1→2→1→3→3的游戏布局',()=>{
 const s=system('research'),p=s.paths.find(p=>p.name==='武器特训1'),tree=technologyTree(manifest,s,p,{systemId:'research',pathId:p.id,from:0,to:1,pieces:1});
 assert.equal(tree.nodes.length,102);assert.equal(tree.selected.name,'武器特训1');
 for(let tier=1;tier<=6;tier++){const nodes=tree.nodes.filter(n=>n.tier===tier),counts=new Map();for(const n of nodes)counts.set(n.y,(counts.get(n.y)||0)+1);assert.deepEqual([...counts.values()],[1,3,3,1,2,1,3,3]);}
 assert.equal(tree.edges.filter(e=>e.type==='stage').length,15);
 assert.equal(technologyTree(manifest,s,s.paths.find(p=>p.researchTree==='growth'),{}),null);
});
test('T11沿三方向展开且选择兵种不混用另一兵种的测算起点',()=>{
 const s=system('t11'),p=s.paths[0],before={systemId:'t11',pathId:p.id,from:3,to:5,pieces:1};
 const tree=technologyTree(manifest,s,p,before);assert.equal(tree.selected.troopId,'infantry');
 const selected=tree.nodes.find(n=>n.pathId===p.id&&n.troopId==='lancer');
 const next=planTechnologyNode(selected,p,before);assert.deepEqual(next,{systemId:'t11',pathId:p.id,from:0,to:1,pieces:1,technologyTroop:'lancer'});
 assert.deepEqual(validatePlanningState(next),next);assert.equal(before.from,3);
 const recalled=technologyTree(manifest,s,p,next);assert.equal(recalled.selected.troopId,'lancer');
 assert.ok(tree.nodes.find(n=>n.id==='t11-marksman-0').y<manifest.t11Core.y);
 assert.ok(tree.nodes.find(n=>n.id==='t11-infantry-0').x>manifest.t11Core.x);
 assert.ok(tree.nodes.find(n=>n.id==='t11-lancer-0').y>manifest.t11Core.y);
 assert.throws(()=>validatePlanningState({...next,technologyTroop:'bad'}));
 assert.throws(()=>validatePlanningState({...next,systemId:'research'}));
});
test('T12兵种页签只列本兵种20节点，五件装备与后续四列分支映射正确',()=>{
 for(const suffix of ['shield','lancer','marksman']){const s=system('t12'),p=s.paths.find(p=>p.id.endsWith('-'+suffix)),tree=technologyTree(manifest,s,p,{systemId:'t12',pathId:p.id,from:0,to:1,pieces:1});assert.equal(tree.nodes.length,20);assert.equal(tree.nodes.filter(n=>n.equipment).length,5);assert.equal(tree.nodes.filter(n=>n.unit).length,1);for(const tier of ['I','II','III'])assert.equal(tree.nodes.filter(n=>n.stage===tier).length,4);assert.ok(tree.nodes.every(n=>n.pathId.endsWith('-'+suffix)));}
});
test('本地80张科技贴图哈希一致，旧记录与新兵种选择备份兼容且库存不变',async()=>{
 assert.equal(manifest.assets.length,80);
 for(const asset of manifest.assets){const bytes=await readFile(new URL('..'+asset.local,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes[0],137);assert.equal(bytes.toString('ascii',1,4),'PNG');}
 const state=initialState();state.account.inventory.steel=100;const account=structuredClone(state.account);
 state.planning={systemId:'t11',pathId:'t11-1',from:0,to:1,pieces:1,technologyTroop:'marksman'};
 const restored=validateState(JSON.parse(JSON.stringify(state)),items);assert.deepEqual(restored.account,account);assert.deepEqual(restored.planning,state.planning);
 delete state.planning.technologyTroop;assert.deepEqual(validateState(state,items).planning,state.planning);
});
