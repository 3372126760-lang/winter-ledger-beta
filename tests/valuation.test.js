import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPrice,estimateGift} from '../src/domain/model.js';
import {pityDistribution,expectedContents} from '../src/domain/valuation.js';
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const stage='gen7-fc10-gen8',item=id=>items.find(i=>i.id===id),price=(id,list=items)=>getPrice(list.find(i=>i.id===id),stage,{},false,list);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('蓝装紫装按维护者指定零件数量计价',()=>{
  close(price('rare-gear').value,.6*.455);close(price('epic-gear').value,1.5*.455);
});
test('随机宝箱逐项求期望，合金按实际数量换算每100个价格',()=>{
  close(price('charm-random').value,.965625);
  close(price('chief-random').value,469*.057/100+2.345*.057+1.9625*.279);
  close(price('chief-box').value,.279+4*.057+400*.057/100);
  close(price('fire-crystal-box').value,12.8*.341686);
});
test('100箱保底采用循环期望，非基础1%加1%，不重复计奖',()=>{
  const rule=item('equipment-box').rewardRule,dist=pityDistribution(rule.outcomes,rule.guaranteedItemId,100);
  // Enumerate the stopping-time distribution independently of the survival sum.
  let mean=0;for(let n=1;n<100;n++)mean+=n*.99**(n-1)*.01;
  mean+=100*.99**99;
  close(dist.cycleLength,mean);close(dist.guaranteedRate,1/mean);
  close(dist.outcomes.reduce((s,r)=>s+r.probability,0),1);
  const r=1/mean;
  close(price('equipment-box').value,.833);
  close(price('orange-gear').value,(.833-(1-r)*(.89/.99*.6+.10/.99*1.5)*.455)/r);
  close(price('orange-gear').value,33.19423175487476);
  close(r*price('orange-gear').value+(1-r)*(.89/.99*.6+.10/.99*1.5)*.455,.833);
  assert.notEqual(r,.02);
});
test('保底边界：每次保底、基础概率零或百分百',()=>{
  const o=[{itemId:'gold',quantity:1,probability:0},{itemId:'blue',quantity:1,probability:1}];
  close(pityDistribution(o,'gold',100).guaranteedRate,.01);
  close(pityDistribution(o,'gold',1).guaranteedRate,1);
  close(pityDistribution([{itemId:'gold',quantity:1,probability:1}],'gold',100).guaranteedRate,1);
  assert.throws(()=>pityDistribution(o,'gold',0));
  assert.throws(()=>expectedContents({type:'random',outcomes:[{itemId:'a',quantity:1,probability:.5}]}));
});
test('零件调价改变反推橙装价格，装备箱保持原参考价',()=>{
  const changed=structuredClone(items);changed.find(i=>i.id==='screw').prices[stage].value=1;
  close(price('rare-gear',changed).value,.6);close(price('epic-gear',changed).value,1.5);
  close(price('equipment-box',changed).value,.833);
  assert.ok(price('orange-gear',changed).value<price('orange-gear').value);
  const result=estimateGift({stage,cash:30,lines:[{itemId:'equipment-box',quantity:100}]},items);
  close(result.total,price('equipment-box').value*100);
});
test('缺价、身份未知、自选未指定及循环依赖均不回退旧箱价',()=>{
  const changed=structuredClone(items);delete changed.find(i=>i.id==='polish').prices[stage];
  assert.equal(price('chief-box',changed),null);assert.equal(price('chief-random',changed),null);
  for(const id of ['hero-song-choice'])assert.equal(price(id),null);
  const cycle={id:'cycle',priceScale:1,prices:{},valuation:{type:'fixed',contents:[{itemId:'cycle',quantity:1}]}};
  assert.equal(getPrice(cycle,stage,{},false,[cycle]),null);
});
test('改名保留旧名称与稳定ID，概率和固定奖励都有来源',()=>{
  assert.equal(item('screw').name,'强化经验零件');assert.ok(item('screw').aliases.includes('螺丝'));
  assert.equal(item('equipment-box').name,'英雄装备幸运宝箱');
  for(const i of items.filter(i=>i.valuation))assert.ok(i.valuation.source);
});


test('各进度装备箱参考价保持不变；缺少反推依据时橙装缺价',()=>{
  for(const [stage,p] of Object.entries(item('equipment-box').prices)){
    close(getPrice(item('equipment-box'),stage,{},true,items).value,p.value);
  }
  const changed=structuredClone(items);delete changed.find(i=>i.id==='equipment-box').prices[stage];
  assert.equal(price('orange-gear',changed),null);
  const missing=structuredClone(items);delete missing.find(i=>i.id==='screw').prices[stage];
  assert.equal(price('orange-gear',missing),null);
  const invalid=structuredClone(items);invalid.find(i=>i.id==='equipment-box').prices[stage].value=.01;
  assert.equal(price('orange-gear',invalid),null);
});


test('宠物自选箱身份合并，内容三选一且保留原参考价格',()=>{
  assert.equal(items.filter(i=>i.name==='宠物突破材料自选箱').length,1);
  assert.equal(item('pet-box').rewardRule.type,'choice');
  assert.deepEqual(item('pet-box').rewardRule.contents,[{itemId:'pet-manual',quantity:7},{itemId:'pet-vitality',quantity:2},{itemId:'pet-serum',quantity:1}]);
  assert.equal(price('pet-box').value,1.667);
});
