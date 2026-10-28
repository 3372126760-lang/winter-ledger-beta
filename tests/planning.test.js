import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePlan,planningAvailability,validatePlanningState} from '../src/domain/planning.js';

const items=[
  {id:'alloy',name:'合金',priceScale:100,unit:'个',prices:{fc5:{value:2,kind:'reference'}}},
  {id:'guide',name:'手册',priceScale:1,unit:'个',prices:{fc5:{value:3,kind:'reference'}}},
  {id:'box',name:'材料箱',priceScale:1,unit:'个',prices:{},valuation:{type:'fixed',source:'test',contents:[{itemId:'guide',quantity:2}]}},
];
const attribute=value=>[{key:'infantry-attack',name:'盾兵攻击',value,unit:'%'}];
const path={id:'test',name:'路线',costStatus:'available',maxPieces:6,
  baseline:{level:0,attributes:attribute(0)},rows:[
    {level:1,cost:{alloy:100,guide:2},timeHours:2,attributes:attribute(5)},
    {level:2,cost:{alloy:200,guide:3},timeHours:4,attributes:attribute(8)},
  ]};
const context={items,stage:'fc5',inventory:{alloy:400,guide:3}};

test('跨级消耗逐步相加，数量扩大后只扣一次库存；属性按每件保留',()=>{
  const r=calculatePlan(path,0,2,2,context);
  assert.deepEqual(r.materials.map(m=>[m.itemId,m.needed,m.owned,m.gap]),[['alloy',600,400,200],['guide',10,3,7]]);
  assert.equal(r.fullValue,42);assert.equal(r.knownGapValue,25);assert.equal(r.timeHours,12);
  assert.equal(r.attributes[0].delta,8);assert.equal(r.priceComplete,true);assert.equal(r.inventoryComplete,true);assert.equal(r.ready,true);
});

test('未记库存不冒充已确认零库存；未定价资源使金额保持部分成本',()=>{
  const unpriced={...path,rows:[{level:1,cost:{alloy:100,missing:2},resources:{肉:1000},timeHours:null,attributes:[]}]};
  const r=calculatePlan(unpriced,0,1,1,{items,stage:'fc5',inventory:{alloy:0}});
  assert.equal(r.materials[1].owned,null);assert.equal(r.materials[1].gap,2);
  assert.equal(r.fullValue,null);assert.equal(r.partialValue,2);assert.equal(r.knownGapValue,2);
  assert.deepEqual(r.missingPrices,['missing']);assert.equal(r.resources[0].quantity,1000);
  assert.equal(r.timeHours,null);assert.equal(r.ready,false);assert.equal(r.inventoryComplete,false);
  assert.ok(r.warnings.some(w=>w.includes('库存未记录')));
});

test('材料估值调用当前依赖规则，原始时间不折算为加速材料',()=>{
  const r=calculatePlan({...path,rows:[{level:1,cost:{box:2},timeHours:24,attributes:attribute(2)}]},0,1,1,{...context,inventory:{box:0}});
  assert.equal(r.fullValue,12);assert.equal(r.materials.length,1);assert.equal(r.materials[0].price.value,6);
  const changed=structuredClone(items);changed.find(i=>i.id==='guide').prices.fc5.value=4;
  const updated=calculatePlan({...path,rows:[{level:1,cost:{box:2},timeHours:24,attributes:attribute(2)}]},0,1,1,{...context,items:changed,inventory:{box:0}});
  assert.equal(updated.fullValue,16);
});

test('只允许已记录档位，不插值、不接受重复档位或无效数值',()=>{
  const checkpoint={...path,rows:[{level:10,cost:{guide:10},timeHours:0,attributes:attribute(1)},{level:20,cost:{guide:20},timeHours:0,attributes:attribute(2)}]};
  assert.equal(calculatePlan(checkpoint,10,20,1,context).materials[0].needed,20);
  for(const [a,b,n] of [[0,0,1],[2,1,1],[0,2,0],[0,2,7],[0,1.5,1],[5,20,1]])assert.throws(()=>calculatePlan(checkpoint,a,b,n,context));
  assert.throws(()=>calculatePlan({...path,rows:[path.rows[0],path.rows[0]]},0,1,1,context));
  assert.throws(()=>calculatePlan({...path,rows:[{level:1,cost:{guide:-1}}]},0,1,1,context));
  assert.throws(()=>calculatePlan(path,0,1,1,{...context,inventory:{guide:NaN}}));
});

test('未核实消耗和缺失属性保留限制，不合并攻击与生命等不同属性',()=>{
  const p={...path,costStatus:'unverified',rows:[{level:1,cost:{guide:1},timeHours:0,attributes:[...attribute(2),{key:'infantry-health',name:'盾兵生命',value:3,unit:'%'}]}]};
  const r=calculatePlan(p,0,1,1,context);
  assert.equal(r.ready,false);assert.equal(r.attributes.length,2);assert.equal(r.attributes[0].delta,2);assert.equal(r.attributes[1].delta,null);
});

test('旧备份缺规划字段可迁移，规划状态拒绝越界数据且只重建已知字段',()=>{
  assert.deepEqual(validatePlanningState(undefined),{systemId:'chief-gems',pathId:'',from:0,to:1,pieces:1});
  const input={systemId:'t11',pathId:'branch',from:2,to:3,pieces:1,extra:'不保留'};
  assert.equal(validatePlanningState(input).extra,undefined);
  for(const change of [x=>x.from=-1,x=>x.to=2,x=>x.to=Infinity,x=>x.pieces=19,x=>x.pathId='a'.repeat(181),x=>x.systemId='',x=>x.pathId='\u0000']){
    const changed={...input};change(changed);assert.throws(()=>validatePlanningState(changed));
  }
  assert.throws(()=>validatePlanningState(null));assert.throws(()=>validatePlanningState([]));
});

test('系统开放与价格类别分开：T11和专家明确限制，T12始终要求实际开放确认',()=>{
  assert.equal(planningAvailability('t11',{heroGeneration:4,fireProgress:'fc5'}).available,false);
  assert.equal(planningAvailability('t11',{heroGeneration:4,fireProgress:'t11'}).available,true);
  assert.equal(planningAvailability('t11',{heroGeneration:7,fireProgress:'fc10'}).available,true);
  assert.equal(planningAvailability('experts',{heroGeneration:2,fireProgress:'fc3'}).available,false);
  assert.equal(planningAvailability('experts',{heroGeneration:3,fireProgress:'fc3'}).available,true);
  assert.equal(planningAvailability('t12',{heroGeneration:15,fireProgress:'fc10'}).status,'confirmation-required');
  assert.equal(planningAvailability('t12',{heroGeneration:15,fireProgress:'t12'}).preview,true);
});

test('累计含义不明的检查点只查询目标原始数量，禁止冒充跨级配方',()=>{
 const p={id:'checkpoint',maxPieces:1,costStatus:'unverified',costMode:'checkpoint',baseline:{level:10,attributes:[]},rows:[{level:20,cost:{guide:30}},{level:30,cost:{guide:45}}]};
 const result=calculatePlan(p,10,30,1,context);
 assert.equal(result.materials[0].needed,45);assert.equal(result.ready,false);
 assert.ok(result.warnings.some(w=>w.includes('不代表从当前等级')));
});
