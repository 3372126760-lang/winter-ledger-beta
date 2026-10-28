import {createSavedPlan,evaluateSavedPlan,validateSavedPlans} from '../domain/saved-plans.js';
import {CHIEF_ROWS,chiefGearLabel} from '../domain/chief-loadout.js';
import {CHIEF_TARGETS} from '../domain/chief-comparison.js';
import {STAGES} from '../domain/stages.js';

export function createSavedPlansPanel(data,{esc,fmt,money,getState,onChange,onNavigate,notify}){
 let activeId=null,confirmDelete=null,lastDeleted=null;
 const plans=()=>getState().savedPlans||[];
 const troopName=id=>CHIEF_ROWS.find(t=>t.id===id)?.name||id;
 const metricName=id=>CHIEF_TARGETS.find(([key])=>key===id)?.[1]||id;
 const stageName=id=>STAGES.find(s=>s.id===id)?.name||id;
 const date=value=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
 const label=(id,level)=>{
  if(level===null)return '未记录';
  const path=data.systems.find(s=>s.id===(id.includes(':gem:')?'chief-gems':'chief-gear'))?.paths[0];
  const row=path?.rows.find(r=>r.level===level)||(path?.baseline?.level===level?path.baseline:null);
  return row?chiefGearLabel(row.label):'档位资料待补';
 };
 function view(){return '<section class="card saved-plans" id="saved-plans"><div id="saved-plans-content"></div></section>';}
 function commit(next){onChange(validateSavedPlans(next));}
 function add(candidates,ids,config){
  const record=createSavedPlan(candidates,ids,{...config,stage:getState().stage},{id:crypto.randomUUID(),createdAt:new Date().toISOString()});
  commit([record,...plans()]);activeId=record.id;confirmDelete=null;refresh();
  document.querySelector('#saved-plans')?.scrollIntoView({block:'start'});notify('方案已加入自动存档，可在“已保存方案”继续查看。');
 }
 function detail(plan){
  const state=getState();
  const evaluated=evaluateSavedPlan(data,plan,state.account.chiefLoadout,{items:state.items,stage:state.stage,progress:state.progress,inventory:state.account.inventory,refinementMethod:state.refinement.method,boxChoices:state.boxChoices});
  const {positions,result,complete}=evaluated;
  const done=positions.filter(p=>p.status==='completed').length,pending=positions.filter(p=>p.status==='pending').length;
  const statusNames={pending:'待提升',completed:'已达到目标',unrecorded:'当前等级未记录',missing:'档位资料待补'};
  const full=complete?(result?.fullCost??(done===positions.length?0:null)):null;
  const gap=complete?(result?.gapCost??(done===positions.length?0:null)):null;
  const gain=result?.gainsByTroop[plan.troopId]?.[plan.metric];
  const gainComplete=complete&&evaluated.candidates.every(c=>Number.isFinite(c.gains[plan.metric]));
  const cost=plan.basis==='full'?full:gap;
  const budget=plan.budget===null?'未设置参考价值上限':`参考价值上限 ${money(plan.budget)} · 按${plan.basis==='full'?'全部材料':'库存缺口'}：${cost===null?'资料未齐，暂无法判断':cost>plan.budget+1e-8?'已超出':'在上限内'}`;
  return `<div class="saved-plan-detail"><div class="section-heading"><div><h3>${esc(plan.name)}</h3><p class="hint">${done}/${positions.length} 个位置达到目标 · ${pending} 个位置待提升</p></div><button class="text-button" id="saved-plan-close" type="button">收起</button></div><p class="hint">保存于 ${esc(date(plan.createdAt))}（北京时间） · 保存时 ${esc(stageName(plan.stage))} · 当前按 ${esc(stageName(state.stage))} 计算</p>${!complete?'<p class="note">部分位置的当前等级或资料缺失，下方仅列可计算部分，暂不显示整个方案的总价。</p>':''}<div class="combined-metrics"><div><span>剩余材料参考价值</span><strong>${full===null?'待补资料':money(full)}</strong></div><div><span>当前库存缺口参考价值</span><strong>${gap===null?(result&&!result.inventoryComplete?'库存未记齐':'待补资料'):money(gap)}</strong></div><div><span>${gainComplete?'剩余':'已知部分'}${esc(metricName(plan.metric))}提升</span><strong>${Number.isFinite(gain)?`+${fmt(gain,4)} 个百分点`:done===positions.length?'已达到目标':'待补属性'}</strong></div></div>${!gainComplete?'<p class="hint">部分位置的属性增量尚未齐全，属性仅显示已知部分。</p>':''}<p class="hint">${esc(budget)}</p><div class="table-scroll"><table><thead><tr><th>位置</th><th>现在 → 固定目标</th><th>进度</th></tr></thead><tbody>${positions.map(p=>`<tr><td>${esc(p.name)}<small>保存时 ${esc(label(p.id,p.from))}</small></td><td>${esc(label(p.id,p.current))} → ${esc(label(p.id,p.to))}</td><td><span class="pill ${p.status==='completed'?'green':p.status==='pending'?'':'amber'}">${statusNames[p.status]||'待核对'}</span></td></tr>`).join('')}</tbody></table></div>${result?`<h4>${complete?'剩余':'已知部分'}材料清单</h4><div class="table-scroll"><table><thead><tr><th>材料</th><th>合并需求</th><th>当前库存</th><th>缺口</th></tr></thead><tbody>${result.materials.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.needed,4)}</td><td>${m.owned===null?'未记录':fmt(m.owned,4)}</td><td>${m.owned===null?'待记录':fmt(m.gap,4)}</td></tr>`).join('')}</tbody></table></div>`:''}<p class="hint">更新“当前装备与宝石”或“账号与库存”后，按原目标重算剩余需求。这里只做测算，不会自动升级或扣减库存。多个已保存方案各自使用同一份库存。</p>${onNavigate?'<button class="button quiet" id="saved-plan-inventory" type="button">填写材料库存 →</button>':''}<details class="saved-plan-manage"><summary>管理这份方案</summary><form id="saved-plan-rename"><label>方案名称<input name="name" maxlength="80" required value="${esc(plan.name)}"></label><button class="button" type="submit">保存名称</button></form>${confirmDelete===plan.id?`<div class="clear-snapshots-confirm"><p>删除“${esc(plan.name)}”？只删除这份目标方案，库存与当前等级保留。</p><button class="button danger" id="saved-plan-delete-confirm" type="button">确认删除方案</button><button class="button" id="saved-plan-delete-cancel" type="button">取消</button></div>`:'<button class="button danger" id="saved-plan-delete" type="button">删除这份方案</button>'}</details></div>`;
 }
 function refresh(){
  const root=document.querySelector('#saved-plans-content');if(!root)return;
  const records=plans(),active=records.find(p=>p.id===activeId);
  root.innerHTML=`<div class="section-heading"><div><p class="eyebrow">SAVED PLANS</p><h2>已保存方案</h2></div><span class="pill">${records.length} / 100 份</span></div><p class="hint">在“提升方案比较”中勾选位置并保存目标，下次打开可继续查看；随本机自动存档和导出备份一起保留。</p>${records.length?`<div class="saved-plan-list">${records.map(p=>`<button type="button" data-saved-plan="${esc(p.id)}" class="saved-plan-card ${p.id===activeId?'active':''}" aria-pressed="${p.id===activeId}"><strong>${esc(p.name)}</strong><span>${esc(troopName(p.troopId))} · ${esc(metricName(p.metric))} · ${p.entries.length} 个位置</span><small>${esc(date(p.createdAt))} 保存</small></button>`).join('')}</div>`:'<div class="compare-empty">还没有保存的方案。勾选要一起提升的位置后，点击“保存这份方案”。</div>'}${lastDeleted?'<p class="saved-plan-undo"><span>已删除一份方案，本次打开页面期间可撤销。</span><button class="text-button" id="saved-plan-undo" type="button">撤销删除</button></p>':''}<div id="saved-plan-detail"></div>`;
  if(active){try{root.querySelector('#saved-plan-detail').innerHTML=detail(active);}catch(error){root.querySelector('#saved-plan-detail').textContent='此方案暂时无法计算：'+error.message;}}
  root.querySelectorAll('[data-saved-plan]').forEach(button=>button.addEventListener('click',()=>{activeId=button.dataset.savedPlan;confirmDelete=null;refresh();document.querySelector('#saved-plan-detail')?.scrollIntoView({block:'start'});}));
  root.querySelector('#saved-plan-close')?.addEventListener('click',()=>{activeId=null;refresh();});
  root.querySelector('#saved-plan-inventory')?.addEventListener('click',()=>onNavigate('account'));
  root.querySelector('#saved-plan-rename')?.addEventListener('submit',event=>{event.preventDefault();try{const name=new FormData(event.target).get('name').trim();commit(plans().map(p=>p.id===activeId?{...p,name}:p));refresh();notify('方案名称已保存。');}catch(error){notify(error.message);}});
  root.querySelector('#saved-plan-delete')?.addEventListener('click',()=>{confirmDelete=activeId;refresh();root.querySelector('.saved-plan-manage').open=true;});
  root.querySelector('#saved-plan-delete-cancel')?.addEventListener('click',()=>{confirmDelete=null;refresh();});
  root.querySelector('#saved-plan-delete-confirm')?.addEventListener('click',()=>{try{const record=plans().find(p=>p.id===confirmDelete);if(!record)return;commit(plans().filter(p=>p.id!==record.id));lastDeleted=structuredClone(record);activeId=null;confirmDelete=null;refresh();notify('方案已删除，当前库存与等级保留。');}catch(error){notify(error.message);}});
  root.querySelector('#saved-plan-undo')?.addEventListener('click',()=>{try{if(!lastDeleted)return;if(plans().some(p=>p.id===lastDeleted.id))throw new Error('这份方案已存在。');commit([lastDeleted,...plans()]);activeId=lastDeleted.id;lastDeleted=null;refresh();notify('已恢复删除的方案。');}catch(error){notify(error.message);}});
 }
 return {view,bind:refresh,refresh,add};
}
