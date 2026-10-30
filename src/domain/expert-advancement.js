import reference from '../data/expert-advancement-reference.json' with {type:'json'};
// Keep the legacy affinity path ID and saved levels; advancement is explicitly
// recorded separately rather than inferred from a level at a ten-level cap.
export function splitExpertAdvancements(data,board){
 const system=data.systems.find(s=>s.id==='experts');
 if(!system)return;
 for(const expert of board.experts){
  const affinity=system.paths.find(p=>p.id===expert.levelPath);
  if(!affinity)continue;
  const id=`expert-${expert.id}-advancement`;
  const existing=system.paths.find(p=>p.id===id);
  const referenceMilestones=reference.experts[expert.id];
  if(referenceMilestones)expert.milestones=referenceMilestones.map(m=>({...expert.milestones.find(old=>old.afterLevel===m.afterLevel),...m}));
  expert.advancementPath=id;
  const marks=new Map(affinity.rows.filter(r=>r.cost?.['expert-mark']!==undefined).map(r=>[r.level,r.cost['expert-mark']]));
  const rows=expert.milestones.map((m,i)=>({level:i+1,label:`${m.relation}（${m.afterLevel}级进阶）`,cost:{'expert-mark':referenceMilestones?m.mark:marks.get(m.afterLevel)??existing?.rows.find(r=>r.level===i+1)?.cost['expert-mark']??m.mark},resources:{},timeHours:0,attributes:[],effect:`完成${m.afterLevel}级关系进阶：${m.relation}；关系进阶属性待独立核对`,requiredAffinityLevel:m.afterLevel}));
  const sourceId='experts-advancement-2026-10-29';
  if(!data.sources.some(s=>s.id===sourceId))data.sources.push({id:sourceId,title:'专家关系进阶印记表（社区参考）',url:reference.source,status:'2026-10-29读取110个进阶节点；国服印记消耗待实机逐项核对。'});
  const advancement={id,name:`${expert.name} · 关系进阶`,expertTrack:'advancement',expertSlug:expert.slug,source:sourceId,unitLabel:'关系阶段',maxPieces:1,costStatus:'unverified',baseline:{level:0,label:'萍水相逢 · 未进阶',attributes:[]},coverage:'每10级单独进行一次关系进阶；仅计算专家印记，不重复计算好感度。',prerequisiteNote:'需先达到对应好感度等级；进阶状态须单独记录，旧等级记录不会自动视为已进阶。',rows};
  const index=system.paths.findIndex(p=>p.id===id);
  if(index<0)system.paths.push(advancement);else system.paths[index]=advancement;
  affinity.expertTrack='affinity';
  affinity.name=`${expert.name} · 好感度等级`;
  affinity.coverage='普通升级仅消耗好感度；每10级的专家印记在独立“关系进阶”路线计算。';
  affinity.prerequisiteNote='到达10／20／…／100级后需完成对应关系进阶，才可继续提升或解锁相应技能。关系进阶消耗请单独设置目标。';
  for(const row of affinity.rows){delete row.cost['expert-mark'];row.label=`${row.level}级${row.level%10===0?' · 可关系进阶':''}`;}
 }
}

export function expertAdvancementState(expert,profile,type='levels'){
 const stage=profile[type][expert.advancementPath];
 return Number.isInteger(stage)&&stage>=0&&stage<=expert.milestones.length?stage:null;
}
