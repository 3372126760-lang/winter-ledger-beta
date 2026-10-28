import {CHIEF_ROWS,CHIEF_GEAR_MAX,CHIEF_GEM_MAX,validateChiefLoadout} from './chief-loadout.js';

export function batchChiefLevels(input,{scope='all',kind,level,onlyUnrecorded=true}){
 if(!['all',...CHIEF_ROWS.map(r=>r.id)].includes(scope)||!['gear','gem'].includes(kind)||typeof onlyUnrecorded!=='boolean')throw new Error('批量填写范围无效');
 const max=kind==='gear'?CHIEF_GEAR_MAX:CHIEF_GEM_MAX;
 if(!Number.isInteger(level)||level<0||level>max)throw new Error('请选择有效的当前档位');
 const loadout=validateChiefLoadout(input),changes=[];let skippedKnown=0;
 for(const troop of CHIEF_ROWS.filter(r=>scope==='all'||r.id===scope))for(const slot of troop.slots){
  for(const gemIndex of kind==='gear'?[null]:[0,1,2]){
   const before=kind==='gear'?loadout[slot.id].gear:loadout[slot.id].gems[gemIndex];
   if(onlyUnrecorded&&before!==null){skippedKnown++;continue;}
   if(before===level)continue;
   changes.push({slotId:slot.id,kind,gemIndex,before,after:level,name:`${troop.name} · ${slot.name}${kind==='gem'?` · 宝石${gemIndex+1}`:''}`});
   if(kind==='gear')loadout[slot.id].gear=level;else loadout[slot.id].gems[gemIndex]=level;
  }
 }
 return {loadout,changes,skippedKnown};
}

// Undo only fields which still equal the applied value. Later manual edits win.
export function undoChiefBatch(input,changes){
 const loadout=validateChiefLoadout(input);let restored=0,skipped=0;
 for(const change of changes){
  const slot=loadout[change.slotId];if(!slot)throw new Error('撤销记录位置无效');
  if(!['gear','gem'].includes(change.kind)||(change.kind==='gem'&&![0,1,2].includes(change.gemIndex)))throw new Error('撤销记录格式无效');
  const current=change.kind==='gear'?slot.gear:slot.gems[change.gemIndex];
  if(change.manualEdited||current!==change.after){skipped++;continue;}
  if(change.kind==='gear')slot.gear=change.before;else slot.gems[change.gemIndex]=change.before;
  restored++;
 }
 return {loadout:validateChiefLoadout(loadout),restored,skipped};
}
