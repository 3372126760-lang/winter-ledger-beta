import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/planning.json' with {type:'json'};
const paths=data.systems.find(s=>s.id==='hero-gear').paths;
test('英雄装备12个独立位置，各有强化和专精；红装等级换算保留原成本',()=>{
 const pieces=paths.filter(p=>p.heroGearSlot);assert.equal(pieces.length,24);assert.equal(new Set(pieces.map(p=>p.heroGearSlot.name)).size,12);
 for(const p of pieces.filter(p=>p.heroGearSlot.kind==='strength')){assert.equal(p.rows.find(r=>r.level===101).label,'红装 1级');assert.equal(p.rows.find(r=>r.level===200).label,'红装 100级');assert.equal(p.rows.find(r=>r.level===100).label,'橙装 100级');assert.deepEqual(p.rows.find(r=>r.level===101).cost,{'orange-gear':2});assert.equal(p.maxPieces,1);}
});
