import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { estimateGift, initialState, validateState, getPrice, gemUpgrade, STAGES } from '../src/domain/model.js';
const catalog = JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url),'utf8'));
const upgrades = JSON.parse(await readFile(new URL('../src/data/upgrades.json',import.meta.url),'utf8'));
const {items}=catalog;
const estimate=(lines,extra={})=>estimateGift({stage:'gen7-fc8',cash:30,lines,...extra},items);

test('移除道具兼容旧库存与礼包备份，保留其余记录并排除估值',()=>{
  const s=initialState();
  s.account.inventory={'hero-xp':500,'charm-guide':12};
  s.gift.lines=[{itemId:'journey',quantity:5},{itemId:'charm-guide',quantity:10}];
  s.overrides={'gen7-fc8:journey':2};
  const next=validateState(s,items.filter(i=>!['hero-xp','journey'].includes(i.id)));
  assert.deepEqual(next.account.inventory,{'charm-guide':12});
  assert.deepEqual(next.gift.lines,[{itemId:'charm-guide',quantity:10}]);
  assert.deepEqual(next.overrides,{});
  assert.equal(getPrice(items.find(i=>i.id==='journey'),'gen7-fc8'),null);
  assert.equal(estimate(s.gift.lines).results.length,1);
});

test('七代火八合金每100个计价：1000个为0.57元，库存与录入仍为实际个数',()=>{
  const r=estimate([{itemId:'alloy',quantity:1000}]);assert.ok(Math.abs(r.total-0.57)<1e-10);assert.equal(r.complete,true);
});
test('混合礼包缺价时展示部分价值，禁止给出完整倍数',()=>{
  const r=estimate([{itemId:'charm-guide',quantity:100},{itemId:'hero-song-choice',quantity:1}],{stage:'gen7-fc10-gen8'});
  assert.equal(r.total,31.25);assert.equal(r.missing,1);assert.equal(r.ratio,null);
});
test('渠道折算价默认排除，显式开启后才参与',()=>{
  const quoted=structuredClone(items);quoted.find(i=>i.id==='screw').prices.fc3.kind='channel';
  const input={stage:'fc3',cash:30,lines:[{itemId:'screw',quantity:18}]};
  assert.equal(estimateGift(input,quoted).ratio,null);
  const r=estimateGift({...input,allowQuotes:true},quoted);assert.equal(r.total,30);assert.equal(r.usesQuotes,true);
});
test('零数量缺价不阻塞，空礼包不视为完整，免费礼包不产生除零',()=>{
  assert.equal(estimate([{itemId:'charm-guide',quantity:100},{itemId:'hero-song-choice',quantity:0}]).complete,true);
  assert.equal(estimate([{itemId:'charm-guide',quantity:0}]).complete,false);
  assert.equal(estimate([{itemId:'charm-guide',quantity:100}],{cash:0}).ratio,null);
});
test('旧个人价格不覆盖维护者价格，缺价也不能通过旧覆盖补入',()=>{
  const item=items.find(x=>x.id==='charm-guide');
  assert.equal(getPrice(item,'pre-crystal',{'pre-crystal:charm-guide':0}).value,item.prices['pre-crystal'].value);
  assert.equal(getPrice(item,'gen7-fc8',{'gen7-fc8:charm-guide':999}).value,item.prices['gen7-fc8'].value);
  const r=estimateGift({stage:'gen7-fc8',cash:30,lines:[{itemId:item.id,quantity:1}]},items,{'gen7-fc8:charm-guide':999});
  assert.equal(r.total,item.prices['gen7-fc8'].value);
});

test('个数不接受分数、负数和非数值；小时接受小数',()=>{
  for(const q of [-1,NaN,0.5])assert.equal(estimate([{itemId:'charm-guide',quantity:q}]).invalid,1);
  assert.equal(estimate([{itemId:'speed-general',quantity:0.5}],{stage:'pre-crystal',allowQuotes:true}).invalid,0);
});
test('12级宝石使用580/450/15原始消耗，库存只抵扣一次',()=>{
  const r=gemUpgrade(11,12,2,upgrades.gems,{'charm-guide':600,'charm-design':900,codex:10});
  assert.deepEqual(r.materials.map(x=>x.needed),[1160,900,30]);assert.deepEqual(r.materials.map(x=>x.gap),[560,0,20]);
  assert.ok(Math.abs(r.attributePointsPerGem-9)<1e-10);
});
test('升级范围覆盖连续配方；逆向、分数和缺数据报错',()=>{
  assert.throws(()=>gemUpgrade(12,11,1,upgrades.gems,{}));assert.throws(()=>gemUpgrade(1,2,0.5,upgrades.gems,{}));
  assert.throws(()=>gemUpgrade(10,12,1,upgrades.gems.filter(x=>x.level!==11),{}));
});
test('导入校验、备份往返、未知道具与无效数值',()=>{
  const s=initialState();s.account.inventory.alloy=1000;assert.deepEqual(validateState(JSON.parse(JSON.stringify(s)),items),s);
  for(const mutate of [x=>x.stage='bad',x=>x.account.inventory.alloy=-1,x=>x.account.inventory.codex=0.5,x=>x.overrides['bad:alloy']=1,x=>x.gift.lines[0].itemId='bad',x=>x.upgrade.to=3]){
    const broken=structuredClone(s);mutate(broken);assert.throws(()=>validateState(broken,items));
  }
});
test('资料结构：七阶段、唯一道具、有限非负价格与来源完整',()=>{
  assert.equal(STAGES.length,7);assert.equal(new Set(items.map(i=>i.id)).size,items.length);
  for(const item of items){assert.ok(item.priceScale>0);for(const [stage,p]of Object.entries(item.prices)){
    assert.ok(STAGES.some(s=>s.id===stage));assert.ok(Number.isFinite(p.value)&&p.value>=0);assert.ok(catalog.sources.some(s=>s.id===p.source));
  }}
  assert.equal(items.find(i=>i.id==='charm-guide').prices['pre-crystal'].value,2/3);
  assert.equal(items.find(i=>i.id==='island-shard').prices['gen7-fc10-gen8'].value,6.8);
});


test('宠物箱旧ID在库存、礼包及备份中兼容，合并不丢失数量',()=>{
  const s=initialState();s.account.inventory={'pet-box':3,'pet-breakthrough-choice':4};
  s.gift.lines=[{itemId:'pet-breakthrough-choice',quantity:2}];
  const next=validateState(s,items);
  assert.deepEqual(next.account.inventory,{'pet-box':7});
  assert.deepEqual(next.gift.lines,[{itemId:'pet-box',quantity:2}]);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(next)),items),next);
});
