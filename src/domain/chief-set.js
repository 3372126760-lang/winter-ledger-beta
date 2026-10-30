import {CHIEF_SLOT_IDS} from './chief-loadout.js';
// Star/substage upgrades do not change the set threshold. Inferred rows remain labelled.
export const CHIEF_SET_TIERS=[
 [1,'良好',1,false],[3,'稀有',3,false],[7,'史诗',5,true],[11,'史诗1阶',6,true],
 [15,'传说',7,false],[19,'传说1阶',8,true],[23,'传说2阶',9,true],
 [27,'神话',10,true],[31,'神话1阶',12,true],[35,'神话2阶',14,false],
 [39,'神话3阶',16,true],[47,'神话4阶',18,true],[67,'神话5阶',20,false],[87,'神话6阶',22,false],
].map(([level,name,bonus,verified])=>({level,name,bonus,verified}));
export function chiefSetBonuses(loadout){
 const levels=CHIEF_SLOT_IDS.map(id=>loadout[id]?.gear??null);
 const known=levels.filter(l=>l!==null);
 const track=count=>{
  const active=CHIEF_SET_TIERS.filter(t=>known.filter(l=>l>=t.level).length>=count).at(-1);
  const next=CHIEF_SET_TIERS.find(t=>t.level>(active?.level||0));
  return {count,value:active?.bonus||0,active:active||null,next:next?{...next,owned:known.filter(l=>l>=next.level).length}:null};
 };
 return {defense:track(3),attack:track(6),complete:known.length===6};
}

export const CHIEF_EXCHANGES=[
 {from:'chief-design',cost:10,to:'amber',gain:1,limit:500},
 {from:'chief-design',cost:1,to:'polish',gain:3,limit:500},
 {from:'chief-design',cost:1,to:'alloy',gain:300,limit:500},
 {from:'polish',cost:10,to:'chief-design',gain:1,limit:50},
 {from:'polish',cost:1,to:'alloy',gain:50,limit:1000},
 {from:'alloy',cost:1000,to:'chief-design',gain:1,limit:50},
 {from:'alloy',cost:200,to:'polish',gain:1,limit:500},
];
export const GEM_EXCHANGES=[
 {from:'charm-guide',cost:2,to:'charm-design',gain:1,limit:500},
 {from:'charm-design',cost:2,to:'charm-guide',gain:1,limit:500},
 {from:'charm-guide',cost:40,to:'codex',gain:1,limit:50},
 {from:'charm-design',cost:40,to:'codex',gain:1,limit:50},
];
export function chiefExchangeUnlocks(loadout){
 const gear=CHIEF_SLOT_IDS.map(id=>loadout[id]?.gear??null),gems=CHIEF_SLOT_IDS.flatMap(id=>loadout[id]?.gems||[null,null,null]);
 return {gear:gear.some(l=>l>=26)?true:gear.includes(null)?null:false,gems:gems.some(l=>l>=11)?true:gems.includes(null)?null:false};
}
