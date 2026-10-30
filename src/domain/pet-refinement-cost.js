// User estimates for one stat manually retained. These are NOT a probability
// distribution, a guaranteed recipe, or the cost of rolling six stats together.
export const GOLD_TO_BLUE=8;
export const PET_REFINEMENT_RATES=[
 {color:'white',name:'白→绿',fraction:.1,blue:15},
 {color:'green',name:'绿→蓝',fraction:.3,blue:25},
 {color:'blue',name:'蓝→紫',fraction:.5,blue:35},
 {color:'purple',name:'紫→橙',fraction:.7,blue:65},
 {color:'orange',name:'橙→满',fraction:1,blue:85},
];

export function petRefinementBands(pet){
 let from=0;
 return PET_REFINEMENT_RATES.map(rate=>{const to=Math.round(pet.maxRefinement*rate.fraction*100)/100,row={...rate,from,to,gold:null,status:'user-estimate'};from=to;return row;});
}

export function estimatePetRefinement(pet,from,to){
 if(from==null||to==null)return {blue:null,gold:null,segments:[],reason:'当前或目标词条未记录'};
 if(![from,to].every(v=>Number.isFinite(v)&&v>=0&&v<=pet.maxRefinement))throw new Error('洗练属性超出该宠物上限');
 if(to<from)return {blue:null,gold:null,segments:[],reason:'目标低于当前，不估算消耗'};
 const segments=petRefinementBands(pet).map(b=>({...b,gain:Math.max(0,Math.min(to,b.to)-Math.max(from,b.from))})).filter(b=>b.gain>1e-9).map(b=>({...b,blueCost:b.gain*b.blue}));
 const exactBlue=segments.reduce((n,b)=>n+b.blueCost,0);
 return {blue:Math.ceil(exactBlue-1e-9),exactBlue,gold:to===from?0:null,segments,reason:null,status:'user-estimate',strategy:'single-stat-manual'};
}

export function refinementInventoryBudget(needed,inventory={}){
 const owned=id=>typeof inventory[id]==='number'&&Number.isFinite(inventory[id])&&inventory[id]>=0?inventory[id]:null;
 const blue=owned('pet-blue'),gold=owned('pet-gold'),complete=blue!==null&&gold!==null;
 const equivalent=(blue??0)+(gold??0)*GOLD_TO_BLUE;
 return {blue,gold,complete,equivalent,needed,gap:needed===null||!complete?null:Math.max(0,needed-equivalent)};
}

export function refinementPlanBudget(pets,records={}){
 let needed=0,count=0,missing=0;
 for(const pet of pets){const groups=records[pet.id]||{};
  for(const [key,entry]of Object.entries(groups.planned||{})){
   count++;
   const result=estimatePetRefinement(pet,groups.current?.[key]?.value,entry.value);
   if(result.blue===null)missing++;else needed+=result.blue;
  }
 }
 return {count,missing,knownNeeded:needed,needed:missing?null:needed};
}
