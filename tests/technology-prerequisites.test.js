import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../src/data/research-trees.json' with {type:'json'};
import {technologyPrerequisites as rules} from '../src/domain/technology-prerequisites.js';
const node=id=>manifest.nodes.find(n=>n.id===id);
test('普通科技前置1级可直接计划升满',()=>{
 const n=node('battle-6-10'),r=rules(manifest,n,6,{'battle-6-8':1,'battle-6-9':1});
 assert.equal(r.state,'科技前置已满足');assert.ok(r.required.every(x=>x.min===1));
});
test('T11集结和兵种前置门槛',()=>{
 assert.deepEqual(rules(manifest,node('t11-infantry-3'),7).required.map(r=>r.min),[7,7]);
 assert.deepEqual(rules(manifest,node('t11-infantry-6'),1).required.map(r=>r.min),[12,12,12]);
});
test('T12技能5/10/15及容量30/50门槛',()=>{
 for(const level of [1,2,3])assert.ok(rules(manifest,node('t12-infantry-10'),level).required.every(r=>r.min===level*5));
 assert.ok(rules(manifest,node('t12-infantry-15'),10).required.every(r=>r.min===30));
 assert.ok(rules(manifest,node('t12-infantry-15'),11).required.every(r=>r.min===50));
});
