import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/planning.json' with {type:'json'};
import pets from '../src/data/pet-board.json' with {type:'json'};
import {heroGearPairs,heroGearAttribute,heroGearPrerequisites,masteryLevelAt,requiredMastery} from '../src/domain/hero-gear-attributes.js';
import {masterySequence} from '../src/domain/hero-mastery.js';
import {normalizeT12Attributes} from '../src/domain/t12-attributes.js';
import {estimatePetRefinement,petRefinementBands,refinementInventoryBudget,refinementPlanBudget} from '../src/domain/pet-refinement-cost.js';
import {calculatePlan} from '../src/domain/planning.js';
import {createBattleProfile} from '../src/ui/battle-profile.js';
import {initialState} from '../src/domain/model.js';

const pair=heroGearPairs(data).find(p=>p.strength.id==='hero-strength-marksman-boots');
test('橙装基础与专精联乘：0、9、10级与子阶段；未知不视为0，红装按维护者公式',()=>{
 const profile={levels:{[pair.strength.id]:100,[pair.mastery.id]:masterySequence(9)},planned:{[pair.mastery.id]:masterySequence(10)}};
 assert.equal(heroGearAttribute(pair.strength,pair.mastery,profile).value,95);
 assert.equal(heroGearAttribute(pair.strength,pair.mastery,profile,'planned').value,100);
 profile.levels[pair.mastery.id]=0;assert.equal(heroGearAttribute(pair.strength,pair.mastery,profile).value,50);
 delete profile.levels[pair.mastery.id];assert.equal(heroGearAttribute(pair.strength,pair.mastery,profile).value,null);
 profile.levels[pair.strength.id]=1;assert.equal(heroGearAttribute(pair.strength,pair.mastery,profile).value,3.8);
 profile.levels[pair.strength.id]=35;profile.levels[pair.mastery.id]=0;assert.equal(heroGearAttribute(pair.strength,pair.mastery,profile).value,19.66);
 profile.levels[pair.strength.id]=101;profile.levels[pair.mastery.id]=masterySequence(10);assert.equal(heroGearAttribute(pair.strength,pair.mastery,profile).value,101);
 assert.equal(masteryLevelAt(pair.mastery,masterySequence(9)+1),9.2);
});

test('专精及红装赋能前置在边界逐一检查，子阶段不足整级不能解锁',()=>{
 assert.ok(heroGearPrerequisites(19,1).length);assert.deepEqual(heroGearPrerequisites(20,1),[]);
 for(const [strength,required]of [[101,10],[119,10],[120,11],[140,12],[160,13],[180,14],[200,15]]){
  assert.equal(requiredMastery(strength),required);
  assert.ok(heroGearPrerequisites(strength,required-.2).length);
  assert.deepEqual(heroGearPrerequisites(strength,required),[]);
 }
});

test('T12原值100为1个百分点；煌耀征程3%，容量600人，重复处理不再缩小',()=>{
 const paths=data.systems.find(s=>s.id==='t12').paths;
 const p=paths.find(p=>p.id==='t12-g4-shield'),r=p.rows[0];
 assert.deepEqual(r.attributes,[{key:'t12.infantry.lethality',name:'盾兵穿透力',value:3,unit:'%'}]);
 assert.equal(r.sourceEffect,'盾兵杀伤力+300');assert.equal(r.effect,'盾兵穿透力+3%');
 assert.deepEqual(normalizeT12Attributes(p),p);
 assert.equal(calculatePlan(p,0,1,1).attributes[0].delta,3);
 assert.equal(paths[0].rows[0].attributes[0].value,600);assert.equal(paths[0].rows[0].attributes[0].unit,'人');
 for(const path of paths)for(const row of path.rows)assert.ok(!row.effect.includes('杀伤力'));
});

test('宠物跨品质分段计蓝石、整条最后取整；未知和金石不补零，每只都覆盖五段',()=>{
 const p={maxRefinement:10};
 assert.equal(estimatePetRefinement(p,0,1).blue,15);
 assert.equal(estimatePetRefinement(p,.5,1.5).blue,20);
 assert.equal(estimatePetRefinement(p,0,10).blue,520);
 assert.equal(estimatePetRefinement(p,1.01,1.02).blue,1);
 assert.equal(estimatePetRefinement(p,null,1).blue,null);
 assert.equal(estimatePetRefinement(p,1,2).gold,null);
 assert.equal(estimatePetRefinement(p,2,1).blue,null);
 assert.throws(()=>estimatePetRefinement(p,0,11));
 for(const pet of pets.pets){const bands=petRefinementBands(pet);assert.equal(bands.length,5);assert.equal(bands.at(-1).to,pet.maxRefinement);assert.ok(estimatePetRefinement(pet,0,pet.maxRefinement).blue>0);}
});

test('面板合计每件强化与专精联合只加一次；T12穿透与人数分别加，英雄缺项不凑数',()=>{
 const state=initialState();
 state.battleProfile.levels={[pair.strength.id]:100,[pair.mastery.id]:masterySequence(9)};
 state.battleProfile.planned={[pair.mastery.id]:masterySequence(10)};
 state.account.technologyLevels={'t12-infantry-3':0,'t12-infantry-0':0};
 state.technologyTargets={'t12-infantry-3':1,'t12-infantry-0':1};
 const html=createBattleProfile(data,{getState:()=>state,esc:String}).totals();
 assert.match(html,/<td>射手穿透<\/td><td>未记录<\/td><td>\+5％<\/td>/);
 assert.match(html,/<td>盾兵穿透<\/td><td>未记录<\/td><td>\+3％<\/td>/);
 assert.match(html,/<td>出征容量<\/td><td>未记录<\/td><td>\+600人<\/td>/);
});

test('金石按8倍蓝石抵库存，多宠物词条先合计再扣一次；未知库存与0区分',()=>{
 const selected=pets.pets.slice(0,2),records=Object.fromEntries(selected.map(p=>[p.id,{current:{'infantry.health':{value:1}},planned:{'infantry.health':{value:2}}}]));
 const plan=refinementPlanBudget(selected,records);
 assert.equal(plan.needed,47);assert.equal(plan.count,2);
 const inventory={'pet-blue':10,'pet-gold':3};
 const before=structuredClone(inventory),budget=refinementInventoryBudget(plan.needed,inventory);
 assert.equal(budget.equivalent,34);assert.equal(budget.gap,13);assert.deepEqual(inventory,before);
 assert.equal(refinementInventoryBudget(20,inventory).gap,0);
 assert.equal(refinementInventoryBudget(50,{'pet-blue':0,'pet-gold':0}).gap,50);
 assert.equal(refinementInventoryBudget(50,{'pet-blue':0}).gap,null);
 delete records[selected[0].id].current['infantry.health'];
 const incomplete=refinementPlanBudget(selected,records);
 assert.equal(incomplete.needed,null);assert.equal(incomplete.knownNeeded,22);assert.equal(incomplete.missing,1);
 assert.equal(refinementInventoryBudget(incomplete.needed,inventory).gap,null);
});
