import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative,isAbsolute} from 'node:path';
import {validateTechnologyLevels,setTechnologyLevel} from '../src/domain/technology-levels.js';
import {planTechnologyNode} from '../src/domain/research-tree.js';
import {initialState,validateState} from '../src/domain/model.js';
import {createStore} from '../scripts/persistence.mjs';
const manifest=JSON.parse(await readFile(new URL('../src/data/research-trees.json',import.meta.url))),data=JSON.parse(await readFile(new URL('../src/data/planning.json',import.meta.url))),{items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
test('图上等级逐节点隔离，0与未记录不同，可清除且拒绝无效档位',()=>{
 const original={'battle-1-0':0,'t11-infantry-0':3,'t11-lancer-0':5,'t12-marksman-6':20};
 assert.deepEqual(validateTechnologyLevels(),{});assert.deepEqual(validateTechnologyLevels(original),original);
 const next=setTechnologyLevel(original,'battle-1-0',2);assert.equal(next['battle-1-0'],2);assert.equal(original['battle-1-0'],0);assert.equal(next['t11-infantry-0'],3);assert.equal(next['t11-lancer-0'],5);
 assert.equal(Object.hasOwn(setTechnologyLevel(next,'battle-1-0',null),'battle-1-0'),false);
 assert.equal(validateTechnologyLevels({'battle-1-0':3})['battle-1-0'],3);
 for(const value of [null,[],{'bad':1},{'battle-1-0':4},{'battle-1-0':-1},{'battle-1-0':1.5},{'battle-1-0':null},{'battle-1-0':'1'}])assert.throws(()=>validateTechnologyLevels(value));
});
test('测算从图上已记录等级开始，满级仍可选中查看且不改写原记录',()=>{
 const node=manifest.nodes.find(n=>n.id==='battle-1-0'),path=data.systems.find(s=>s.id==='research').paths.find(p=>p.id===node.pathId);
 const current={systemId:'research',pathId:node.pathId,from:0,to:1,pieces:1};
 assert.deepEqual(planTechnologyNode(node,path,current,{'battle-1-0':2}),{...current,from:2,to:3});
 assert.equal(planTechnologyNode(node,path,{...current,from:3,to:3},{'battle-1-0':3}).to,3);
 assert.equal(current.from,0);
});
test('科技等级可随本机存档重载和备份保留，旧记录迁移为空且原库存保持',async()=>{
 const state=initialState();state.account.inventory.steel=37;state.account.technologyLevels={'battle-1-0':3,'t11-lancer-0':4,'t12-infantry-7':20};state.technologyTargets={'battle-1-0':3,'t11-lancer-0':5};
 const account=structuredClone(state.account);assert.deepEqual(validateState(JSON.parse(JSON.stringify(state)),items).account,account);
 const legacy=structuredClone(state);delete legacy.account.technologyLevels;delete legacy.technologyTargets;assert.deepEqual(validateState(legacy,items).technologyTargets,{});assert.deepEqual(validateState(legacy,items).account.technologyLevels,{});
 assert.equal(validateState(legacy,items).account.inventory.steel,37);
 const base=fileURLToPath(new URL('../artifacts/',import.meta.url)),directory=await mkdtemp(join(base,'technology-levels-test-'));
 try{const store=createStore(directory,s=>validateState(s,items));await store.save(state,null);const reloaded=await createStore(directory,s=>validateState(s,items)).read();assert.deepEqual(reloaded.state.account,account);assert.deepEqual(reloaded.state.technologyTargets,state.technologyTargets);}
 finally{const resolved=await realpath(directory),within=relative(base,resolved);assert.ok(within&&!isAbsolute(within)&&!within.startsWith('..')&&within.startsWith('technology-levels-test-'));await rm(resolved,{recursive:true,force:true});}
});
