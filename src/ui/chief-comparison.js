import {chiefUpgradeCandidates,combineChiefSteps,compareChiefSteps,CHIEF_TARGETS} from '../domain/chief-comparison.js';
import {CHIEF_ROWS,chiefGearLabel} from '../domain/chief-loadout.js';

export function createChiefComparisonPanel(data,{esc,options,fmt,money,getState,onPlan,onSave,onNavigate,onOpenCurrent,notify}){
 let troopId=null,metric=null,basis='full',budget=null,mode='next',planName='';
 const targets={gear:null,gem:null},selected=new Map();
 const kindOf=()=>['attack','defense'].includes(metric)?'gear':'gem';
 const targetName=()=>CHIEF_TARGETS.find(([id])=>id===metric)?.[1]||'属性';
 const pathFor=kind=>data.systems.find(s=>s.id===(kind==='gear'?'chief-gear':'chief-gems')).paths[0];
 const context=()=>{const s=getState();return {items:s.items,stage:s.stage,progress:s.progress,inventory:s.account.inventory,refinementMethod:s.refinement.method,boxChoices:s.boxChoices};};
 function targetFor(kind){
  const rows=pathFor(kind).rows;if(rows.some(r=>r.level===targets[kind]))return targets[kind];
  const state=getState(),troop=CHIEF_ROWS.find(r=>r.id===troopId)||CHIEF_ROWS[0];
  const levels=troop.slots.flatMap(slot=>kind==='gear'?[state.account.chiefLoadout[slot.id].gear]:state.account.chiefLoadout[slot.id].gems).filter(l=>l!==null);
  const from=levels.length?Math.min(...levels):0;
  return targets[kind]=(rows.find(r=>r.level>from)||rows.at(-1)).level;
 }
 function candidates(){return chiefUpgradeCandidates(data,getState().account.chiefLoadout,context(),mode==='target'?{mode,gearLevel:targetFor('gear'),gemLevel:targetFor('gem')}:{mode});}
 const signature=row=>`${row.from}:${row.to}`;
 function trimSelection(steps){for(const [id,value] of selected){const row=steps.candidates.find(c=>c.id===id);if(!row||signature(row)!==value)selected.delete(id);}}
 function targetOptions(){return options(pathFor(kindOf()).rows.map(r=>[String(r.level),chiefGearLabel(r.label)]),String(targetFor(kindOf())));}
 function syncTarget(){
  const field=document.querySelector('#compare-target-field'),select=document.querySelector('#compare-target');
  if(field)field.hidden=mode!=='target';if(select)select.innerHTML=targetOptions();
 }
 function view(systemId){
  if(!['chief-gear','chief-gems'].includes(systemId))return '';
  const steps=candidates();
  if(!metric)metric=steps.candidates.some(c=>c.kind==='gear')?'attack':'health';
  if(!troopId)troopId=steps.candidates.find(c=>c.kind===kindOf())?.troopId||'infantry';
  return `<section class="card chief-comparison" id="chief-comparison"><div class="section-heading"><div><p class="eyebrow">UPGRADE COMPARISON</p><h2>提升方案比较</h2></div><button type="button" class="text-button" id="compare-open-records">填写账号当前等级 →</button></div><p class="hint">选择一个兵种和一项属性，比较下一档或统一目标整段。勾选项目后可合并材料需求；套装与材料交换尚未计入。</p><div class="compare-controls"><label>目标兵种<select id="compare-troop">${options(CHIEF_ROWS.map(t=>[t.id,t.name]),troopId)}</select></label><label>目标属性<select id="compare-metric">${options(CHIEF_TARGETS,metric)}</select></label><label>比较范围<select id="compare-mode">${options([['next','各位置的下一档'],['target','升到统一目标档位']],mode)}</select></label><label id="compare-target-field" class="compare-target-field" ${mode==='target'?'':'hidden'}>统一目标档位<select id="compare-target">${targetOptions()}</select></label><label>比较口径<select id="compare-basis">${options([['full','全部材料参考价值'],['gap','库存缺口参考价值']],basis)}</select></label><label>参考价值上限（元，可留空）<input id="compare-budget" type="number" min="0" max="1000000000000" step="any" placeholder="不限" value="${Number.isFinite(budget)?budget:''}"></label></div><div id="compare-results" aria-live="polite"></div><p class="hint compare-limits">单行分别使用同一份库存。多位置一起提升请查看“已选方案合计”，库存在那里只扣一次。参考价值不等于实际礼包支出，当前不自动求最优组合。</p></section>`;
 }
 function detail(row){return `<details class="compare-materials"><summary>查看材料与库存</summary><ul>${row.materials.map(m=>`<li>${esc(m.name)}：需 ${fmt(m.needed,4)}；库存 ${m.owned===null?'未记录':fmt(m.owned,4)}；缺 ${m.owned===null?'待记录后确认':fmt(m.gap,4)}</li>`).join('')}</ul></details>`;}
 function refreshCombined(steps){
  const element=document.querySelector('#compare-combined');if(!element)return;
  trimSelection(steps);
  const jump=document.querySelector('#compare-combined-jump');if(jump){jump.hidden=!selected.size;jump.textContent='查看已选 '+selected.size+' 项合计 ↓';}
  if(!selected.size){element.innerHTML='<p class="hint">勾选要一起提升的位置，在这里汇总材料并统一扣除库存。</p>';return;}
  const result=combineChiefSteps(steps.candidates,[...selected.keys()],context());
  const gain=result.gainsByTroop[troopId]?.[metric],complete=result.selected.every(c=>Number.isFinite(c.gains[metric]));
  const cost=basis==='full'?result.fullCost:result.gapCost;
  const limit=budget===null?'':cost===null?'资料未齐，暂不能判断是否在上限内':cost>budget+1e-8?'合并后超出当前参考价值上限':'合并方案在当前参考价值上限内';
  element.innerHTML=`<div class="section-heading"><h3>已选方案合计 · ${selected.size} 个位置</h3><button type="button" class="text-button" id="compare-clear-selection">清空勾选</button></div><div class="combined-targets">${result.selected.map(c=>`<span>${esc(c.name)}：${esc(chiefGearLabel(c.beforeLabel))} → ${esc(chiefGearLabel(c.afterLabel))}</span>`).join('')}</div><div class="combined-metrics"><div><span>全部材料参考价值</span><strong>${result.fullCost===null?'待补价格':money(result.fullCost)}</strong></div><div><span>库存缺口参考价值</span><strong>${result.gapCost===null?(result.inventoryComplete?'待补价格':'库存未记齐'):money(result.gapCost)}</strong></div><div><span>${complete?'':'已知'}${targetName()}合计提升</span><strong>${gain===null||gain===undefined?'待补属性':`+${fmt(gain,4)} 个百分点`}</strong></div></div>${limit?`<p class="hint ${cost!==null&&budget!==null&&cost>budget?'compare-warning':''}">${esc(limit)}</p>`:''}<div class="table-scroll"><table><thead><tr><th>材料</th><th>合并需求</th><th>已记录库存</th><th>合并缺口</th></tr></thead><tbody>${result.materials.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.needed,4)}</td><td>${m.owned===null?'未记录':fmt(m.owned,4)}</td><td>${m.owned===null?'待记录':fmt(m.gap,4)}</td></tr>`).join('')}</tbody></table></div><p class="hint">各位置先合并需求，再扣同一份库存。此处只做方案测算，不会扣减库存或更改当前等级。需要下次继续查看时，可将勾选的目标保存为方案。</p>`;
  document.querySelector('#compare-clear-selection')?.addEventListener('click',()=>{selected.clear();update();});
  if(onSave){
   const defaultName=`${CHIEF_ROWS.find(t=>t.id===troopId)?.name} · ${targetName()}提升`;
   element.insertAdjacentHTML('beforeend',`<form class="save-plan-form" id="compare-save-plan"><label>方案名称<input name="name" maxlength="80" placeholder="${esc(defaultName)}" value="${esc(planName)}"></label><button type="submit" class="button primary">保存这份方案</button></form>`);
   element.querySelector('[name="name"]').addEventListener('input',event=>{planName=event.target.value;});
   element.querySelector('#compare-save-plan').addEventListener('submit',event=>{
    event.preventDefault();try{
     const current=candidates();trimSelection(current);
     onSave(current.candidates,[...selected.keys()],{name:planName.trim()||defaultName,troopId,metric,basis,budget});
    }catch(error){notify(error.message);}
   });
  }
 }
 function update(){
  const element=document.querySelector('#compare-results');if(!element)return;
  try{
   const steps=candidates();trimSelection(steps);
   const computed=compareChiefSteps(steps.candidates,{troopId,metric,basis,budget});
   const positions=steps.positions.filter(p=>p.troopId===troopId&&p.kind===kindOf());
   const unknown=positions.filter(p=>p.status==='unrecorded').length,max=positions.filter(p=>p.status==='maximum').length,atTarget=positions.filter(p=>p.status==='at-target').length;
   const missing=positions.filter(p=>p.status==='missing').length,best=computed.rows.find(r=>r.rank===1);
   element.innerHTML=`<div class="compare-summary"><span>${positions.length-unknown}/${positions.length} 个位置已记录${max?` · ${max} 处已到资料最高档`:''}${atTarget?` · ${atTarget} 处已达到目标`:''}</span><span>${computed.comparable} 项可比较${computed.unknown?` · ${computed.unknown} 项资料未齐`:''}${computed.overBudget?` · ${computed.overBudget} 项超出上限`:''}</span><button type="button" class="text-button" id="compare-combined-jump" hidden>查看已选方案 ↓</button></div>${best?`<div class="compare-best"><span>本次比较 · 每个百分点参考价值最低</span><strong>${esc(best.name)} → ${esc(chiefGearLabel(best.afterLabel))}</strong><p>${targetName()} +${fmt(best.gain,4)} 个百分点 · ${basis==='gap'&&best.cost===0?'已确认库存可覆盖本项材料':`${basis==='gap'?'缺口':'全部材料'} ${money(best.cost)}`}</p></div>`:''}${computed.rows.length?`<div class="table-scroll"><table class="compare-table"><thead><tr><th>合并</th><th>位置与目标档</th><th>${targetName()}提升</th><th>${basis==='gap'?'缺口':'材料'}参考价值</th><th>每1个百分点</th><th></th></tr></thead><tbody>${computed.rows.map(row=>`<tr class="${row.rank===1?'compare-first':''} ${selected.has(row.id)?'compare-picked':''}"><td><input type="checkbox" class="compare-check" data-compare-select="${esc(row.id)}" aria-label="选择${esc(row.name)}的提升" ${selected.has(row.id)?'checked':''}></td><td><div class="compare-position">${row.rank?`<span class="compare-rank">${row.rank}</span>`:''}<div><strong>${esc(row.name)}</strong><small>${esc(chiefGearLabel(row.beforeLabel))} → ${esc(chiefGearLabel(row.afterLabel))}${row.stepCount>1?` · 跨${row.stepCount}档`:''}</small></div></div>${detail(row)}</td><td>${row.gain===null?'待补属性':`+${fmt(row.gain,4)} 个百分点`}</td><td>${row.cost===null?`<span class="pill amber">${basis==='gap'&&!row.inventoryComplete?'库存未记齐':'单价或配方待补'}</span>`:money(row.cost)}${row.status==='over-budget'?'<small class="compare-warning">超出上限</small>':''}</td><td>${row.unitCost===null?'—':money(row.unitCost)}${row.status==='no-gain'?'<small>本段未增加此属性</small>':''}</td><td><button type="button" class="button quiet" data-compare-plan="${esc(row.id)}">测算${mode==='target'?'这一段':'这一步'} →</button></td></tr>`).join('')}</tbody></table></div><section class="compare-combined" id="compare-combined"></section>`:`<div class="compare-empty">${unknown?'请先填写目标对应位置的当前等级。':atTarget===positions.length?'这些位置均已达到或超过统一目标，不生成降级方案。':max===positions.length?'这些位置均已达到当前资料的最高档。':'当前没有可比较的提升资料。'}</div>`}${unknown?`<p class="hint">${unknown} 个位置尚未记录，未按未制作／未镶嵌处理。</p>`:''}${missing?`<p class="hint">${missing} 个记录的档位资料待核对，暂未参与比较。</p>`:''}`;
   element.querySelectorAll('[data-compare-select]').forEach(box=>box.addEventListener('change',()=>{
    const current=candidates(),row=current.candidates.find(c=>c.id===box.dataset.compareSelect);
    if(box.checked&&row)selected.set(row.id,signature(row));else selected.delete(box.dataset.compareSelect);
    box.closest('tr').classList.toggle('compare-picked',box.checked);refreshCombined(current);
   }));
   element.querySelectorAll('[data-compare-plan]').forEach(button=>button.addEventListener('click',()=>{
    const current=candidates().candidates.find(c=>c.id===button.dataset.comparePlan);
    if(!current){notify('此位置记录已变化，请重新选择。');update();return;}
    onPlan(current.plan);document.querySelector('.planning-detail')?.scrollIntoView({block:'start'});
   }));
   document.querySelector('#compare-combined-jump')?.addEventListener('click',()=>document.querySelector('#compare-combined')?.scrollIntoView({block:'start'}));
   refreshCombined(steps);
   if(basis==='gap'&&computed.rows.some(r=>!r.inventoryComplete)&&onNavigate){
    const help=document.createElement('p');help.className='hint compare-inventory-help';
    help.innerHTML='先在“账号与库存”补齐所需材料数量，再比较库存缺口。 <button type="button" class="text-button">补充库存 →</button>';
    help.querySelector('button').addEventListener('click',()=>onNavigate('account'));element.append(help);
   }
  }catch(error){element.textContent=error.message;}
 }
 function bind(){
  document.querySelectorAll('[data-show-comparison]').forEach(button=>button.addEventListener('click',()=>document.querySelector('#chief-comparison')?.scrollIntoView({block:'start'})));
  document.querySelector('#compare-open-records')?.addEventListener('click',()=>onOpenCurrent?.({systemId:getState().planning.systemId}));
  for(const [id,key] of [['compare-troop','troop'],['compare-metric','metric'],['compare-basis','basis'],['compare-mode','mode']])document.querySelector('#'+id)?.addEventListener('change',event=>{
   if(key==='troop')troopId=event.target.value;if(key==='metric')metric=event.target.value;if(key==='basis')basis=event.target.value;if(key==='mode')mode=event.target.value;
   if(key!=='basis')selected.clear();syncTarget();update();
  });
  document.querySelector('#compare-target')?.addEventListener('change',event=>{targets[kindOf()]=Number(event.target.value);selected.clear();update();});
  document.querySelector('#compare-budget')?.addEventListener('input',event=>{budget=event.target.validity.badInput?NaN:event.target.value.trim()===''?null:Number(event.target.value);update();});
  update();
 }
 return {view,bind};
}
