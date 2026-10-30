import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/data/catalog.json' with {type:'json'};
import data from '../src/data/planning.json' with {type:'json'};
import {getPrice,initialState,validateState} from '../src/domain/model.js';
import {expertAffinityTotal,expertUsableInventory} from '../src/domain/expert-inventory.js';
import {calculatePlan} from '../src/domain/planning.js';
import {inventoryGroupsView} from '../src/ui/inventory-groups.js';
import {createArtResolver} from '../src/domain/art.js';
import art from '../src/data/item-art.json' with {type:'json'};
import {itemAvailability} from '../src/domain/availability.js';

test('养成材料按用途分类，往届箱子按代数独立保存并使用固定代数贴图',()=>{
 for(const [id,category]of [['charm-random','领主宝石'],['chief-box','领主装备'],['screw','英雄装备'],['mithril','英雄装备'],['fire-crystal-box','火晶'],['orange-shard','英雄'],['knowledge','专家']])assert.equal(catalog.items.find(i=>i.id===id).category,category);
 const boxes=catalog.items.filter(i=>i.inventoryGeneration);
 assert.equal(boxes.length,14);
 const inventory={'hero-component-choice':5,'hero-component-s4':4,'hero-component-s8':19};
 const state=initialState();state.account.inventory=inventory;
 assert.deepEqual(validateState(state,catalog.items).account.inventory,inventory);
 const resolve=createArtResolver(art.entries,catalog.items,()=>11);
 for(const i of boxes)assert.equal(resolve(i).displayGeneration,i.inventoryGeneration);
 assert.equal(itemAvailability(boxes.find(i=>i.inventoryGeneration===10),'gen7-fc10-gen8',{heroGeneration:11,fireProgress:'fc10'}).available,true);
 const options={esc:String,artIcon:()=>'',fmt:String,money:String,getPrice:()=>null,stage:'gen7-fc10-gen8'};
 const html=inventoryGroupsView(catalog.items.filter(i=>i.category==='专家'),{},'',options);
 assert.equal((html.match(/class="inventory-category"/g)||[]).length,1);
 assert.equal((html.match(/class="inventory-subgroup"/g)||[]).length,3);
});

test('三种礼物独立定价与合计，旧记录保留，空白不伪装为0',()=>{
 const base=getPrice(catalog.items.find(i=>i.id==='affection'),'gen7-fc10-gen8',{},false,catalog.items);
 for(const [id,points]of [['expert-compass',10],['expert-heart',100],['expert-sail',1000]]){
  const price=getPrice(catalog.items.find(i=>i.id===id),'gen7-fc10-gen8',{},false,catalog.items);
  assert.equal(price.value,base.value/10000*points);
 }
 const inventory={'expert-compass':3,'expert-heart':2,'expert-sail':1,affection:50};
 assert.deepEqual(expertAffinityTotal(inventory),{points:1280,recorded:4,complete:true});
 assert.equal(expertAffinityTotal({}).recorded,0);
 const state=initialState();state.account.inventory=inventory;
 assert.deepEqual(validateState(state,catalog.items).account.inventory,inventory);
});

test('专属印记只抵对应专家，通用单独保存，礼物折算后进入好感度规划',()=>{
 const inventory={'expert-mark':5,'expert-sigil-kathy':8,'expert-sigil-justus':20,'expert-sail':1};
 const paths=data.systems.find(s=>s.id==='experts').paths;
 const kathy=paths.find(p=>p.id==='expert-凯西-advancement');
 assert.equal(expertUsableInventory(kathy,inventory)['expert-mark'],13);
 assert.equal(calculatePlan(kathy,0,1,1,{inventory}).materials[0].gap,0);
 assert.equal(expertUsableInventory(paths.find(p=>p.id==='expert-Justus-advancement'),inventory)['expert-mark'],25);
 assert.equal(expertUsableInventory(kathy,inventory).affection,1000);
 assert.equal(inventory['expert-mark'],5);
});

test('库存分组不重复道具，12种印记归同组，加速归同组，可按类别查找',()=>{
 const options={esc:String,artIcon:()=>'',fmt:String,money:String,getPrice:()=>null,stage:'gen7-fc10-gen8'};
 const html=inventoryGroupsView(catalog.items,{},'专家印记',options);
 assert.equal((html.match(/data-stock=/g)||[]).length,12);
 const speed=inventoryGroupsView(catalog.items,{},'各类小时加速',options);
 assert.equal((speed.match(/data-stock=/g)||[]).length,7);
 assert.ok(!speed.includes('expert-sigil'));
});
