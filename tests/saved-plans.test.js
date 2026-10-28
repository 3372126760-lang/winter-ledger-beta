import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative,isAbsolute} from 'node:path';
import {validateSavedPlans,createSavedPlan,evaluateSavedPlan} from '../src/domain/saved-plans.js';
import {chiefUpgradeCandidates} from '../src/domain/chief-comparison.js';
import {validateChiefLoadout} from '../src/domain/chief-loadout.js';
import {initialState,validateState} from '../src/domain/model.js';
import {createStore} from '../scripts/persistence.mjs';

const stat=(value,kind)=>kind==='gear'?[{key:'chief.attack',name:'攻击',unit:'%',value},{key:'chief.defense',name:'防御',unit:'%',value}]:[{key:'chief-gem.health',name:'生命',unit:'%',value},{key:'chief-gem.lethality',name:'穿透',unit:'%',value}];
const path=(kind,values,costs)=>({id:kind,costStatus:'available',maxPieces:18,baseline:{level:0,label:'未提升',attributes:stat(0,kind)},rows:values.map((value,index)=>({level:index+1,label:`第${index+1}档`,cost:{[kind==='gear'?'alloy':'guide']:costs[index]},attributes:stat(value,kind)}))});
const data={systems:[{id:'chief-gear',paths:[path('gear',[1,3,4],[10,40,50])]},{id:'chief-gems',paths:[path('gem',[3,5],[5,8])]}]};
const items=[{id:'alloy',name:'合金',unit:'个',priceScale:10,prices:{fc5:{kind:'reference',value:10},fc3:{kind:'reference',value:20}}},{id:'guide',name:'手册',unit:'个',priceScale:1,prices:{fc5:{kind:'reference',value:2}}}];
const context={items,stage:'fc5',inventory:{alloy:45,guide:0}};
const config={name:'矛兵装备目标',stage:'fc5',troopId:'lancer',metric:'attack',basis:'full',budget:200};
const metadata={id:'saved-test-1',createdAt:'2026-10-27T01:02:03.000Z'};
const record=()=>{const l=validateChiefLoadout();l.helmet.gear=1;l.watch.gear=0;l.helmet.gems[0]=1;return l;};
const candidateList=()=>chiefUpgradeCandidates(data,record(),context,{mode:'target',gearLevel:3,gemLevel:2}).candidates;
const plan=()=>createSavedPlan(candidateList(),['helmet:gear','watch:gear'],config,metadata);

test('保存固定位置与目标，备份往返保留方案且不更改库存和当前规划，旧备份兼容',async()=>{
 const {items:catalog}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
 const state=initialState();state.account.inventory={alloy:1234};state.account.chiefLoadout=record();state.savedPlans=[plan()];
 const restored=validateState(JSON.parse(JSON.stringify(state)),catalog);
 assert.deepEqual(restored,state);assert.notEqual(restored.savedPlans,state.savedPlans);assert.notEqual(restored.savedPlans[0].entries,state.savedPlans[0].entries);
 delete state.savedPlans;const old=validateState(state,catalog);
 assert.deepEqual(old.savedPlans,[]);assert.deepEqual(old.account,state.account);assert.deepEqual(old.planning,state.planning);
});

test('方案只保留白名单字段，选中内容无效和导入越界时拒绝，而非生成错误目标',()=>{
 const valid=plan();valid.untrusted='ignored';valid.entries[0].needed=999;
 const restored=validateSavedPlans([valid])[0];assert.equal(restored.untrusted,undefined);assert.equal(restored.entries[0].needed,undefined);
 const cases=[p=>p.id='../bad',p=>p.name=' ',p=>p.name='a'.repeat(81),p=>p.name='换行\n',p=>p.createdAt='2026-02-30T01:02:03.000Z',p=>p.createdAt='bad',p=>p.stage='unknown',p=>p.troopId='infantry',p=>p.metric='health',p=>p.basis='cash',p=>p.budget=-1,p=>p.budget=NaN,p=>p.budget='3',p=>p.entries=[],p=>p.entries[0].from=null,p=>p.entries[0].from=3,p=>p.entries[0].to=103,p=>p.entries[0].to=2.5,p=>p.entries[0].id='helmet:gem:3',p=>p.entries.push(p.entries[0])];
 for(const change of cases){const p=plan();change(p);assert.throws(()=>validateSavedPlans([p]),/方案/);}
 for(const invalid of [null,{},[plan(),plan()],Array.from({length:101},(_,i)=>({...plan(),id:`id${i}`}))])assert.throws(()=>validateSavedPlans(invalid));
 for(const ids of [[],['missing'],['helmet:gear','helmet:gear'],['helmet:gear','helmet:gem:0']])assert.throws(()=>createSavedPlan(candidateList(),ids,config,metadata));
 assert.throws(()=>createSavedPlan([...candidateList(),candidateList()[0]],['helmet:gear'],config,metadata));
 assert.deepEqual(validateSavedPlans(),[]);
});

