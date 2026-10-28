import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBattleProfile} from '../src/domain/battle-profile.js';
import {growthRecordsView} from '../src/ui/growth-records.js';
import data from '../src/data/planning.json' with {type:'json'};
test('计划必须高于当前，旧计划达成后清除，保留其他路径',()=>{
 const profile=validateBattleProfile({levels:{a:10,b:5,c:2},planned:{a:9,b:5,c:3,d:7}});
 assert.deepEqual(profile.planned,{c:3,d:7});
 assert.deepEqual(validateBattleProfile(profile),profile);
});
test('英雄专精计划下拉框只保留更高分段，当前框仍可编辑全部等级',()=>{
 const id='hero-mastery-infantry-goggles-staged';
 const html=growthRecordsView(data,'hero-gear',{battleProfile:{levels:{[id]:19},planned:{[id]:14}}},s=>String(s));
 const select=type=>html.match(new RegExp(`<select data-growth-record="${type}" data-growth-path="${id}"[^>]*>([\\s\\S]*?)</select>`))[1];
 const values=type=>[...select(type).matchAll(/<option value="(\d+)"/g)].map(m=>Number(m[1]));
 assert.ok(values('planned').length>0);assert.ok(values('planned').every(n=>n>19));
 assert.ok(values('levels').includes(0));assert.ok(values('levels').includes(19));
});
