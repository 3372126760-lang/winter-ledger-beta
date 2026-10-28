import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateRefinement,parseRefinementMethod,REFINEMENT_TIERS,tierExpectation} from '../src/domain/refinement.js';
import {getPrice,estimateGift,initialState,validateState} from '../src/domain/model.js';
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('截图五档概率合计100%，期望分别为1.45、2.15、3.18、3.435、3.71',()=>{
  const expected=[1.45,2.15,3.18,3.435,3.71];
  REFINEMENT_TIERS.forEach((t,i)=>{close(t.outcomes.reduce((s,[,p])=>s+p,0),1);close(tierExpectation(t),expected[i]);});
});
test('四种指定方式的周消耗和期望产量，首日首次也半价',()=>{
  for(const [method,cost,output] of [['1+6',70,10.15],['14+6',330,29],['22+6',640,46.2],['40+6',1690,91.08]]){
    const r=calculateRefinement(method,.341686);
    close(r.totalFire,cost);close(r.totalOutput,output);close(r.unitPrice,cost*.341686/output);
    close(r.days[0].draws[0].cost,10);
    assert.equal(r.days.filter(d=>d.discount>0).length,7);
  }
});
test('跨20、40、60、80次时后续每日半价依据周序号而非每天重置档位',()=>{
  for(const [first,cost,expected] of [[20,25,2.15],[40,50,3.18],[60,65,3.435],[80,80,3.71]]){
    const r=calculateRefinement(first+'+6');
    close(r.days[1].fireCost,cost);close(r.days[1].expectedOutput,expected);
    assert.equal(r.days[1].draws[0].weeklyIndex,first+1);
  }
});
test('7日自由安排、无精炼日、第二天多次与周末归档',()=>{
  assert.deepEqual(parseRefinementMethod('14，1，1，1，1，1，1'),[14,1,1,1,1,1,1]);
  close(calculateRefinement('14+6').totalFire,calculateRefinement('14,1,1,1,1,1,1').totalFire);
  const r=calculateRefinement('0,2,0,0,0,0,0');close(r.totalFire,30);close(r.totalOutput,2.9);
  assert.equal(r.days[0].discount,0);assert.equal(r.days[1].draws[1].half,false);
  const full=calculateRefinement('100');close(full.totalFire,9190);
  assert.equal(full.days[0].last,100);assert.equal(full.buckets.every(b=>b.count===20),true);
});
test('无价格仍可算资源，拒绝超过100次及无效输入',()=>{
  assert.equal(calculateRefinement('1+6').unitPrice,null);
  assert.equal(calculateRefinement('1+6',0).unitPrice,0);
  for(const method of ['0+0','100+6','95+6','2+7','-1+6','1.5+6','1+1+1','1,2','foo','',null])assert.throws(()=>calculateRefinement(method));
  assert.equal(calculateRefinement('94+6').weeklyCount,100);
});
test('汇总与逐次枚举独立核对：每日一次半价，单次产量不打折',()=>{
  const r=calculateRefinement('19,3,20,20,20,9,9');
  let index=0,cost=0,output=0;
  for(const count of r.schedule)for(let i=0;i<count;i++){
    index++;const tier=REFINEMENT_TIERS[Math.floor((index-1)/20)];
    cost+=tier.cost*(i===0?.5:1);output+=tierExpectation(tier);
  }
  close(r.totalFire,cost);close(r.totalOutput,output);
  close(r.buckets.reduce((s,b)=>s+b.fireCost,0),cost);
  close(r.days.reduce((s,d)=>s+d.expectedOutput,0),output);
});
test('精炼方式决定精炼火晶价格，价格表与礼包估值口径一致',()=>{
  const item=items.find(i=>i.id==='refined-fire-crystal'),stage='gen7-fc10-gen8';
  const expected=calculateRefinement('40+6',items.find(i=>i.id==='fire-crystal').prices[stage].value).unitPrice;
  close(getPrice(item,stage,{},false,items,new Set(),{refinementMethod:'40+6'}).value,expected);
  close(estimateGift({stage,cash:30,refinementMethod:'40+6',lines:[{itemId:item.id,quantity:10}]},items).total,expected*10);
  assert.equal(getPrice(item,'pre-crystal',{},false,items),null);
  assert.equal(getPrice(item,stage,{},false,items,new Set(),{refinementMethod:'100+6'}),null);
});
test('精炼方式保存和导入兼容旧备份，非法方式不能覆盖草稿',()=>{
  const s=initialState();s.refinement.method='22+6';
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s)),items),s);
  delete s.refinement;assert.equal(validateState(s,items).refinement.method,'1+6');
  s.refinement={method:'99+6'};assert.throws(()=>validateState(s,items));
});


test('1+6至94+6全部94种方式均可计算，折扣随实际周序号跨档',()=>{
  const costs=[20,50,100,130,160],yields=[1.45,2.15,3.18,3.435,3.71];
  for(let n=1;n<=94;n++){
    const r=calculateRefinement(n+'+6',.341686);
    let cost=0,output=0;
    for(let k=1;k<=n+6;k++){
      const tier=Math.floor((k-1)/20);
      cost+=costs[tier]*(k===1||k>n?.5:1);output+=yields[tier];
    }
    assert.equal(r.weeklyCount,n+6);close(r.totalFire,cost);close(r.totalOutput,output);
    assert.ok(Number.isFinite(r.unitPrice));
  }
  const last=calculateRefinement('94+6');
  close(last.totalFire,8710);close(last.totalOutput,278.5);
});
