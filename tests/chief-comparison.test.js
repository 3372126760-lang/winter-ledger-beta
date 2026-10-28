import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {nextChiefSteps,chiefUpgradeCandidates,combineChiefSteps,compareChiefSteps} from '../src/domain/chief-comparison.js';
import {validateChiefLoadout} from '../src/domain/chief-loadout.js';
const stat=(value,kind)=>kind==='gear'?[{key:'chief.attack',name:'攻击',unit:'%',value},{key:'chief.defense',name:'防御',unit:'%',value}]:[{key:'chief-gem.health',name:'生命',unit:'%',value},{key:'chief-gem.lethality',name:'穿透',unit:'%',value}];
const path=(id,kind,values,costs)=>({id,costStatus:'available',maxPieces:18,baseline:{level:0,label:'未提升',attributes:stat(0,kind)},rows:values.map((value,index)=>({level:index+1,label:`第${index+1}档`,cost:{[kind==='gear'?'alloy':'guide']:costs[index]},attributes:stat(value,kind)}))});
const data={systems:[{id:'chief-gear',paths:[path('gear','gear',[1,3,4],[10,40,50])]},{id:'chief-gems',paths:[path('gem','gem',[3,5],[5,8])]}]};
const items=[{id:'alloy',name:'合金',unit:'个',priceScale:10,prices:{fc5:{kind:'reference',value:10}}},{id:'guide',name:'手册',unit:'个',priceScale:1,prices:{fc5:{kind:'reference',value:2}}}];
const context={items,stage:'fc5',inventory:{alloy:45,guide:0}};
const record=()=>{const l=validateChiefLoadout();l.helmet.gear=1;l.watch.gear=0;l.helmet.gems[0]=1;return l;};

test('24个位置逐一识别，未记录不等于0；每行只计算相邻下一档且不改库存',()=>{
 const loadout=record(),before=structuredClone({loadout,context});const result=nextChiefSteps(data,loadout,context);
 assert.equal(result.positions.length,24);assert.equal(result.positions.filter(p=>p.status==='unrecorded').length,21);
 const helmet=result.candidates.find(c=>c.id==='helmet:gear');assert.equal(helmet.from,1);assert.equal(helmet.to,2);
 assert.equal(helmet.gains.attack,2);assert.equal(helmet.gains.defense,2);assert.equal(helmet.gains.health,null);
 assert.equal(helmet.fullCost,40);assert.equal(helmet.gapCost,0);
 assert.deepEqual(helmet.plan.chiefSelection,{slotId:'helmet',kind:'gear',gemIndex:null});
 assert.deepEqual({loadout,context},before);
});

test('只比较指定兵种的一项属性，材料价值与库存缺口可得到不同顺序',()=>{
 const {candidates}=nextChiefSteps(data,record(),context);
 const full=compareChiefSteps(candidates,{troopId:'lancer',metric:'attack'});
 assert.deepEqual(full.rows.map(r=>r.id),['watch:gear','helmet:gear']);assert.equal(full.rows[0].unitCost,10);
 const gap=compareChiefSteps(candidates,{troopId:'lancer',metric:'defense',basis:'gap'});
 assert.equal(gap.rows[0].id,'helmet:gear');assert.equal(gap.rows[0].unitCost,0);
 const health=compareChiefSteps(candidates,{troopId:'lancer',metric:'health'});
 assert.equal(health.rows.length,1);assert.equal(health.rows[0].id,'helmet:gem:0');assert.equal(health.rows[0].gain,2);
 assert.equal(compareChiefSteps(candidates,{troopId:'infantry',metric:'attack'}).rows.length,0);
});

test('预算边界、零预算与未知库存不会生成虚假的可比或免费结果',()=>{
 const {candidates}=nextChiefSteps(data,record(),context);
 const limited=compareChiefSteps(candidates,{troopId:'lancer',metric:'attack',budget:10});
 assert.equal(limited.comparable,1);assert.equal(limited.overBudget,1);assert.equal(limited.rows[1].rank,null);
 const zero=compareChiefSteps(candidates,{troopId:'lancer',metric:'attack',budget:0});assert.equal(zero.comparable,0);
 const unknown=nextChiefSteps(data,record(),{...context,inventory:{}}).candidates;
 const result=compareChiefSteps(unknown,{troopId:'lancer',metric:'attack',basis:'gap',budget:0});
 assert.equal(result.comparable,0);assert.equal(result.unknown,2);assert.ok(result.rows.every(r=>r.cost===null));
 for(const budget of [-1,NaN,Infinity,'10'])assert.throws(()=>compareChiefSteps(candidates,{troopId:'lancer',metric:'attack',budget}));
});

test('单价缺失保留未知；只有确实覆盖全部需求的已记库存才能计为无需补材料',()=>{
 const unknown={...context,items:[],inventory:{alloy:45}};
 const {candidates}=nextChiefSteps(data,record(),unknown);
 assert.equal(candidates[0].fullCost,null);assert.equal(candidates[0].gapCost,0);
 const priced=compareChiefSteps(candidates,{troopId:'lancer',metric:'attack'});assert.equal(priced.comparable,0);
 const gap=compareChiefSteps(candidates,{troopId:'lancer',metric:'attack',basis:'gap'});assert.equal(gap.comparable,2);
 const uncovered=nextChiefSteps(data,record(),{...unknown,inventory:{alloy:1}}).candidates;
 assert.equal(compareChiefSteps(uncovered,{troopId:'lancer',metric:'attack',basis:'gap'}).comparable,0);
});

