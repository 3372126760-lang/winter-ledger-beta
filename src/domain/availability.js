import {progressFromStage,FIRE_PROGRESS,normalizeProgress,resolveStage} from './stages.js';
const fireRank=id=>FIRE_PROGRESS.findIndex(p=>p.id===id);
export function itemAvailability(item,stage,progress) {
  const rule=item?.unlock;if(!rule)return {available:true};
  const actual=progress&&resolveStage(progress)===stage?normalizeProgress(progress):progressFromStage(stage);
  if(rule.fireProgress&&fireRank(actual.fireProgress)<fireRank(rule.fireProgress))return {available:false,reason:`${FIRE_PROGRESS.find(p=>p.id===rule.fireProgress)?.name}起开放`};
  if(rule.heroGeneration&&actual.heroGeneration<rule.heroGeneration)return {available:false,reason:`${rule.heroGeneration}代英雄起开放`};
  return {available:true};
}
