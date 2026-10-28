import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState,validateState} from '../src/domain/model.js';
const catalog=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
test('装备和每颗宝石目标独立保存，旧备份兼容且不覆盖当前',()=>{
 const state=initialState();state.account.chiefLoadout.helmet={gear:2,gems:[1,2,null]};
 state.chiefTargets.helmet={gear:5,gems:[3,6,null]};
 const loaded=validateState(JSON.parse(JSON.stringify(state)),catalog.items);
 assert.deepEqual(loaded.chiefTargets.helmet,{gear:5,gems:[3,6,null]});
 assert.deepEqual(loaded.account.chiefLoadout.helmet,{gear:2,gems:[1,2,null]});
 delete state.chiefTargets;assert.equal(validateState(state,catalog.items).chiefTargets.helmet.gear,null);
 state.chiefTargets={helmet:{gear:999,gems:[null,null,null]}};assert.throws(()=>validateState(state,catalog.items));
});
