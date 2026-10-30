import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chiefAttributesAt,summarizeChiefLoadout} from '../src/domain/chief-attributes.js';
import {validateChiefLoadout,chiefArt,chiefGearMarks,chiefGearLabel,CHIEF_SLOT_IDS} from '../src/domain/chief-loadout.js';
const read=async name=>JSON.parse(await readFile(new URL('../src/data/'+name,import.meta.url)));
const [data,evidence,art]=await Promise.all(['planning.json','chief-game-evidence.json','chief-art.json'].map(read));
const gear=data.systems.find(s=>s.id==='chief-gear').paths[0],gem=data.systems.find(s=>s.id==='chief-gems').paths[0];
const find=name=>gear.rows.find(r=>r.label.replace('神話','神话')===name).level;
test('单件属性以各档增量累加，重建全部当前值，不把总属性重复叠加',()=>{
 assert.equal(gear.rows[0].stepAttributes[0].value,9.35);assert.equal(gear.rows[1].stepAttributes[0].value,3.4);
 assert.equal(chiefAttributesAt(gear,3).totals['chief.attack'],17);
 for(const path of [gear,gem])for(const row of path.rows){const total=chiefAttributesAt(path,row.level).totals;for(const a of row.attributes)assert.ok(Math.abs(total[a.key]-a.value)<1e-6);}
});
test('图鉴截图样本核对单件攻击防御、容量和实力；16级每颗生命穿透各100%',()=>{
 for(const sample of evidence.gearSamples){const value=chiefAttributesAt(gear,find(sample.name)).totals;assert.equal(value['chief.attack'],sample.attack);assert.equal(value['chief.defense'],sample.defense);assert.equal(value['chief.capacity'],sample.capacity);assert.equal(value['chief.power'],sample.power);}
 const value=chiefAttributesAt(gem,16).totals;assert.equal(value['chief-gem.health'],100);assert.equal(value['chief-gem.lethality'],100);
});
test('六件装备和十八宝石按盾矛射分别加总，通用容量只累计一次',()=>{
 const loadout=validateChiefLoadout();
 for(const id of ['helmet','watch'])loadout[id].gear=find('神话T5');
 for(const id of ['chestplate','pants'])loadout[id].gear=find('神话T6');
 loadout.ring.gear=find('神话2星');loadout.staff.gear=find('神话T2-3星');
 for(const id of CHIEF_SLOT_IDS)loadout[id].gems=[16,16,16];
 const summary=summarizeChiefLoadout(data,loadout);
 assert.deepEqual(summary.troops.map(t=>t.id),['infantry','lancer','marksman']);
 assert.deepEqual(summary.troops.map(t=>t.attack),[469,401,243.75]);
 for(const t of summary.troops){assert.equal(t.defense,t.attack+10);assert.equal(t.health,600);assert.equal(t.lethality,600);}
 assert.equal(summary.capacity,6720);assert.equal(summary.gearPower,26010000);assert.equal(summary.complete,true);
});
test('未记录与明确0档分开，已记录部分不冒充完整总属性',()=>{
 const loadout=validateChiefLoadout();let summary=summarizeChiefLoadout(data,loadout);assert.equal(summary.troops[0].attack,null);assert.equal(summary.capacity,null);
 loadout.helmet.gems[0]=16;summary=summarizeChiefLoadout(data,loadout);assert.equal(summary.troops[1].health,100);assert.equal(summary.troops[0].health,null);assert.equal(summary.complete,false);
 loadout.chestplate.gear=0;summary=summarizeChiefLoadout(data,loadout);assert.equal(summary.troops[0].attack,0);assert.equal(summary.troops[0].gearRecorded,1);
});
test('阶星文字与5/6阶原图独立对应，原图显示区域均在截图内',()=>{
 assert.deepEqual(chiefGearMarks('神话T2-3星'),{tier:2,stars:3,stage:0});assert.equal(chiefGearLabel('神话T5-1星2段'),'神话5阶（1星） · 2段');
 for(const slot of CHIEF_SLOT_IDS)for(const tier of [5,6]){const image=chiefArt(art,{slotId:slot,gearLabel:`神话T${tier}-2星`,kind:'gear'}).image;assert.equal(image.bakedTier,tier);assert.equal(image.key,`${slot}:t${tier}`);}
 for(const image of Object.values(art.images)){if(!image.region)continue;const r=image.region;assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=r.imageWidth&&r.y+r.height<=r.imageHeight);}
});
