import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPrice,estimateGift,initialState,validateState,STAGES} from '../src/domain/model.js';
import {galleryArt} from '../src/domain/art.js';
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const price=(id,stage='gen7-fc10-gen8',boxChoices={},all=items)=>getPrice(all.find(i=>i.id===id),stage,{},false,all,new Set(),{boxChoices});
test('宠物材料随当前进度箱价按7/2/1折算，缺箱价时不虚构单价',()=>{
  for(const {id:stage} of STAGES){
    const box=price('pet-box',stage);
    for(const [id,count] of [['pet-manual',7],['pet-vitality',2],['pet-serum',1]]){
      const material=price(id,stage);
      if(!box)assert.equal(material,null);else assert.ok(Math.abs(material.value*count-box.value)<1e-10);
    }
  }
  const copy=structuredClone(items);copy.find(i=>i.id==='pet-box').prices['gen7-fc10-gen8'].value=7;
  assert.equal(price('pet-manual',undefined,{},copy).value,1);
});
test('维护者确认徽章30/2500、组件箱30/5，移民授权书全局移除及备份兼容',()=>{
  for(const {id} of STAGES){assert.equal(price('mystic-badge',id).value,0.012);assert.equal(price('hero-component-choice',id).value,6);}
  assert.equal(galleryArt(items).some(i=>i.id==='migration-ticket'),false);
  const state=initialState();state.account.inventory['migration-ticket']=5;state.gift.lines=[{itemId:'migration-ticket',quantity:2}];
  const next=validateState(state,items);assert.deepEqual(next.gift.lines,[]);assert.deepEqual(next.account.inventory,{});
});
test('战歌箱逐种奖励精确计价，不平均、不相加；选择随备份及礼包估值生效',()=>{
  const box=items.find(i=>i.id==='hero-song-choice');assert.equal(price(box.id),null);
  for(const reward of box.valuation.contents){
    const choices={[box.id]:reward.itemId},material=items.find(i=>i.id===reward.itemId);
    const expected=price(reward.itemId).value/material.priceScale*reward.quantity;
    assert.ok(Math.abs(price(box.id,undefined,choices).value-expected)<1e-10);
    const gift=estimateGift({stage:'gen7-fc10-gen8',cash:30,lines:[{itemId:box.id,quantity:3}],boxChoices:choices},items);
    assert.ok(Math.abs(gift.total-expected*3)<1e-10);assert.equal(gift.complete,true);
  }
  const s=initialState();s.boxChoices[box.id]='orange-shard';assert.deepEqual(validateState(JSON.parse(JSON.stringify(s)),items),s);
  s.boxChoices[box.id]='fire-crystal';assert.throws(()=>validateState(s,items));
  const old=initialState();delete old.boxChoices;assert.deepEqual(validateState(old,items).boxChoices,{});
});
