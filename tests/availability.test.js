import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPrice,estimateGift} from '../src/domain/model.js';
import {itemAvailability} from '../src/domain/availability.js';
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const find=id=>items.find(i=>i.id===id);
test('火晶/微粒/精炼按给定火晶节点解锁，不能通过渠道价开关绕过',()=>{
  for(const [id,before,after] of [['fire-crystal','pre-crystal','fc3'],['fire-crystal-box','pre-crystal','fc3'],['fire-particle','fc5','t11'],['refined-fire-crystal','t11','gen6-fc8']]){
    assert.equal(itemAvailability(find(id),before).available,false);assert.equal(itemAvailability(find(id),after).available,true);
    assert.equal(getPrice(find(id),before,{},true,items),null);
  }
});
test('同属火三价格类，二代没有专家，三代已有；火五三代也可用',()=>{
  const expert={...find('expert-mark'),prices:{fc3:{value:3.75,kind:'reference'}}};
  const second={heroGeneration:2,fireProgress:'fc3'},third={heroGeneration:3,fireProgress:'fc3'};
  assert.equal(getPrice(expert,'fc3',{},false,items,new Set(),{progress:second}),null);
  assert.equal(getPrice(expert,'fc3',{},false,items,new Set(),{progress:third}).value,3.75);
  assert.equal(itemAvailability(find('knowledge'),'fc5',{heroGeneration:3,fireProgress:'fc5'}).available,true);
});
test('火晶前常规混合礼包分摊复原30元，按100合金单位计算且不引用渠道价',()=>{
  for(const lines of [[['screw',10],['equipment-box',4]],[['polish',15],['alloy',1500]],[['chief-design',20],['polish',9],['alloy',900]],[['charm-guide',18],['charm-design',6]],[['charm-guide',7],['charm-design',7],['codex',2]]]){
    const r=estimateGift({stage:'pre-crystal',cash:30,lines:lines.map(([itemId,quantity])=>({itemId,quantity}))},items);
    assert.equal(r.complete,true);assert.ok(Math.abs(r.total-30)<1e-9);assert.equal(r.usesQuotes,false);
  }
  assert.equal(getPrice(find('speed-general'),'pre-crystal',{},false,items).value,1);
  assert.equal(getPrice(find('pet-manual'),'pre-crystal',{},false,items).value,6/7);
});
