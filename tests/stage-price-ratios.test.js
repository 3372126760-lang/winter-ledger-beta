import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPrice,STAGES} from '../src/domain/model.js';
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const price=(id,stage,list=items)=>getPrice(list.find(i=>i.id===id),stage,{},false,list)?.value;
test('火五冲突项按网页30元实际奖励折算，依赖估值同步更新',()=>{
 for(const [id,quantity] of [['equipment-box',18],['mastery-stone',18],['charm-design',57],['charm-guide',51],['fire-crystal',48]])assert.equal(price(id,'fc5'),30/quantity);
 assert.equal(price('steel','fc5'),7.5);assert.equal(price('steel','fc3'),7.5);assert.equal(price('steel','t11'),4);
 assert.equal(price('speed-general','fc5'),30/46);
 assert.equal(price('pet-food','fc5'),30/12900*10000);
 assert.equal(price('screw','t11'),30/42);
 assert.equal(price('knowledge','fc5'),(30-8*30/46)/500*1000);
 assert.ok(Math.abs(7*price('charm-design','fc5')+7*price('charm-guide','fc5')+2*price('codex','fc5')-30)<1e-9);
 const changed=structuredClone(items);changed.find(i=>i.id==='equipment-box').prices.fc5.value=2;
 assert.notEqual(price('orange-gear','fc5',changed),price('orange-gear','fc5'));
});
test('橙碎统一，蓝印记与钻石按各阶段金印记联动且计价单位正确',()=>{
 for(const {id:s} of STAGES){
  assert.equal(price('orange-shard',s),2.5);assert.equal(price('island-shard',s),6.8);
  assert.equal(price('pet-blue',s),price('pet-gold',s)/8);
  assert.equal(price('diamond',s),price('pet-blue',s)*20);
 }
 const changed=structuredClone(items);changed.find(i=>i.id==='pet-gold').prices.fc3.value=8;
 assert.equal(price('pet-blue','fc3',changed),1);assert.equal(price('diamond','fc3',changed),20);
});
test('火三萌宠及加速已进入参考价，秘典常规礼包按进度材料扣除后复原30元',()=>{
 assert.equal(price('pet-box','fc3'),2.5);assert.ok(Math.abs(price('pet-manual','fc3')-2.5/7)<1e-12);
 assert.equal(price('pet-vitality','fc3'),1.25);assert.equal(price('pet-serum','fc3'),2.5);
 assert.equal(price('pet-blue','fc3'),1.25);assert.equal(price('diamond','fc3'),25);
 for(const {id:s} of STAGES)assert.ok(Math.abs(7*price('charm-guide',s)+7*price('charm-design',s)+2*price('codex',s)-30)<1e-9);
 assert.equal(price('speed-general','fc3'),30/(26+172/12));
 const changed=structuredClone(items);delete changed.find(i=>i.id==='charm-design').prices.fc3;
 assert.equal(price('codex','fc3',changed),undefined);
});

test('领主装备遵循最新网页指示，两阶段采用更低的材料分摊价',async()=>{
 const offers=JSON.parse(await readFile(new URL('../src/data/offers.json',import.meta.url)));
 const {corrections}=JSON.parse(await readFile(new URL('../src/data/offer-corrections.json',import.meta.url)));
 assert.equal(corrections.some(c=>c.packId==='special-33'),false);
 const section=offers.packs.find(p=>p.id==='special-33').sections.find(s=>s.id==='special-33-s1');
 assert.deepEqual(section.rows.map(r=>Number(r.materials[1].rawQuantity)),[17,34,68,170,340]);
 assert.ok(Math.abs(17*price('chief-design','fc3')+17*price('chief-box','fc3')-30)<1e-9);
 assert.ok(Math.abs(42*price('chief-design','fc5')+12*price('chief-box','fc5')-30)<1e-9);
 for(const [stage,q] of [['fc3',150],['fc5',180]])assert.ok(Math.abs(q*price('polish',stage)+q*price('alloy',stage)-30)<1e-9);
 assert.ok(price('chief-random','fc3')>0);
});