test('重算使用当前等级到固定目标，升级之后只计算剩余部分，已达标不再升级',()=>{
 const saved=plan(),loadout=record(),before=structuredClone({data,saved,loadout,context});
 const original=evaluateSavedPlan(data,saved,loadout,context);
 assert.equal(original.complete,true);assert.equal(original.result.fullCost,190);assert.equal(original.result.gapCost,145);
 assert.deepEqual(original.positions.map(p=>p.status),['pending','pending']);
 assert.deepEqual({data,saved,loadout,context},before);
 loadout.helmet.gear=2;loadout.watch.gear=3;
 const next=evaluateSavedPlan(data,saved,loadout,context);
 assert.deepEqual(next.positions.map(p=>p.status),['pending','completed']);
 assert.equal(next.positions[0].from,1);assert.equal(next.positions[0].current,2);assert.equal(next.positions[0].to,3);
 assert.equal(next.candidates[0].from,2);assert.equal(next.candidates[0].to,3);assert.equal(next.result.fullCost,50);assert.equal(next.result.gapCost,5);
 loadout.helmet.gear=4;const done=evaluateSavedPlan(data,saved,loadout,context);
 assert.equal(done.complete,true);assert.equal(done.result,null);assert.deepEqual(done.candidates,[]);assert.ok(done.positions.every(p=>p.status==='completed'));
});

test('金额与库存重新计算，共享库存只扣一次，不保存旧单价或假装库存足够',()=>{
 const saved=plan(),loadout=record();
 const current=evaluateSavedPlan(data,saved,loadout,context);
 assert.equal(current.result.materials[0].needed,190);assert.equal(current.result.materials[0].owned,45);assert.equal(current.result.materials[0].gap,145);
 const changed=evaluateSavedPlan(data,saved,loadout,{...context,stage:'fc3',inventory:{alloy:100}});
 assert.equal(changed.result.fullCost,380);assert.equal(changed.result.gapCost,180);assert.equal(saved.stage,'fc5');
 const unknown=evaluateSavedPlan(data,saved,loadout,{...context,inventory:{}});assert.equal(unknown.result.gapCost,null);assert.equal(unknown.result.inventoryComplete,false);
 const noPrice=evaluateSavedPlan(data,saved,loadout,{...context,items:[],inventory:{alloy:190}});assert.equal(noPrice.result.fullCost,null);assert.equal(noPrice.result.gapCost,0);
});

test('未记录位置不作为零级，缺起点/目标/中间配方不会伪造完整总数',()=>{
 const saved=plan(),loadout=record();loadout.watch.gear=null;
 let result=evaluateSavedPlan(data,saved,loadout,context);
 assert.equal(result.complete,false);assert.equal(result.result.fullCost,90);assert.equal(result.positions[1].status,'unrecorded');
 const missingCases=[d=>d.systems=[],d=>d.systems[0].paths=[],d=>d.systems[0].paths[0].rows.pop(),d=>d.systems[0].paths[0].rows.splice(1,1),d=>delete d.systems[0].paths[0].rows[1].cost,d=>d.systems[0].paths[0].costStatus='unverified',d=>d.systems[0].paths[0].rows[2].cost.alloy=-1];
 for(const change of missingCases){const d=structuredClone(data);change(d);result=evaluateSavedPlan(d,saved,record(),context);assert.equal(result.complete,false);assert.equal(result.positions[0].status,'missing');assert.ok(result.positions[0].reason);}
 const unknownRecord=record();unknownRecord.helmet.gear=0;const d=structuredClone(data);delete d.systems[0].paths[0].baseline;
 assert.equal(evaluateSavedPlan(d,saved,unknownRecord,context).positions[0].status,'missing');
});

