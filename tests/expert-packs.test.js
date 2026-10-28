import test from 'node:test';
import assert from 'node:assert/strict';
import {getPrice} from '../src/domain/model.js';
import {readFile} from 'node:fs/promises';
const {items,sources}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const evidence=JSON.parse(await readFile(new URL('../src/data/expert-packs.json',import.meta.url)));
const price=id=>items.find(i=>i.id===id).prices['gen7-fc10-gen8'];
test('截图三款专家常规礼包及单位换算与模型一致',async()=>{
  assert.equal(evidence.packs.length,3);
  for(const p of evidence.packs){assert.equal(p.cash,30);assert.equal(p.visibleDiamonds,2500);}
  assert.equal(price('expert-mark').value,30/8);
  assert.ok(Math.abs(price('affection').value-30/(8*1000+8*100)*10000)<.0001);
  assert.equal(price('knowledge').value,(30-8*.556)/500*1000);
  assert.equal(items.find(i=>i.id==='knowledge').priceScale,1000);
  assert.equal(items.find(i=>i.id==='knowledge').prices['gen7-fc8'].value,51.104);
  const source=sources.find(s=>s.id==='expert-packs-screenshot');
  assert.equal(source.url,evidence.imageUrl);
  assert.ok((await readFile(new URL('..'+source.url,import.meta.url))).length>0);
});

test('专家全进度按常规礼包，学识随加速价更新且仍受三代开放限制',()=>{
  const resolve=(id,stage,list=items,context={})=>getPrice(list.find(i=>i.id===id),stage,{},false,list,new Set(),context);
  for(const stage of ['fc3','fc5','t11','gen6-fc8','gen7-fc8','gen7-fc10-gen8']){
    assert.equal(resolve('expert-mark',stage).value,3.75);
    assert.equal(resolve('affection',stage).value,30/8800*10000);
  }
  assert.equal(resolve('knowledge','fc3').value,(30-8*30/(26+172/12))/500*1000);
  const changed=structuredClone(items);
  changed.find(i=>i.id==='speed-legacy').prices.fc3={value:.75,kind:'reference'};
  assert.equal(resolve('knowledge','fc3',changed).value,48);
  assert.equal(resolve('expert-mark','fc3',items,{progress:{heroGeneration:2,fireProgress:'fc3'}}),null);
  assert.equal(resolve('knowledge','pre-crystal'),null);
});
test('附带奖励不当成零价值，截图不完整及加速同价口径明确',()=>{
  assert.match(evidence.completeness,/未完全/);
  assert.match(evidence.valuationConvention,/不扣除/);
  for(const id of ['expert-mark','affection','knowledge']){
    assert.equal(price(id).source,'expert-packs-screenshot');
    assert.match(price(id).note,/未扣除/);
  }
  assert.match(price('knowledge').note,/各类小时加速同价/);
});


test('各类小时加速引用统一价格，调价同时生效且行军加速器独立',()=>{
  for(const id of ['speed-general','speed-build','speed-research','speed-training','speed-healing','speed-learning']){
    const material=items.find(i=>i.id===id);
    assert.equal(getPrice(material,'gen7-fc10-gen8',{},false,items).value,.556);
  }
  const changed=structuredClone(items);changed.find(i=>i.id==='speed-legacy').prices['gen7-fc10-gen8'].value=.7;
  assert.equal(getPrice(changed.find(i=>i.id==='speed-learning'),'gen7-fc10-gen8',{},false,changed).value,.7);
  assert.equal(items.find(i=>i.id==='march-speed-1').priceAlias,undefined);
});
