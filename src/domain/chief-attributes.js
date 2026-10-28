import {CHIEF_ROWS} from './chief-loadout.js';
const round=n=>Math.round(n*1e8)/1e8;

// Source tables list current cumulative stats. Convert adjacent totals into
// explicit per-step gains, then rebuild each current value by summing gains.
export function addChiefAttributeSteps(path){
 const previous=new Map((path.baseline?.attributes||[]).map(a=>[a.key,a.value]));
 for(const row of path.rows){
  row.stepAttributes=(row.attributes||[]).map(a=>{
   const increment=round(a.value-(previous.get(a.key)??0));previous.set(a.key,a.value);
   if(increment<0)throw new Error('领主属性出现倒退，请核对升级表');
   return {...a,value:increment};
  });
 }
 path.attributeMode='step-increments';
 return path;
}

export function chiefAttributesAt(path,level){
 if(!Number.isInteger(level)||level<0)throw new Error('当前档位无效');
 if(level!==path.baseline?.level&&!path.rows.some(r=>r.level===level))throw new Error('当前档位属性未收录');
 const totals=Object.fromEntries((path.baseline?.attributes||[]).map(a=>[a.key,a.value]));
 const latest=path.rows.find(r=>r.level===level),steps=[];
 for(const row of path.rows){
  if(row.level>level)break;
  if(row.level<=(path.baseline?.level??0))continue;
  if(!row.stepAttributes)throw new Error('逐级属性增量尚未录入');
  for(const a of row.stepAttributes)totals[a.key]=round((totals[a.key]??0)+a.value);
  steps.push({level:row.level,label:row.label,attributes:row.stepAttributes});
 }
 return {totals,latest:latest?.stepAttributes||[],steps,label:latest?.label||path.baseline?.label};
}

export function summarizeChiefLoadout(data,loadout){
 const gearPath=data.systems.find(s=>s.id==='chief-gear').paths[0],gemPath=data.systems.find(s=>s.id==='chief-gems').paths[0];
 const troops=[];let totalCapacity=0,totalGearPower=0,gearCount=0;
 for(const id of ['infantry','lancer','marksman']){
  const row=CHIEF_ROWS.find(r=>r.id===id),result={id,name:row.name,attack:0,defense:0,health:0,lethality:0,gearRecorded:0,gemsRecorded:0,contributions:[]};
  for(const slot of row.slots){
   const record=loadout[slot.id];
   if(record.gear!==null){
    const value=chiefAttributesAt(gearPath,record.gear);result.gearRecorded++;gearCount++;
    result.attack=round(result.attack+(value.totals['chief.attack']||0));result.defense=round(result.defense+(value.totals['chief.defense']||0));
    totalCapacity=round(totalCapacity+(value.totals['chief.capacity']||0));totalGearPower=round(totalGearPower+(value.totals['chief.power']||0));
    result.contributions.push({slotId:slot.id,name:slot.name,kind:'gear',value});
   }
   record.gems.forEach((level,index)=>{
    if(level===null)return;
    const value=chiefAttributesAt(gemPath,level);result.gemsRecorded++;
    result.health=round(result.health+(value.totals['chief-gem.health']||0));result.lethality=round(result.lethality+(value.totals['chief-gem.lethality']||0));
    result.contributions.push({slotId:slot.id,name:`${slot.name}宝石${index+1}`,kind:'gem',value});
   });
  }
  if(!result.gearRecorded){result.attack=null;result.defense=null;}
  if(!result.gemsRecorded){result.health=null;result.lethality=null;}
  result.complete=result.gearRecorded===2&&result.gemsRecorded===6;troops.push(result);
 }
 return {troops,capacity:gearCount?totalCapacity:null,gearPower:gearCount?totalGearPower:null,gearRecorded:gearCount,complete:troops.every(t=>t.complete)};
}
