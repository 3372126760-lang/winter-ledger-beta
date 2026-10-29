import data from '../data/pet-board.json' with {type:'json'};
export const PET_STATS=[['infantry.lethality','盾兵穿透'],['infantry.health','盾兵生命'],['lancer.lethality','矛兵穿透'],['lancer.health','矛兵生命'],['marksman.lethality','射手穿透'],['marksman.health','射手生命']];
export const PET_COLORS=[['white','白'],['green','绿'],['blue','蓝'],['purple','紫'],['orange','橙']];
export function petStatsAt(path,level){
 if(level===undefined||level===null)return null;
 const pet=data.pets.find(p=>p.id===path?.id),row=path?.rows.find(r=>r.level===level)||path?.baseline;
 if(!pet||!row)return null;
 const stat=pet.stats[row.petLevel||1];return stat?(row.phase==='after-breakthrough'?stat.after:stat.before):null;
}
export function validatePetRefinements(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('宠物洗炼记录无效');const out={};
 for(const [id,groups] of Object.entries(input)){
  const pet=data.pets.find(p=>p.id===id);if(!pet)throw Error('宠物不存在');out[id]={};
  for(const mode of ['current','planned']){out[id][mode]={};for(const [key,entry] of Object.entries(groups?.[mode]||{})){
   if(!PET_STATS.some(([k])=>k===key)||!PET_COLORS.some(([c])=>c===entry?.color)||!Number.isFinite(entry.value)||entry.value<0||entry.value>pet.maxRefinement)throw Error('洗炼属性超出该宠物上限');
   out[id][mode][key]={value:entry.value,color:entry.color};
  }}
 }return out;
}
