import test from 'node:test';
import assert from 'node:assert/strict';
import info from '../src/data/pet-board.json' with {type:'json'};
import data from '../src/data/planning.json' with {type:'json'};
import {petStatsAt,validatePetRefinements} from '../src/domain/pets.js';
import {validateBattleProfile} from '../src/domain/battle-profile.js';
import {growthRecordsView} from '../src/ui/growth-records.js';
const path=data.systems.find(s=>s.id==='pets').paths.find(p=>p.id==='pet-detailed-cave-hyena');
test('14只宠物7代各有本地头像，突破前后攻防正确分开',()=>{
 assert.equal(info.pets.length,14);assert.deepEqual([...new Set(info.pets.map(p=>p.generation))],[1,2,3,4,5,6,7]);
 for(const p of info.pets)assert.ok(p.image.startsWith('/public/assets/pets/'));
 const before=path.rows.find(r=>r.petLevel===50&&r.phase==='before-breakthrough'),after=path.rows.find(r=>r.petLevel===50&&r.phase==='after-breakthrough');
 assert.deepEqual(petStatsAt(path,before.level),[4.4,4.4]);assert.deepEqual(petStatsAt(path,after.level),[5.02,5.02]);
});
test('洗炼保存保留六项各自品质，0与未记录区分并拦截超限',()=>{
 const records={[path.id]:{current:{'infantry.health':{value:0,color:'white'},'lancer.lethality':{value:1.67,color:'green'}},planned:{'infantry.health':{value:3,color:'blue'}}}};
 const profile=validateBattleProfile({petRefinements:records});assert.deepEqual(profile.petRefinements,records);assert.deepEqual(validateBattleProfile(JSON.parse(JSON.stringify(profile))),profile);
 assert.throws(()=>validatePetRefinements({[path.id]:{current:{'infantry.health':{value:7,color:'orange'}}}}));
});
test('账号只填当前，规划显示独立计划与六项洗炼展开项',()=>{
 const html=mode=>growthRecordsView(data,'pets',{battleProfile:{}},String,{mode});
 assert.equal((html('planning').match(/data-pet-detail=/g)||[]).length,14);
 assert.ok(html('planning').includes('data-growth-record="planned"'));assert.ok(!html('current').includes('data-growth-record="planned"'));
 assert.ok(html('planning').includes('盾兵穿透'));assert.ok(html('planning').includes('射手生命'));
});
