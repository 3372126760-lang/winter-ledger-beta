import {CHIEF_ROWS,validateChiefLoadout} from './chief-loadout.js';
import {calculatePlan} from './planning.js';

export const CHIEF_TARGETS=[['attack','攻击'],['defense','防御'],['health','生命'],['lethality','穿透']];
const keys={attack:'chief.attack',defense:'chief.defense',health:'chief-gem.health',lethality:'chief-gem.lethality'};

// Each candidate is a separate alternative using the same inventory snapshot.
// The caller must never add the affordable rows as if that stock were reusable.
export function chiefUpgradeCandidates(data,input,context={},request={mode:'next'}){
 if(!['next','target'].includes(request.mode))throw new Error('比较方式无效');
 const loadout=validateChiefLoadout(input),candidates=[],positions=[];
 for(const troop of CHIEF_ROWS)for(const slot of troop.slots){
  for(const selection of [{kind:'gear',gemIndex:null},...[0,1,2].map(gemIndex=>({kind:'gem',gemIndex}))]){
   const {kind,gemIndex}=selection,id=`${slot.id}:${kind}${kind==='gem'?':'+gemIndex:''}`;
   const from=kind==='gear'?loadout[slot.id].gear:loadout[slot.id].gems[gemIndex];
   const name=`${troop.name} · ${slot.name}${kind==='gem'?` · 宝石${gemIndex+1}`:''}`;
   const position={id,name,troopId:troop.id,slotId:slot.id,kind,gemIndex,from,status:'unrecorded'};positions.push(position);
   if(from===null)continue;
   const systemId=kind==='gear'?'chief-gear':'chief-gems',path=data.systems.find(s=>s.id===systemId)?.paths[0];
   if(!path){position.status='missing';continue;}
   const before=path.rows.find(r=>r.level===from)||(path.baseline?.level===from?path.baseline:null);
   if(!before){position.status='missing';continue;}
   const target=request[kind==='gear'?'gearLevel':'gemLevel'];
   if(request.mode==='target'&&(!Number.isInteger(target)||!path.rows.some(r=>r.level===target)))throw new Error('请选择资料已收录的目标档位');
   if(request.mode==='target'&&from>=target){position.status='at-target';continue;}
   const next=request.mode==='target'?path.rows.find(r=>r.level===target):path.rows.filter(r=>r.level>from).sort((a,b)=>a.level-b.level)[0];
   if(!next){position.status='maximum';continue;}
   const result=calculatePlan(path,from,next.level,1,context);
   const gains=Object.fromEntries(Object.entries(keys).map(([name,key])=>[name,result.attributes.find(a=>a.key===key)?.delta??null]));
   const trusted=path.costStatus==='available'&&!result.resources.length&&result.materials.length>0;
   const fullCost=trusted&&result.priceComplete?result.fullValue:null;
   // A missing unit price is harmless only when the confirmed inventory covers
   // that material fully; an unknown inventory must never appear to be zero.
   const gapCost=trusted&&result.inventoryComplete&&result.materials.every(m=>m.gap===0||m.gapValue!==null)?result.knownGapValue:null;
   position.status='candidate';
   candidates.push({...position,from,to:next.level,beforeLabel:before.label,afterLabel:next.label,gains,fullCost,gapCost,costVerified:trusted,
    stepCount:path.rows.filter(r=>r.level>from&&r.level<=next.level).length,
    materials:result.materials,inventoryComplete:result.inventoryComplete,missingPrices:result.missingPrices,
    plan:{systemId,pathId:path.id,from,to:next.level,pieces:1,chiefSelection:{slotId:slot.id,kind,gemIndex}}});
  }
 }
 return {candidates,positions};
}

export const nextChiefSteps=(data,input,context={})=>chiefUpgradeCandidates(data,input,context);

export function combineChiefSteps(candidates,ids,context={}){
 if(!Array.isArray(ids)||!ids.length||ids.length>24||new Set(ids).size!==ids.length)throw new Error('请选择不同的提升项目');
 const selected=ids.map(id=>candidates.find(c=>c.id===id));if(selected.some(c=>!c))throw new Error('所选项目已变化，请重新勾选');
 const cost={},gainsByTroop={};
 for(const candidate of selected){
  for(const m of candidate.materials)cost[m.itemId]=(cost[m.itemId]||0)+m.needed;
  const gains=gainsByTroop[candidate.troopId]??={attack:null,defense:null,health:null,lethality:null};
  for(const [key,value] of Object.entries(candidate.gains))if(Number.isFinite(value))gains[key]=(gains[key]??0)+value;
 }
 const trusted=selected.every(c=>c.costVerified);
 const result=calculatePlan({costStatus:trusted?'available':'unverified',maxPieces:1,baseline:{level:0},rows:[{level:1,cost}]},0,1,1,context);
 const fullCost=trusted&&result.priceComplete?result.fullValue:null;
 const gapCost=trusted&&result.inventoryComplete&&result.materials.every(m=>m.gap===0||m.gapValue!==null)?result.knownGapValue:null;
 return {selected,materials:result.materials,gainsByTroop,fullCost,gapCost,inventoryComplete:result.inventoryComplete};
}

export function compareChiefSteps(candidates,{troopId,metric,basis='full',budget=null}){
 if(!CHIEF_ROWS.some(t=>t.id===troopId)||!CHIEF_TARGETS.some(([id])=>id===metric)||!['full','gap'].includes(basis))throw new Error('比较目标无效');
 if(budget!==null&&(typeof budget!=='number'||!Number.isFinite(budget)||budget<0||budget>1e12))throw new Error('请输入有效的参考价值上限');
 const kind=['attack','defense'].includes(metric)?'gear':'gem';
 const rows=candidates.filter(c=>c.troopId===troopId&&c.kind===kind).map(c=>{
  const gain=c.gains[metric],cost=basis==='full'?c.fullCost:c.gapCost;
  const beneficial=Number.isFinite(gain)&&gain>0;
  const status=!beneficial?'no-gain':cost===null?'unknown':budget!==null&&cost>budget+1e-8?'over-budget':'comparable';
  return {...c,gain,cost,status,unitCost:beneficial&&cost!==null?cost/gain:null,rank:null};
 });
 const order={comparable:0,unknown:1,'over-budget':2,'no-gain':3};
 rows.sort((a,b)=>order[a.status]-order[b.status]||(a.unitCost??Infinity)-(b.unitCost??Infinity)||(b.gain??0)-(a.gain??0)||a.id.localeCompare(b.id));
 let rank=0;for(const row of rows)if(row.status==='comparable')row.rank=++rank;
 return {rows,comparable:rank,unknown:rows.filter(r=>r.status==='unknown').length,overBudget:rows.filter(r=>r.status==='over-budget').length};
}
