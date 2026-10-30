import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/data/catalog.json' with {type:'json'};
import {expectedContents,valueContents} from '../src/domain/valuation.js';
import {getPrice,validateState,initialState} from '../src/domain/model.js';
import {inventoryUnit,inventoryDisplayQuantity,inventoryStoredQuantity} from '../src/domain/inventory-units.js';
import {inventoryGroupsView} from '../src/ui/inventory-groups.js';
const items=catalog.items,item=id=>items.find(i=>i.id===id),stage='gen7-fc10-gen8';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const expected=(id,resource)=>expectedContents(item(id).valuation).components.filter(c=>c.itemId===resource).reduce((s,c)=>s+c.expectedQuantity,0);

test('七种新箱概率完整，大小零件、分钟加速及重复奖励均正确折算',()=>{
 const ids=['fire-weekly-chest','mobilization-supply-chest','seekers-chest','arena-star-chest','ironbark-chest','kingdom-light-chest','elite-guard-chest'];
 for(const id of ids)close(item(id).valuation.outcomes.reduce((s,o)=>s+o.probability,0),1);
 close(expected('fire-weekly-chest','fire-crystal'),7.18);
 close(expected('mobilization-supply-chest','diamond'),100);
 close(expected('mobilization-supply-chest','speed-general'),.37/6);
 close(expected('seekers-chest','screw'),.05);
 close(expected('arena-star-chest','screw'),.12);
 close(expected('ironbark-chest','fire-crystal'),.32);
 close(expected('kingdom-light-chest','speed-learning'),.291);
 close(expected('elite-guard-chest','diamond'),142);
 close(expected('fire-crystal-box','fire-crystal'),12.8);
 assert.equal(item('fire-weekly-chest').category,'火晶');
 assert.equal(item('mobilization-supply-chest').category,'宝箱');
 assert.ok(ids.slice(2).every(id=>item(id).category==='宝箱'));
});

test('缺少增益道具价格时铁枝宝箱保持缺价，不当作零价值；其余新箱正常估值',()=>{
 assert.equal(getPrice(item('ironbark-chest'),stage,{},false,items),null);
 const result=valueContents(item('ironbark-chest'),stage,items,(i,s,seen)=>getPrice(i,s,{},false,items,seen));
 assert.equal(result.missing.length,2);assert.ok(result.partialValue>0);
 for(const id of ['fire-weekly-chest','mobilization-supply-chest','seekers-chest','arena-star-chest','kingdom-light-chest','elite-guard-chest'])assert.ok(getPrice(item(id),stage,{},false,items)?.value>0,id);
});

test('钢材钻石以万显示并可录小数，旧库存和历史仍保存原始个数',()=>{
 for(const id of ['steel','diamond']){
  const i=item(id);assert.equal(inventoryUnit(i),'万');close(inventoryDisplayQuantity(i,584054),58.4054);
  assert.equal(inventoryStoredQuantity(i,'58.4054'),584054);
  assert.equal(inventoryStoredQuantity(i,'0'),0);
  assert.throws(()=>inventoryStoredQuantity(i,'0.00001'));
 }
 const state=initialState();state.account.inventory={steel:20000,diamond:584054};
 state.account.history=[{id:'units',at:'2026-10-30T00:00:00.000Z',note:'',accountName:'',inventory:{diamond:12345}}];
 const saved=validateState(state,items);assert.equal(saved.account.inventory.diamond,584054);assert.equal(saved.account.history[0].inventory.diamond,12345);
 const html=inventoryGroupsView([item('steel'),item('diamond')],state.account.inventory,'',{esc:String,artIcon:()=>'',fmt:String,money:String,getPrice:()=>null,stage});
 assert.ok(html.includes('value="58.4054"'));assert.ok(html.includes('value="2"'));assert.ok(html.includes('step="0.0001"'));
});
