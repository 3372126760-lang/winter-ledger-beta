import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/planning.json' with {type:'json'};
import manifest from '../src/data/research-trees.json' with {type:'json'};
import audit from '../src/data/research-audit.json' with {type:'json'};
import {chiefSetBonuses,chiefExchangeUnlocks,CHIEF_EXCHANGES,GEM_EXCHANGES} from '../src/domain/chief-set.js';
import {validateChiefLoadout,CHIEF_SLOT_IDS} from '../src/domain/chief-loadout.js';
import {heroGearAttribute,heroGearPairs} from '../src/domain/hero-gear-attributes.js';
import {masterySequence} from '../src/domain/hero-mastery.js';
import {technologyPrerequisites} from '../src/domain/technology-prerequisites.js';
import {createBattleProfile} from '../src/ui/battle-profile.js';
import {initialState} from '../src/domain/model.js';

test('截图套装三六件取最高档，星段不升套装，未知不当作确认零',()=>{
 const l=validateChiefLoadout();
 for(const id of CHIEF_SLOT_IDS)l[id].gear=7;
 assert.equal(chiefSetBonuses(l).attack.value,5);
 for(const id of CHIEF_SLOT_IDS.slice(0,3))l[id].gear=39;
 assert.equal(chiefSetBonuses(l).defense.value,16);assert.equal(chiefSetBonuses(l).attack.value,5);
 l[CHIEF_SLOT_IDS[0]].gear=46;assert.equal(chiefSetBonuses(l).defense.value,16);
 for(const id of CHIEF_SLOT_IDS.slice(3))l[id].gear=27;
 assert.equal(chiefSetBonuses(l).attack.value,10);assert.equal(chiefSetBonuses(l).attack.next.bonus,12);
 l[CHIEF_SLOT_IDS[0]].gear=null;assert.equal(chiefSetBonuses(l).complete,false);
});

test('兑换门槛任意一件橙2阶3星或任一11级宝石，兑换比例与截图一致',()=>{
 const l=validateChiefLoadout();assert.deepEqual(chiefExchangeUnlocks(l),{gear:null,gems:null});
 for(const id of CHIEF_SLOT_IDS){l[id].gear=25;l[id].gems=[10,10,10];}
 assert.deepEqual(chiefExchangeUnlocks(l),{gear:false,gems:false});l.helmet.gear=26;l.staff.gems[2]=11;
 assert.deepEqual(chiefExchangeUnlocks(l),{gear:true,gems:true});
 assert.equal(CHIEF_EXCHANGES.length,7);assert.equal(GEM_EXCHANGES.length,4);
 assert.deepEqual(CHIEF_EXCHANGES[0],{from:'chief-design',cost:10,to:'amber',gain:1,limit:500});
 assert.ok(GEM_EXCHANGES.filter(r=>r.to==='codex').every(r=>r.cost===40&&r.limit===50));
});

test('12件同一橙装曲线，红100等效200级；红装主属性按专精倍率且不跳过门槛',()=>{
 for(const {strength,mastery}of heroGearPairs(data)){
  const p={levels:{[strength.id]:35,[mastery.id]:0}};
  assert.equal(heroGearAttribute(strength,mastery,p).value,19.66);
  p.levels[strength.id]=200;p.levels[mastery.id]=masterySequence(15);
  assert.equal(heroGearAttribute(strength,mastery,p).value,250);
  p.levels[mastery.id]=masterySequence(14);assert.equal(heroGearAttribute(strength,mastery,p).value,null);
 }
});

test('T12建筑、技能、II和III前置边界覆盖，缺独立解锁页不伪装已验证',()=>{
 const rules=(i,l)=>technologyPrerequisites(manifest,manifest.nodes.find(n=>n.id===`t12-infantry-${i}`),l);
 assert.equal(rules(0,2).building,'战争学院火晶5');assert.equal(rules(0,3).building,'战争学院火晶6');
 assert.equal(rules(3,1).building,'战争学院火晶9');assert.equal(rules(4,1).building,'战争学院火晶10');
 assert.equal(rules(5,1).known,false);
 for(const [level,min]of [[1,1],[14,1],[15,2],[29,2],[30,3],[50,3]])assert.equal(rules(11,level).required[0].min,min);
 for(const [level,min]of [[1,30],[5,30],[6,40],[10,40],[11,50],[15,50]])assert.ok(rules(15,level).required.every(r=>r.min===min));
 assert.equal(rules(16,1).required[0].min,15);
});

test('普通战斗科技总表排除发展，阶段累计不重复叠加；套装计划只增加跨档差额',()=>{
 assert.equal(audit.coverage.paths,102);assert.equal(audit.rows.length,17);assert.deepEqual(audit.missing,[]);
 assert.equal(audit.totals['research.all.attack']+audit.totals['research.infantry.attack'],159);
 assert.equal(audit.totals['research.all.capacity'],32200);
 const state=initialState();for(const id of CHIEF_SLOT_IDS)state.account.chiefLoadout[id].gear=18;
 state.account.chiefLoadout.helmet.gear=19;state.account.chiefLoadout.watch.gear=19;state.chiefTargets.chestplate.gear=19;
 const html=createBattleProfile(data,{getState:()=>state,esc:String}).totals();
 assert.match(html,/<td>矛兵防御<\/td><td>未记录<\/td><td>\+1％/);
 assert.match(html,/<td>射手防御<\/td><td>未记录<\/td><td>\+1％/);
});
