import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CHIEF_ROWS,CHIEF_SLOT_IDS,validateChiefLoadout,chiefRecordedCount,buildChiefPlanning,chiefArt} from '../src/domain/chief-loadout.js';
import {initialState,validateState} from '../src/domain/model.js';
import {validatePlanningState,calculatePlan} from '../src/domain/planning.js';
const read=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url)));
const [{items},data,art]=await Promise.all(['src/data/catalog.json','src/data/planning.json','src/data/chief-art.json'].map(read));
test('按游戏矛盾射三行排列6装备，每件3宝石，空白与0明确区分',()=>{
 assert.deepEqual(CHIEF_ROWS.map(r=>r.name),['矛兵','盾兵','射手']);
 assert.deepEqual(CHIEF_SLOT_IDS,['helmet','watch','chestplate','pants','ring','staff']);
 const state=validateChiefLoadout();assert.deepEqual(chiefRecordedCount(state),{gear:0,gems:0});
 state.helmet.gear=0;state.helmet.gems=[0,1,34];
 assert.deepEqual(chiefRecordedCount(state),{gear:1,gems:3});assert.deepEqual(state.watch.gems,[null,null,null]);
 assert.notEqual(state.helmet.gems,state.watch.gems);
});
test('现有各部位记录随账号备份保存，旧备份自动补空记录不改库存',()=>{
 const state=initialState();state.account.inventory={'charm-guide':200};state.account.chiefLoadout.helmet={gear:7,gems:[2,3,4]};
 const restored=validateState(JSON.parse(JSON.stringify(state)),items);
 assert.deepEqual(restored.account.chiefLoadout,state.account.chiefLoadout);assert.deepEqual(restored.account.inventory,state.account.inventory);
 delete state.account.chiefLoadout;assert.equal(validateState(state,items).account.chiefLoadout.helmet.gear,null);
 for(const bad of [null,[],{helmet:{gear:103,gems:[null,null,null]}},{pants:{gear:0,gems:[1,2]}},{ring:{gems:[1,-1,2]}},{staff:{gems:[1,2,35]}}])assert.throws(()=>validateChiefLoadout(bad));
});
test('规划选择读取准确部位和宝石，单位置不错误乘数量，最高档不可再升',()=>{
 const loadout=validateChiefLoadout();loadout.helmet.gear=5;loadout.helmet.gems=[1,3,7];loadout.watch.gear=10;
 const plan=buildChiefPlanning(data,loadout,'helmet','gem',1);
 assert.equal(plan.from,3);assert.equal(plan.pieces,1);assert.equal(plan.to,4);
 assert.deepEqual(validatePlanningState(plan),plan);
 assert.throws(()=>validatePlanningState({...plan,pieces:2}));
 const gear=buildChiefPlanning(data,loadout,'watch','gear',null);assert.equal(gear.from,10);
 assert.throws(()=>buildChiefPlanning(data,loadout,'pants','gear',null),/先填写/);
 loadout.watch.gear=102;assert.throws(()=>buildChiefPlanning(data,loadout,'watch','gear',null),/最高/);
 assert.throws(()=>validatePlanningState({...plan,chiefSelection:{slotId:'bad',kind:'gem',gemIndex:1}}));
 const path=data.systems.find(s=>s.id==='chief-gems').paths[0];
 const result=calculatePlan(path,plan.from,plan.to,plan.pieces,{items,stage:'fc5',inventory:{}});
 assert.equal(result.materials.find(m=>m.itemId==='charm-guide').needed,path.rows.find(r=>r.level===4).cost['charm-guide']);
});
test('装备品质对应贴图，宝石图片按兵种和真实等级，分段不误认成更高等级',()=>{
 assert.equal(chiefArt(art,{slotId:'helmet',gearLabel:'史诗1星',kind:'gear'}).image.key,'helmet:purple');
 assert.equal(chiefArt(art,{slotId:'ring',gearLabel:'神話2星',kind:'gear'}).image.key,'ring:red');
 assert.equal(chiefArt(art,{troop:'Lancer',gemLabel:'16级（3段）',kind:'gem',recorded:true}).image.key,'Lancer:16');
 const actual=chiefArt(art,{troop:'Infantry',gemLabel:'17级',kind:'gem',recorded:true});assert.equal(actual.image.key,'Infantry:17');assert.equal(actual.note,'');assert.ok(actual.image.region);
 const without=structuredClone(art);delete without.images['Infantry:17'];
 const fallback=chiefArt(without,{troop:'Infantry',gemLabel:'17级',kind:'gem',recorded:true});assert.equal(fallback.image.key,'Infantry:16');assert.match(fallback.note,/暂无/);
});
test('6件装备所需品质图与三个兵种宝石图已保存为真实PNG',async()=>{
 for(const slot of CHIEF_SLOT_IDS)for(const quality of ['green','blue','purple','gold','red'])assert.ok(art.images[`${slot}:${quality}`]);
 for(const row of CHIEF_ROWS)assert.ok(art.images[`${row.artTroop}:1`]);
 for(const record of Object.values(art.images)){
  const bytes=await readFile(new URL('..'+record.path,import.meta.url));assert.deepEqual([...bytes.subarray(0,4)],[137,80,78,71]);
 }
});