test('最高档不生成下一步，未收录档位和零属性增益不参与效率排名',()=>{
 const l=record();l.helmet.gear=3;l.watch.gear=50;
 const result=nextChiefSteps(data,l,context);
 assert.equal(result.positions.find(p=>p.id==='helmet:gear').status,'maximum');
 assert.equal(result.positions.find(p=>p.id==='watch:gear').status,'missing');
 const {candidates}=nextChiefSteps(data,record(),context);candidates[0].gains.attack=0;
 const sorted=compareChiefSteps(candidates,{troopId:'lancer',metric:'attack'});
 assert.equal(sorted.comparable,1);assert.equal(sorted.rows.at(-1).status,'no-gain');assert.equal(sorted.rows.at(-1).unitCost,null);
});

test('真实装备与宝石资料生成下一步时保留同一位置和实际分段，不把不同属性相加',async()=>{
 const real=JSON.parse(await readFile(new URL('../src/data/planning.json',import.meta.url)));
 const catalog=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
 const l=validateChiefLoadout();l.helmet.gear=102;l.helmet.gems[0]=25;
 const r=nextChiefSteps(real,l,{items:catalog.items,stage:'gen7-fc10-gen8',progress:{heroGeneration:11,fireProgress:'fc10'},inventory:{}});
 assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].from,25);assert.equal(r.candidates[0].to,26);
 assert.ok(r.candidates[0].gains.health>0);assert.equal(r.candidates[0].gains.health,r.candidates[0].gains.lethality);
 assert.ok(Number.isFinite(r.candidates[0].fullCost));assert.equal(r.candidates[0].gapCost,null);
});

test('统一目标按每个位置的实际起点累计整段材料与属性，达到目标的部位不生成降级',()=>{
 const loadout=record();
 const r=chiefUpgradeCandidates(data,loadout,context,{mode:'target',gearLevel:3,gemLevel:2});
 const helmet=r.candidates.find(c=>c.id==='helmet:gear');
 assert.equal(helmet.from,1);assert.equal(helmet.to,3);assert.equal(helmet.stepCount,2);
 assert.equal(helmet.fullCost,90);assert.equal(helmet.gains.attack,3);
 assert.equal(r.candidates.find(c=>c.id==='watch:gear').fullCost,100);
 assert.equal(helmet.plan.to,3);
 const reached=chiefUpgradeCandidates(data,loadout,context,{mode:'target',gearLevel:1,gemLevel:1});
 assert.equal(reached.positions.find(p=>p.id==='helmet:gear').status,'at-target');
 assert.equal(reached.positions.find(p=>p.id==='helmet:gem:0').status,'at-target');
 assert.equal(reached.candidates.length,1);
 assert.throws(()=>chiefUpgradeCandidates(data,loadout,context,{mode:'target',gearLevel:99,gemLevel:2}));
});

test('合并方案先加需求再扣一次共享库存，分别可覆盖不等于一起能覆盖',()=>{
 const {candidates}=nextChiefSteps(data,record(),context);
 const ids=['helmet:gear','watch:gear'];
 assert.equal(candidates.filter(c=>ids.includes(c.id)).reduce((n,c)=>n+c.gapCost,0),0);
 const original=structuredClone(context),merged=combineChiefSteps(candidates,ids,context);
 assert.equal(merged.fullCost,50);assert.equal(merged.gapCost,5);
 assert.equal(merged.materials[0].needed,50);assert.equal(merged.materials[0].owned,45);assert.equal(merged.materials[0].gap,5);
 assert.equal(merged.gainsByTroop.lancer.attack,3);assert.equal(merged.gainsByTroop.lancer.defense,3);
 assert.equal(merged.gainsByTroop.lancer.health,null);assert.deepEqual(context,original);
 for(const invalid of [[],[ids[0],ids[0]],['not-a-position']])assert.throws(()=>combineChiefSteps(candidates,invalid,context));
});

test('合并时未知库存与缺单价保持未知；整段需求使用同一份库存而非分段重复扣除',()=>{
 const {candidates}=chiefUpgradeCandidates(data,record(),context,{mode:'target',gearLevel:3,gemLevel:2});
 const ids=['helmet:gear','watch:gear'];
 assert.equal(combineChiefSteps(candidates,ids,context).gapCost,145);
 assert.equal(combineChiefSteps(candidates,ids,{...context,inventory:{}}).gapCost,null);
 const covered=combineChiefSteps(candidates,ids,{items:[],stage:'fc5',inventory:{alloy:190}});
 assert.equal(covered.fullCost,null);assert.equal(covered.gapCost,0);
 const unknown=combineChiefSteps(candidates,ids,{items:[],stage:'fc5',inventory:{alloy:189}});
 assert.equal(unknown.gapCost,null);
});
