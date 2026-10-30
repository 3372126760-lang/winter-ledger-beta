export const AFFINITY_GIFTS={'expert-compass':10,'expert-heart':100,'expert-sail':1000};
export function expertAffinityTotal(inventory){
 const entries=Object.entries(AFFINITY_GIFTS);
 const known=entries.filter(([id])=>Object.hasOwn(inventory,id));
 const legacy=Object.hasOwn(inventory,'affection');
 return {points:known.reduce((n,[id,value])=>n+inventory[id]*value,0)+(inventory.affection??0),recorded:known.length+(legacy?1:0),complete:known.length===3};
}
export function expertUsableInventory(path,inventory){
 const result={...inventory},total=expertAffinityTotal(inventory);
 if(total.recorded)result.affection=total.points;
 if(path.expertTrack==='advancement'&&path.expertSlug){
  const id='expert-sigil-'+path.expertSlug;
  if(Object.hasOwn(inventory,id)||Object.hasOwn(inventory,'expert-mark'))result['expert-mark']=(inventory[id]??0)+(inventory['expert-mark']??0);
 }
 return result;
}
