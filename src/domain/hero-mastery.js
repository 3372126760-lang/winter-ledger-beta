export const ORANGE_STEPS={11:'00100',12:'00110',13:'01110',14:'01111',15:'11111',16:'11211',17:'11221',18:'12221',19:'12222',20:'22222'};
export const masterySequence=level=>level<=3?level:3+(level-3)*5;
export const isLegacyMastery=id=>/^hero-mastery(?:-(?:infantry|lancer|marksman)-(?:goggles|gloves|belt|boots))?$/.test(id);
export function stageMastery(path){
 if(!isLegacyMastery(path.id))return path;
 const rows=path.rows.flatMap(r=>{
  if(r.level<4)return [{...r,masteryLevel:r.level,masteryPart:5,masteryMultiplier:1+r.level*.1}];
  return Array.from({length:5},(_,i)=>{
   const part=i+1,progress=(part/5),multiplier=1+((r.level-1)+progress)*.1;
   const attributes=(r.attributes||[]).map(a=>{const previous=path.rows.find(p=>p.level===r.level-1)?.attributes?.find(p=>p.key===a.key&&p.unit===a.unit);return {...a,value:(previous?.value||0)+(a.value-(previous?.value||0))*progress};});
   return {...r,level:masterySequence(r.level-1)+part,label:part===5?`专精 ${r.level} 级${r.level>=14?'（橙装分段推测）':''}`:`专精 ${r.level-1} 级 · ${part}/5段${r.level>=14?'（橙装分段推测）':''}`,masteryLevel:r.level,masteryPart:part,masteryMultiplier:multiplier,orangeStepsUnverified:r.level>=14,cost:{...r.cost,'mastery-stone':r.cost['mastery-stone']/5,'orange-gear':Number(ORANGE_STEPS[r.level]?.[i]||0)},attributes,effect:`本段为${r.level-1}→${r.level}级第${part}/5段，属性增量为整级的1/5；专精倍率${multiplier.toFixed(2)}倍（仍需与槽位基础属性联算）。${r.level>=14?'橙装分段按维护者推测，待游戏核对。':'分段规则由维护者提供。'}`};
  });
 });
 return {...path,id:path.id+'-staged',rows,coverage:'专精1—20级；升4级起五段，属性与专精石均分；14—20级橙装分段推测待核对'};
}
export function migrateMasteryRecords(records={}){
 const next={...records};
 for(const [id,level] of Object.entries(records))if(isLegacyMastery(id)){
  if(next[id+'-staged']===undefined)next[id+'-staged']=masterySequence(level);
  delete next[id];
 }
 return next;
}
