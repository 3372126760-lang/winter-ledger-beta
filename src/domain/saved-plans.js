import {STAGES} from './stages.js';
import {CHIEF_ROWS,CHIEF_GEAR_MAX,CHIEF_GEM_MAX,validateChiefLoadout} from './chief-loadout.js';
import {chiefUpgradeCandidates,combineChiefSteps,CHIEF_TARGETS} from './chief-comparison.js';

const positions=CHIEF_ROWS.flatMap(troop=>troop.slots.flatMap(slot=>[
 {id:`${slot.id}:gear`,name:`${troop.name} · ${slot.name}`,troopId:troop.id,slotId:slot.id,kind:'gear',gemIndex:null},
 ...[0,1,2].map(gemIndex=>({id:`${slot.id}:gem:${gemIndex}`,name:`${troop.name} · ${slot.name} · 宝石${gemIndex+1}`,troopId:troop.id,slotId:slot.id,kind:'gem',gemIndex})),
]));
const kindOf=metric=>['attack','defense'].includes(metric)?'gear':'gem';
const fail=()=>{throw new Error('已保存提升方案格式不符');};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

export function validateSavedPlans(value=[]){
 if(!Array.isArray(value)||value.length>100)fail();
 const ids=new Set();
 return value.map(plan=>{
  if(!object(plan)||typeof plan.id!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(plan.id)||ids.has(plan.id))fail();
  ids.add(plan.id);
  if(typeof plan.name!=='string'||!plan.name.trim()||plan.name.length>80||/[\u0000-\u001f\u007f]/.test(plan.name))fail();
  if(typeof plan.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(plan.createdAt)||!Number.isFinite(Date.parse(plan.createdAt))||new Date(plan.createdAt).toISOString()!==plan.createdAt)fail();
  if(!STAGES.some(s=>s.id===plan.stage)||!CHIEF_ROWS.some(t=>t.id===plan.troopId)||!CHIEF_TARGETS.some(([id])=>id===plan.metric)||!['full','gap'].includes(plan.basis))fail();
  if(plan.budget!==null&&(typeof plan.budget!=='number'||!Number.isFinite(plan.budget)||plan.budget<0||plan.budget>1e12))fail();
  if(!Array.isArray(plan.entries)||!plan.entries.length||plan.entries.length>24)fail();
  const seen=new Set(),kind=kindOf(plan.metric),max=kind==='gear'?CHIEF_GEAR_MAX:CHIEF_GEM_MAX;
  const entries=plan.entries.map(entry=>{
   if(!object(entry)||seen.has(entry.id))fail();
   const position=positions.find(p=>p.id===entry.id);
   if(!position||position.troopId!==plan.troopId||position.kind!==kind)fail();
   if(![entry.from,entry.to].every(Number.isInteger)||entry.from<0||entry.to<=entry.from||entry.to>max)fail();
   seen.add(entry.id);return {id:entry.id,from:entry.from,to:entry.to};
  });
  return {id:plan.id,name:plan.name,createdAt:plan.createdAt,stage:plan.stage,troopId:plan.troopId,metric:plan.metric,basis:plan.basis,budget:plan.budget,entries};
 });
}

export function createSavedPlan(candidates,selectedIds,config,{id,createdAt}={}){
 if(!Array.isArray(candidates)||!Array.isArray(selectedIds)||!selectedIds.length||selectedIds.length>24||new Set(selectedIds).size!==selectedIds.length)fail();
 const entries=selectedIds.map(positionId=>{
  const matches=candidates.filter(c=>c.id===positionId);
  if(matches.length!==1)throw new Error('所选提升项目已变化，请重新勾选');
  const candidate=matches[0],position=positions.find(p=>p.id===positionId);
  if(!position||candidate.troopId!==position.troopId||candidate.kind!==position.kind)fail();
  return {id:positionId,from:candidate.from,to:candidate.to};
 });
 return validateSavedPlans([{...config,id,createdAt,entries}])[0];
}

export function evaluateSavedPlan(data,input,loadoutInput,context={}){
 const plan=validateSavedPlans([input])[0],loadout=validateChiefLoadout(loadoutInput),candidates=[];
 const evaluated=plan.entries.map(entry=>{
  const identity=positions.find(p=>p.id===entry.id),{slotId,kind,gemIndex}=identity;
  const current=kind==='gear'?loadout[slotId].gear:loadout[slotId].gems[gemIndex];
  const systemId=kind==='gear'?'chief-gear':'chief-gems',path=data?.systems?.find(s=>s.id===systemId)?.paths?.[0];
  const rowAt=level=>path?.rows?.find(r=>r.level===level)||(path?.baseline?.level===level?path.baseline:null);
  const position={...identity,from:entry.from,to:entry.to,current,beforeLabel:rowAt(entry.from)?.label??null,currentLabel:rowAt(current)?.label??null,afterLabel:rowAt(entry.to)?.label??null,status:'unrecorded',reason:''};
  if(current===null){position.reason='此位置当前等级未记录';return position;}
  // Completion is an observed account fact, even if later source coverage changes.
  if(current>=entry.to){position.status='completed';return position;}
  position.status='missing';
  if(!path||!rowAt(current)||!rowAt(entry.to)){position.reason='当前或目标档位资料待补';return position;}
  if(path.costStatus!=='available'||path.costMode==='checkpoint'){position.reason='升级材料口径尚待核对';return position;}
  const range=path.rows.filter(r=>r.level>current&&r.level<=entry.to);
  if(range.length!==entry.to-current||new Set(range.map(r=>r.level)).size!==range.length||range.some(r=>!object(r.cost)||!Object.keys(r.cost).length)){
   position.reason='目标区间的逐档材料资料不完整';return position;
  }
  // Only this position is recorded in the temporary input. Other positions may
  // have different saved targets and must not be recalculated against this one.
  const one=validateChiefLoadout();
  if(kind==='gear')one[slotId].gear=current;else one[slotId].gems[gemIndex]=current;
  try{
   const candidate=chiefUpgradeCandidates(data,one,context,{mode:'target',[kind==='gear'?'gearLevel':'gemLevel']:entry.to}).candidates.find(c=>c.id===entry.id);
   if(!candidate||!candidate.costVerified){position.reason='升级材料资料尚待核对';return position;}
   candidates.push(candidate);position.status='pending';
  }catch(error){position.reason=error.message;}
  return position;
 });
 const result=candidates.length?combineChiefSteps(candidates,candidates.map(c=>c.id),context):null;
 return {positions:evaluated,candidates,result,complete:evaluated.every(p=>['pending','completed'].includes(p.status))};
}
