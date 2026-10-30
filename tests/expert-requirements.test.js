import test from 'node:test';
import assert from 'node:assert/strict';
import rules from '../src/data/expert-requirements.json' with {type:'json'};
import board from '../src/data/expert-board.json' with {type:'json'};
import {expertSkillRequirementAt,expertSkillRequirementsView,expertResearchReferenceView} from '../src/ui/expert-requirements.js';

test('全部11位专家44项技能的前置映射到原路径，西里尔首技能保留结识解锁例外',()=>{
 assert.equal(Object.keys(rules.experts).length,11);
 assert.equal(Object.values(rules.experts).reduce((n,e)=>n+e.skills.length,0),44);
 for(const expert of board.experts){
  const row=rules.experts[expert.id];
  assert.equal(row.levelPath,expert.levelPath);
  assert.deepEqual(row.skills.map(s=>s.pathId),expert.skills.map(s=>s.pathId));
  assert.deepEqual(row.skills.map(s=>s.name),expert.skills.map(s=>s.name));
 }
 assert.equal(rules.experts['西里尔'].skills[0].unlockAffinityLevel,1);
 assert.equal(rules.experts['Justus'].skills[0].unlockAffinityLevel,10);
});

test('好感度和总技能门槛持续生效，不能漏掉已跨过的前置',()=>{
 const cyrille=rules.experts['西里尔'];
 assert.deepEqual(expertSkillRequirementAt(cyrille.skills[0],7),{affinityLevel:30,totalSkillLevel:0});
 assert.deepEqual(expertSkillRequirementAt(cyrille.skills[0],8),{affinityLevel:50,totalSkillLevel:0});
 assert.deepEqual(expertSkillRequirementAt(cyrille.skills[2],4),{affinityLevel:30,totalSkillLevel:10});
 assert.deepEqual(expertSkillRequirementAt(cyrille.skills[2],5),{affinityLevel:30,totalSkillLevel:15});
 assert.deepEqual(expertSkillRequirementAt(rules.experts['Justus'].skills[3],10),{affinityLevel:40,totalSkillLevel:24});
 assert.equal(expertSkillRequirementAt(cyrille.skills[2],6),null);
});

test('当前页不展示计划目标，未知与0级分开，总级只统计同一专家当前四技能，记录不被修改',()=>{
 const expert=board.experts.find(e=>e.id==='Justus'),skill=expert.skills[3];
 const profile={levels:{'expert-Justus-relation':40,'expert-Justus-skill-1':5,'expert-Justus-skill-2':5,'expert-Justus-skill-3':5,'expert-Justus-skill-4':9,'expert-巴尔德-skill-1':10},planned:{'expert-Justus-skill-4':10}};
 const before=structuredClone(profile);
 const html=expertSkillRequirementsView(expert,skill,profile,false,String);
 assert.ok(html.includes('目标10级前置'));assert.ok(html.includes('四项技能总等级24'));
 assert.ok(!expertSkillRequirementsView(expert,skill,profile,true,String).includes('目标'));
 delete profile.levels['expert-Justus-skill-1'];
 assert.ok(expertSkillRequirementsView(expert,skill,profile,false,String).includes('记录不全'));
 profile.levels['expert-Justus-skill-1']=0;
 assert.ok(expertSkillRequirementsView(expert,skill,profile,false,String).includes('四项技能总等级19'));
 profile.levels['expert-Justus-skill-1']=5;assert.deepEqual(profile,before);
});

test('研究资料按角色区分，未知不套用凯西的6000印记',()=>{
 const render=id=>expertResearchReferenceView(board.experts.find(e=>e.id===id),String);
 assert.ok(render('凯西').includes('6000印记'));
 assert.ok(render('加雷斯').includes('18000印记'));
 assert.ok(!render('Justus').includes('6000'));
 assert.ok(render('Justus').includes('尚未完整核对'));
});
