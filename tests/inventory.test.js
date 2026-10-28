import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inventoryDifference,validateInventoryHistory,deleteInventorySnapshot,restoreDeletedSnapshot,clearDeletedSnapshots} from '../src/domain/inventory.js';
import {initialState,validateState} from '../src/domain/model.js';
import {createStore} from '../scripts/persistence.mjs';
import {createPersistence} from '../src/domain/persistence.js';
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const snap=()=>({id:'first',at:'2026-10-26T00:00:00.000Z',accountName:'主号',note:'王战前',inventory:{screw:100,'speed-general':2.5}});
test('清空只移除回收区，正常记录及当前库存保持原样并在备份中保留清空结果',()=>{
  const state=initialState();state.account.inventory.screw=77;
  state.account.history=[{...snap(),id:'active'}];state.account.deletedHistory=[snap()];
  assert.equal(clearDeletedSnapshots(state.account),1);
  const next=validateState(JSON.parse(JSON.stringify(state)),items);
  assert.deepEqual(next.account.deletedHistory,[]);assert.equal(next.account.history[0].id,'active');assert.equal(next.account.inventory.screw,77);
  assert.equal(clearDeletedSnapshots(next.account),0);
});
test('删除快照不改当前库存，删除最后一份后备份往返仍能撤销恢复',()=>{
  const state=initialState();state.account.inventory.screw=77;state.account.history=[snap()];
  deleteInventorySnapshot(state.account,'first');
  assert.equal(state.account.history.length,0);assert.equal(state.account.inventory.screw,77);
  const next=validateState(JSON.parse(JSON.stringify(state)),items);
  assert.deepEqual(next.account.deletedHistory,[snap()]);
  restoreDeletedSnapshot(next.account,'first');
  assert.deepEqual(next.account.history,[snap()]);assert.deepEqual(next.account.deletedHistory,[]);
  assert.equal(next.account.inventory.screw,77);
  assert.throws(()=>deleteInventorySnapshot(next.account,'missing'));
});
test('时间快照独立保存，旧备份兼容且导入保留历史与零库存',()=>{
  const s=initialState();s.account.history=[snap()];s.account.inventory.screw=0;
  const next=validateState(JSON.parse(JSON.stringify(s)),items);
  assert.deepEqual(next,s);s.account.inventory.screw=5;assert.equal(next.account.history[0].inventory.screw,100);
  delete s.account.history;assert.deepEqual(validateState(s,items).account.history,[]);
});
test('未记录与零库存不同，差值按实际小时与个数计算',()=>{
  const rows=inventoryDifference({screw:100,'speed-general':2.5},{screw:0,'speed-general':3,alloy:500},items);
  assert.equal(rows.find(r=>r.item.id==='screw').change,-100);
  assert.equal(rows.find(r=>r.item.id==='speed-general').change,0.5);
  assert.equal(rows.find(r=>r.item.id==='alloy').before,null);
  assert.equal(rows.find(r=>r.item.id==='alloy').change,null);
});
test('历史导入拒绝重复ID、非法日期与数量，已移除道具不回流',()=>{
  assert.throws(()=>validateInventoryHistory([snap(),snap()],items));
  for(const mutate of [s=>s.at='bad',s=>s.inventory.screw=-1,s=>s.inventory.screw=0.5]){const s=snap();mutate(s);assert.throws(()=>validateInventoryHistory([s],items));}
  const s=snap();s.inventory['molly-shard']=10;assert.equal(validateInventoryHistory([s],items)[0].inventory['molly-shard'],undefined);
});
test('磁盘存档原子写入、上一版可恢复，并阻止过时窗口覆盖',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'winter-inventory-'));
  try{
    const store=createStore(directory,s=>validateState(s,items));assert.equal(await store.read(),null);
    const state=initialState();state.account.history=[snap()];
    const first=await store.save(state,null);
    state.account.inventory.screw=123;
    const results=await Promise.allSettled([store.save(state,first.revision),store.save(initialState(),first.revision)]);
    assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.status,409);
    assert.equal((await store.read()).state.account.inventory.screw,123);
    assert.equal(JSON.parse(await readFile(join(directory,'state.previous.json'),'utf8')).revision,first.revision);
    const restarted=createStore(directory,s=>validateState(s,items));assert.deepEqual((await restarted.read()).state.account.history,[snap()]);
  }finally{assert.ok(directory.startsWith(join(tmpdir(),'winter-inventory-')));await rm(directory,{recursive:true,force:true});}
});
test('浏览器加载有效磁盘记录且冲突后停止覆盖，仍保留本页备份',async()=>{
  const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
  let state=initialState(),writes=0,lastStatus='';const disk=initialState();disk.account.inventory.screw=75;
  const p=createPersistence({getState:()=>state,validate:s=>validateState(s,items),storageKey:'test',storage,onStatus:s=>lastStatus=s,fetcher:async(url,options)=>{
    if(!options?.method||options.method==='GET')return {ok:true,json:async()=>({revision:'r1',savedAt:new Date().toISOString(),state:disk})};
    writes++;return {ok:false,status:409,json:async()=>({error:'另一窗口已有更新'})};
  }});
  state=await p.load();assert.equal(state.account.inventory.screw,75);
  p.save();await p.flush();assert.equal(writes,1);assert.match(lastStatus,/另一窗口/);
  state.account.inventory.screw=99;p.save();await p.flush();assert.equal(writes,1);
  assert.equal(JSON.parse(storage.getItem('test')).account.inventory.screw,99);
});
test('损坏的浏览器草稿即使时间较新也不会覆盖有效磁盘库存',async()=>{
  const state=initialState();state.account.inventory.screw=880;
  const storage={getItem:key=>key.endsWith(':savedAt')?String(Date.now()+100000):'{bad json',setItem:()=>{}};
  const p=createPersistence({getState:()=>initialState(),validate:s=>validateState(s,items),storageKey:'test',storage,onStatus:()=>{},fetcher:async()=>({ok:true,json:async()=>({revision:'r',savedAt:new Date().toISOString(),state})})});
  assert.equal((await p.load()).account.inventory.screw,880);assert.equal(p.needsInitialSave,false);
});
