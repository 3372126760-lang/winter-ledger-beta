export const CHIEF_ROWS=[
  {id:'lancer',name:'矛兵',artTroop:'Lancer',slots:[{id:'helmet',name:'帽子'},{id:'watch',name:'怀表'}]},
  {id:'infantry',name:'盾兵',artTroop:'Infantry',slots:[{id:'chestplate',name:'外套'},{id:'pants',name:'裤子'}]},
  {id:'marksman',name:'射手',artTroop:'Marksman',slots:[{id:'ring',name:'戒指'},{id:'staff',name:'手杖'}]},
];
export const CHIEF_SLOT_IDS=CHIEF_ROWS.flatMap(r=>r.slots.map(s=>s.id));
export const CHIEF_GEAR_MAX=102,CHIEF_GEM_MAX=34;

export function validateChiefLoadout(value){
  if(value!==undefined&&(!value||typeof value!=='object'||Array.isArray(value)))throw new Error('领主装备记录格式不符');
  const output={};
  for(const id of CHIEF_SLOT_IDS){
    const slot=value?.[id];
    if(slot!==undefined&&(!slot||typeof slot!=='object'||Array.isArray(slot)))throw new Error('装备部位记录格式不符');
    const gear=slot?.gear??null,gems=slot?.gems??[null,null,null];
    if(gear!==null&&(!Number.isInteger(gear)||gear<0||gear>CHIEF_GEAR_MAX))throw new Error('领主装备档位无效');
    if(!Array.isArray(gems)||gems.length!==3||gems.some(level=>level!==null&&(!Number.isInteger(level)||level<0||level>CHIEF_GEM_MAX)))throw new Error('每件装备需要记录三个有效宝石档位');
    output[id]={gear,gems:[...gems]};
  }
  return output;
}

export function validateChiefSelection(value,systemId){
  if(value===undefined)return undefined;
  if(!value||typeof value!=='object'||Array.isArray(value)||!CHIEF_SLOT_IDS.includes(value.slotId))throw new Error('提升规划的装备位置无效');
  if(value.kind==='gear'&&systemId==='chief-gear'&&value.gemIndex===null)return {slotId:value.slotId,kind:'gear',gemIndex:null};
  if(value.kind==='gem'&&systemId==='chief-gems'&&Number.isInteger(value.gemIndex)&&value.gemIndex>=0&&value.gemIndex<3)return {slotId:value.slotId,kind:'gem',gemIndex:value.gemIndex};
  throw new Error('提升规划的宝石位置无效');
}

export function chiefRecordedCount(loadout){
  return {gear:CHIEF_SLOT_IDS.filter(id=>loadout[id].gear!==null).length,gems:CHIEF_SLOT_IDS.reduce((n,id)=>n+loadout[id].gems.filter(x=>x!==null).length,0)};
}

export function chiefArt(manifest,{slotId,gearLabel='',gemLabel='',troop,kind,recorded}){
  gearLabel=gearLabel.replace('神話','神话');
  if(kind==='gear'){
    const quality=/^神话T6/.test(gearLabel)?'t6':/^神话T5/.test(gearLabel)?'t5':/^神话T4/.test(gearLabel)?'t4-legendary':/^神话/.test(gearLabel)?'red':/^传说/.test(gearLabel)?'gold':/^史诗/.test(gearLabel)?'purple':/^稀有/.test(gearLabel)?'blue':'green';
    return {image:manifest.images[`${slotId}:${quality}`]||manifest.images[`${slotId}:red`],note:''};
  }
  const match=gemLabel.match(/(?:Lv\.\s*)?(\d+)/),level=recorded?Number(match?.[1]||1):1;
  const exact=manifest.images[`${troop}:${level}`];
  return {image:exact||manifest.images[`${troop}:16`]||manifest.images[`${troop}:1`],note:!exact&&recorded?`${level}级暂无独立贴图，使用同兵种16级代表图`:''};
}

export function chiefGearMarks(label=''){
  return {tier:Number(label.match(/T(\d+)/)?.[1]||0),stars:Number(label.match(/(\d+)星/)?.[1]||0),stage:Number(label.match(/(\d+)段/)?.[1]||0)};
}

export function chiefGearLabel(label=''){
 const {tier,stars,stage}=chiefGearMarks(label),quality=label.replace('神話','神话').match(/^(良好|稀有|史诗|传说|神话)/)?.[1];
 return quality?`${quality}${tier?`${tier}阶`:''}${stars?`（${stars}星）`:''}${stage?` · ${stage}段`:''}`:label;
}

export function buildChiefPlanning(data,loadout,slotId,kind,gemIndex,current={}){
  if(!CHIEF_SLOT_IDS.includes(slotId)||!['gear','gem'].includes(kind))throw new Error('装备位置无效');
  if(kind==='gem'&&(!Number.isInteger(gemIndex)||gemIndex<0||gemIndex>2))throw new Error('宝石位置无效');
  const systemId=kind==='gear'?'chief-gear':'chief-gems',path=data.systems.find(s=>s.id===systemId)?.paths[0];
  const from=kind==='gear'?loadout[slotId].gear:loadout[slotId].gems[gemIndex];
  if(from===null)throw new Error('请先填写此位置的当前等级');
  const next=path?.rows.find(r=>r.level>from);
  if(!next)throw new Error('此位置已达到当前资料的最高档位');
  const to=current.systemId===systemId&&path.rows.some(r=>r.level===current.to&&r.level>from)?current.to:next.level;
  return {systemId,pathId:path.id,from,to,pieces:1,chiefSelection:{slotId,kind,gemIndex:kind==='gem'?gemIndex:null}};
}
