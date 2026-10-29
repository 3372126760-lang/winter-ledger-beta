import {validatePetRefinements} from './pets.js';
import {migrateMasteryRecords} from './hero-mastery.js';
export function validateBattleProfile(v={}){
 const clean=o=>Object.fromEntries(Object.entries(o||{}).map(([k,n])=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e12)throw Error('属性记录无效');return [k,n];}));
 const levels=migrateMasteryRecords(clean(v.levels)),planned=migrateMasteryRecords(clean(v.planned));
 for(const [id,target] of Object.entries(planned))if(levels[id]!==undefined&&target<=levels[id])delete planned[id];
 return {base:clean(v.base),levels,planned,petRefinements:validatePetRefinements(v.petRefinements)};
}