test('宝石位置和分段目标按档位精确保留，不混入装备或其他兵种',()=>{
 const saved=createSavedPlan(candidateList(),['helmet:gem:0'],{...config,metric:'health',budget:null},metadata);
 const loadout=record(),r=evaluateSavedPlan(data,saved,loadout,context);
 assert.equal(r.result.fullCost,16);assert.equal(r.result.gainsByTroop.lancer.health,2);assert.equal(r.result.gainsByTroop.lancer.lethality,2);assert.equal(r.result.gainsByTroop.lancer.attack,null);
 assert.equal(r.positions[0].gemIndex,0);assert.equal(r.positions[0].beforeLabel,'第1档');assert.equal(r.positions[0].afterLabel,'第2档');
 const invalid=structuredClone(saved);invalid.entries[0].to=35;assert.throws(()=>validateSavedPlans([invalid]));
});

test('缺少单个位置属性时保留null，合并只提供已知部分而不补造完整收益',()=>{
 const partial=structuredClone(data);
 partial.systems[0].paths[0].rows[0].attributes=stat(1,'gear').filter(a=>a.key!=='chief.attack');
 const r=evaluateSavedPlan(partial,plan(),record(),context);
 assert.equal(r.complete,true); // Materials are complete; this does not assert full attribute coverage.
 assert.equal(r.result.fullCost,190);
 assert.equal(r.candidates.find(c=>c.id==='helmet:gear').gains.attack,null);
 assert.equal(r.candidates.find(c=>c.id==='watch:gear').gains.attack,4);
 assert.equal(r.candidates.every(c=>Number.isFinite(c.gains.attack)),false);
 assert.equal(r.result.gainsByTroop.lancer.attack,4);
 assert.equal(r.result.gainsByTroop.lancer.defense,7);
 assert.equal(r.result.gainsByTroop.lancer.health,null);
 partial.systems[0].paths[0].rows[2].attributes=[];
 const unknown=evaluateSavedPlan(partial,plan(),record(),context);
 assert.equal(unknown.result.gainsByTroop.lancer.attack,null);
 assert.equal(unknown.result.gainsByTroop.lancer.defense,null);
});

test('方案写入独立F盘存档后重新建store读取，导出导入往返保留固定目标与账号',async()=>{
 const {items:catalog}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
 const workspace=await realpath(fileURLToPath(new URL('..',import.meta.url)));
 const directory=await mkdtemp(join(workspace,'artifacts','tests-saved-plan-'));
 const cleanup=async()=>{
  const resolved=await realpath(directory),within=relative(join(workspace,'artifacts'),resolved);
  assert.ok(within&&!isAbsolute(within)&&!within.startsWith('..')&&within.startsWith('tests-saved-plan-'));
  await rm(resolved,{recursive:true,force:true});
 };
 try{
  const validate=s=>validateState(s,catalog),state=initialState();
  state.account.inventory={alloy:1234};state.account.chiefLoadout=record();state.savedPlans=[plan()];
  const store=createStore(directory,validate),written=await store.save(state,null);
  const restarted=createStore(directory,validate),loaded=await restarted.read();
  assert.equal(loaded.revision,written.revision);assert.deepEqual(loaded.state,state);
  const backup=validate(JSON.parse(JSON.stringify(loaded.state)));
  assert.deepEqual(backup.savedPlans,state.savedPlans);assert.deepEqual(backup.account,state.account);assert.deepEqual(backup.planning,state.planning);
  backup.savedPlans[0].name='改名后的固定目标';await restarted.save(backup,loaded.revision);
  const latest=await createStore(directory,validate).read();
  assert.equal(latest.state.savedPlans[0].name,'改名后的固定目标');assert.deepEqual(latest.state.savedPlans[0].entries,state.savedPlans[0].entries);
  assert.deepEqual(latest.state.account,state.account);
 }finally{await cleanup();}
});
