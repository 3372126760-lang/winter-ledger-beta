import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePlan} from '../src/domain/planning.js';
const path=resources=>({costStatus:'available',baseline:{level:0},rows:[{level:1,cost:{},resources,timeHours:0}]});
test('肉木煤铁不影响价格完整性',()=>{const r=calculatePlan(path({'生肉':1,'木材':2,'煤矿':3,'铁矿':4}),0,1,1);assert.equal(r.priceComplete,true);assert.ok(!r.warnings.some(w=>w.includes('未定价')));});
test('专家经验按秒换算小时学习加速并扣库存',()=>{const r=calculatePlan(path({'专家技能经验':7200}),0,1,1,{stage:'fc5',items:[{id:'speed-learning',name:'学习加速',priceScale:1,prices:{fc5:{value:0.5,kind:'reference'}}}],inventory:{'speed-learning':1}});assert.equal(r.materials[0].needed,2);assert.equal(r.partialValue,1);assert.equal(r.knownGapValue,0.5);assert.equal(r.resources.length,0);});
