import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChiefLoadout} from '../src/domain/chief-loadout.js';
import {batchChiefLevels,undoChiefBatch} from '../src/domain/chief-bulk.js';

test('批量默认仅填未记录位置，保留现有记录与其他种类，输入不被改写',()=>{
 const before=validateChiefLoadout();before.helmet.gear=102;before.helmet.gems[0]=16;const original=structuredClone(before);
 const result=batchChiefLevels(before,{kind:'gem',level:10});
 assert.equal(result.changes.length,17);assert.equal(result.skippedKnown,1);
 assert.equal(result.loadout.helmet.gems[0],16);assert.equal(result.loadout.helmet.gear,102);
 assert.deepEqual(result.loadout.watch.gems,[10,10,10]);assert.deepEqual(before,original);
});

test('按兵种选择两件装备或六颗宝石，明确0仍属已记录，覆盖必须显式选择',()=>{
 const before=validateChiefLoadout();before.chestplate.gems[0]=0;
 const gems=batchChiefLevels(before,{scope:'infantry',kind:'gem',level:16});
 assert.equal(gems.changes.length,5);assert.equal(gems.loadout.chestplate.gems[0],0);
 assert.deepEqual(gems.loadout.helmet.gems,[null,null,null]);
 const overwrite=batchChiefLevels(before,{scope:'infantry',kind:'gem',level:16,onlyUnrecorded:false});
 assert.equal(overwrite.changes.length,6);assert.equal(overwrite.loadout.chestplate.gems[0],16);
 const gear=batchChiefLevels(before,{scope:'marksman',kind:'gear',level:0});
 assert.equal(gear.changes.length,2);assert.equal(gear.loadout.ring.gear,0);assert.equal(gear.loadout.staff.gear,0);
 assert.equal(gear.loadout.helmet.gear,null);
 assert.equal(batchChiefLevels(overwrite.loadout,{scope:'infantry',kind:'gem',level:16,onlyUnrecorded:false}).changes.length,0);
});

test('撤销最近批量操作恢复空白，后续手动修改的字段优先保留',()=>{
 const before=validateChiefLoadout();before.helmet.gems[0]=16;
 const result=batchChiefLevels(before,{scope:'lancer',kind:'gem',level:10,onlyUnrecorded:false});
 assert.deepEqual(undoChiefBatch(result.loadout,result.changes).loadout,before);
 result.loadout.helmet.gems[1]=18;result.loadout.ring.gear=2;
 const undo=undoChiefBatch(result.loadout,result.changes);
 assert.equal(undo.restored,5);assert.equal(undo.skipped,1);
 assert.equal(undo.loadout.helmet.gems[0],16);assert.equal(undo.loadout.helmet.gems[1],18);
 assert.equal(undo.loadout.ring.gear,2);assert.equal(result.loadout.helmet.gems[0],10);
});

test('批量填写拒绝无效档位、范围和含糊的覆盖开关',()=>{
 const l=validateChiefLoadout();
 for(const input of [{kind:'gem',level:35},{kind:'gear',level:103},{kind:'gem',level:null},{kind:'gem',level:1.2},{kind:'gear',level:1,scope:'x'},{kind:'gear',level:1,onlyUnrecorded:'false'}])assert.throws(()=>batchChiefLevels(l,input));
 assert.throws(()=>undoChiefBatch(l,[{slotId:'bad',kind:'gear',before:null,after:0}]));
});

test('手动改动后即使改回批量值，撤销仍尊重该位置的手动记录',()=>{
 const before=validateChiefLoadout(),result=batchChiefLevels(before,{scope:'lancer',kind:'gear',level:1});
 const changes=result.changes.map(c=>c.slotId==='helmet'?{...c,manualEdited:true}:c);
 const undone=undoChiefBatch(result.loadout,changes);
 assert.equal(undone.restored,1);assert.equal(undone.skipped,1);
 assert.equal(undone.loadout.helmet.gear,1);assert.equal(undone.loadout.watch.gear,null);
});
