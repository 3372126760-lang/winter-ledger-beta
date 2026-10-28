import test from 'node:test';
import assert from 'node:assert/strict';
import {researchDuration,validateResearchSettings} from '../src/domain/research-time.js';
import {initialState,validateState} from '../src/domain/model.js';
import {readFile} from 'node:fs/promises';

test('研究速度按基础工期除以倍率，再扣自然等待，不能成为负加速',()=>{
 const r=researchDuration(240,100,24);assert.equal(r.duration,120);assert.equal(r.speedupHours,96);
 assert.equal(researchDuration(24,0,100).speedupHours,0);
 assert.equal(researchDuration(24,0,100).waitUsed,24);
 assert.equal(researchDuration(0,100,0).duration,0);
 assert.equal(researchDuration(null,100,0),null);
 for(const args of [[24,-1,0],[24,0,-1],[NaN,0,0],[24,Infinity,0],[24,10001,0]])assert.throws(()=>researchDuration(...args));
});

test('百分数50表示除以1.5、100表示除以2，小数百分比按同一公式且等待独立扣除',()=>{
 assert.equal(researchDuration(24,50).duration,16);
 assert.equal(researchDuration(24,100).duration,12);
 assert.equal(researchDuration(24,12.5).duration,24/1.125);
 const result=researchDuration(24,100,2);assert.equal(result.duration,12);assert.equal(result.speedupHours,10);
 assert.deepEqual(validateResearchSettings(),{speedPercent:0,waitHours:0});
 assert.deepEqual(validateResearchSettings({speedPercent:50.5,waitHours:1.25,extra:999}),{speedPercent:50.5,waitHours:1.25});
 for(const value of [null,[],{speedPercent:-1,waitHours:0},{speedPercent:Infinity,waitHours:0},{speedPercent:'100',waitHours:0},{speedPercent:100,waitHours:NaN},{speedPercent:0,waitHours:-1}])assert.throws(()=>validateResearchSettings(value));
});

test('研究速度随备份保留，旧记录默认0%，原库存与当前等级不变',async()=>{
 const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
 const state=initialState();state.account.inventory.steel=999;state.account.chiefLoadout.helmet.gear=1;
 state.research={speedPercent:83.75,waitHours:24};const account=structuredClone(state.account);
 const restored=validateState(JSON.parse(JSON.stringify(state)),items);
 assert.deepEqual(restored.research,state.research);assert.deepEqual(restored.account,account);
 delete state.research;assert.deepEqual(validateState(state,items).research,{speedPercent:0,waitHours:0});
 state.research={speedPercent:-1,waitHours:0};assert.throws(()=>validateState(state,items));
});
