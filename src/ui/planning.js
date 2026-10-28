import {GROWTH_SYSTEMS,growthRecordsView,bindGrowthRecords} from './growth-records.js';
import {calculatePlan,planningAvailability} from '../domain/planning.js';
import {createChiefLoadoutPanel} from './chief-loadout.js';
import {growthNotes} from './growth-notes.js';
import {researchDuration,validateResearchSettings} from '../domain/research-time.js';
import {createChiefComparisonPanel} from './chief-comparison.js';
import {createSavedPlansPanel} from './saved-plans.js';
import {ordinaryResearchPaths,ordinaryResearchControls,ordinaryResearchDetails} from './ordinary-research.js';
import {createResearchTreePanel} from './research-tree.js';

export function createPlanningPanel(data,art,{esc,fmt,money,options,pill,artIcon,itemOf,getState,onChange,onSavedPlansChange,onResearchChange,onNavigate,onOpenCurrent,onTargetsChange,onTechnologyChange,onChiefChange,onChiefTargetsChange,onGrowthChange,notify}){
  const systems=data.systems;
  const researchSettings=()=>validateResearchSettings(getState().research);
  const isResearch=()=>['research','t11','t12'].includes(selection().system.id);
  const timeLabel=hours=>hours===null?'待补时间':hours>0&&hours<1/60?`${fmt(hours*3600,2)} 秒`:hours>0&&hours<1?`${fmt(hours*60,2)} 分钟`:`${fmt(hours,2)} 小时`;
  const timeResult=(base,speed)=>{
    if(base===null)return '<p class="hint">当前区间有未确认的基础工期，暂不计算实际时间。</p>';
    const r=researchDuration(base,speed);
    return `<div class="research-time-results"><span>实际研究时间<strong>${timeLabel(r.duration)}</strong></span><span>计划原始研究时间<strong>${timeLabel(base)}</strong></span></div>`;
  };
  function researchControls(){
    if(!isResearch())return '';
    const {speedPercent}=researchSettings();
    return `<div class="research-settings"><h3>研究时间设置</h3><div class="form-grid"><label>研究速度（%）<div class="percent-input"><input id="research-speed" aria-label="研究速度（%）" type="number" min="0" max="10000" step="any" value="${speedPercent}"><span aria-hidden="true">%</span></div></label><div class="research-auto-time"><span>计划原始研究时间</span><output id="research-original-time" aria-live="polite">根据计划等级自动计算</output></div></div><p class="hint">实际研究时间＝原始时间 ÷（1＋研究速度÷100）。例如填100，时间减半。原始时间按当前等级到计划目标逐级汇总，自动更新，无需手动填写；研究速度自动保存，普通科技、T11、T12共用。</p></div>`;
  }
  function timeView(base){
    if(!isResearch())return '';
    const {speedPercent}=researchSettings();
    return `<div class="research-time"><h3>研究时间汇总</h3><div id="research-time-result" aria-live="polite">${timeResult(base,speedPercent)}</div><p class="hint">原始研究时间由所选升级区间自动汇总；实际时间按研究速度折算，未抵扣联盟帮助或即时减时。</p></div>`;
  }
  function timeMetric(base){
    if(!isResearch())return `<span>基础耗时</span><strong>${timeLabel(base)}</strong><small>未扣建造速度与帮助</small>`;
    const {speedPercent}=researchSettings(),duration=researchDuration(base,speedPercent)?.duration??null;
    return `<span>实际研究时间</span><strong id="planning-actual-time" aria-live="polite">${timeLabel(duration)}</strong><small id="planning-base-time">原始 ${timeLabel(base)} · 研究速度 ${fmt(speedPercent,4)}%</small>`;
  }
  function bindTime(base){
    const originalTime=document.querySelector('#research-original-time');
    if(originalTime)originalTime.textContent=timeLabel(base);
    const field=document.querySelector('#research-speed');if(!field)return;
    field.oninput=()=>{
      const result=document.querySelector('#research-time-result');if(!result)return;
      const actual=document.querySelector('#planning-actual-time'),original=document.querySelector('#planning-base-time');
      try{
        if(field.validity.badInput||field.value.trim()==='')throw new Error('请填写研究速度百分数。');
        const next=validateResearchSettings({speedPercent:Number(field.value),waitHours:0});
        onResearchChange(next);result.innerHTML=timeResult(base,next.speedPercent);
        if(actual)actual.textContent=timeLabel(researchDuration(base,next.speedPercent)?.duration??null);
        if(original)original.textContent=`原始 ${timeLabel(base)} · 研究速度 ${fmt(next.speedPercent,4)}%`;
      }catch(error){result.textContent=error.message;if(actual)actual.textContent='请检查输入';}
    };
  }
  const chiefPanel=createChiefLoadoutPanel(data,art,{esc,options,getState,onOpenCurrent,onRecord:onChiefChange,onTargetsChange:onChiefTargetsChange,onPlan:next=>{const previous=getState().planning,refresh=previous.systemId!==next.systemId||!previous.chiefSelection||!next.chiefSelection;const x=window.scrollX,y=window.scrollY;onChange(next,refresh);if(!refresh)updateTechnologyCalculation();window.scrollTo(x,y);},notify});
  const savedPanel=createSavedPlansPanel(data,{esc,fmt,money,getState,onChange:onSavedPlansChange,onNavigate,notify});
  const comparisonPanel=createChiefComparisonPanel(data,{esc,options,fmt,money,getState,onPlan:next=>onChange(next,true),onSave:savedPanel.add,onNavigate,onOpenCurrent,notify});
  const treePanel=createResearchTreePanel(data,{esc,getSelection:selection,getState,onChange,onTechnologyChange,onOpenCurrent,onTargetsChange,onSelectionChange:updateTechnologyCalculation,notify});
  const source=id=>data.sources.find(s=>s.id===id);
  function selection(){
    const state=getState(),p=state.planning;
    const system=systems.find(s=>s.id===p.systemId)||systems[0];
    const path=system.paths.find(pth=>pth.id===p.pathId&&!pth.heroGearTemplate)||system.paths.find(pth=>!pth.heroGearTemplate);
    if(!path)return {system,path:null,p};
    const levels=[...new Map([...(path.baseline?[path.baseline]:[]),...path.rows].map(row=>[row.level,row])).values()].sort((a,b)=>a.level-b.level).map(row=>system.id==='t11'?{...row,label:row.level===0?'未研究':row.level+'级'}:row);
    const selected=p.chiefSelection,record=selected?state.account.chiefLoadout[selected.slotId]:null;
    const technologyNode=treePanel.nodeFor(system,path,p);
    const technologyLevel=treePanel.recordedLevel(system,path,p);
    const growthLevel=GROWTH_SYSTEMS.includes(system.id)?state.battleProfile?.levels[path.id]??null:null;
    const recorded=GROWTH_SYSTEMS.includes(system.id)?growthLevel:record?(selected.kind==='gear'?record.gear:record.gems[selected.gemIndex]):technologyLevel;
    const currentAtMaximum=recorded!==null&&recorded===levels.at(-1).level;
    const requestedFrom=recorded!==null?recorded:p.from;
    const from=levels.some(r=>r.level===requestedFrom)?requestedFrom:levels[0].level;
    const chiefTarget=selected?(selected.kind==='gear'?state.chiefTargets?.[selected.slotId]?.gear:state.chiefTargets?.[selected.slotId]?.gems[selected.gemIndex]):null;
    const target=GROWTH_SYSTEMS.includes(system.id)?state.battleProfile?.planned[path.id]??p.to:technologyNode?state.technologyTargets?.[technologyNode.id]??p.to:chiefTarget??p.to;
    const currentGoalMet=recorded!==null&&((Boolean(technologyNode)&&state.technologyTargets?.[technologyNode.id]!==undefined)||chiefTarget!==null)&&target<=recorded;
    const to=currentGoalMet?from:levels.some(r=>r.level===target&&r.level>from)?target:(levels.find(r=>r.level>from)?.level??from);
    return {system,path,p:{...p,pathId:path.id,from,to,pieces:p.chiefSelection?1:Math.min(p.pieces,path.maxPieces||1)},levels,currentAtMaximum,currentGoalMet,technologyRecorded:technologyLevel!==null,currentUnrecorded:Boolean(technologyNode||record||GROWTH_SYSTEMS.includes(system.id))&&recorded===null};
  }
  const link=id=>{const s=source(id);return !s?'来源待补':s.url?`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ↗</a>`:esc(s.title);};
  function view(){
    const {system,path,p,levels,currentAtMaximum,currentGoalMet,technologyRecorded,currentUnrecorded}=selection(),status=planningAvailability(system.id,getState().progress);
    const cards=systems.map(s=>{
      const available=s.paths.filter(p=>p.costStatus==='available').length;
      const label=available?`${available} 条材料测算${s.paths.length>available?` · ${s.paths.length-available} 条预览`:'路径'}`:s.paths.length?`${s.paths.length} 条资料预览`:'待补升级数据';
      return `<button type="button" class="planning-system ${s.id===system.id?'selected':''}" data-planning-system="${esc(s.id)}" aria-pressed="${s.id===system.id}"><strong>${esc(s.name)}</strong><span>${esc(label)}</span></button>`;
    }).join('');
    return `<div class="page-title"><div><p class="eyebrow">GROWTH PLANNING</p><h1>把每一步提升，算清楚。</h1><p class="description">读取账号当前等级，设置提升目标，计算升级材料、库存缺口与属性变化。</p></div>${!["chief-gear","chief-gems"].includes(system.id)?'<button type="button" class="button quiet" id="planning-open-current">填写账号当前等级 →</button>':''}${["chief-gear","chief-gems"].includes(system.id)?'<button type="button" class="button quiet" data-show-comparison>比较提升方案 ↓</button>':''}</div><div class="planning-systems" aria-label="选择提升系统">${cards}</div>${chiefPanel.view(system.id)}${growthRecordsView(data,system.id,getState(),esc)}${['chief-gear','chief-gems'].includes(system.id)?`<details class="chief-comparison-extra" id="chief-comparison-extra"><summary>按属性比较提升方案</summary>${comparisonPanel.view(system.id)}</details>`:comparisonPanel.view(system.id)}${['chief-gear','chief-gems'].includes(system.id)||getState().savedPlans?.length?savedPanel.view():''}<section class="card planning-detail"><div class="section-heading"><div><h2>${esc(system.name)}</h2><p class="hint">${esc(system.description||'')}</p></div><div class="planning-heading-actions">${pill(path?.costStatus==='available'?'材料测算':'资料预览',path?.costStatus==='available'?'':'amber')}${p.chiefSelection?'<button type="button" class="text-button" data-show-comparison>返回方案比较 ↑</button>':''}</div></div>${(!status.available||status.preview)?`<div class="note">${esc(status.reason||status.message||'当前进度尚未开放，可查阅未来的升级资料。')}</div>`:''}${path?`${system.id==='research'?ordinaryResearchControls(system,path,{esc,options}):''}${treePanel.view(system,path,p)}${treePanel.hasTree()||p.chiefSelection?`<div id="technology-calculation" class="tech-calculation-heading"><div><h3>所选项目消耗 · <span id="tech-calculation-name">${esc(treePanel.nameForPath(path.id))}</span></h3><p class="hint" id="tech-calculation-range">${currentUnrecorded?'当前等级未记录，请先填写账号现状':currentGoalMet?'原计划目标已达成，可在图上选择新目标':`当前 ${p.from}级 → 计划 ${p.to}级`}</p></div><button type="button" class="text-button" id="tech-return-tree">${p.chiefSelection?'返回装备与宝石 ↑':'返回科技树 ↑'}</button></div>`:`<div class="form-grid"><label>提升项目<select id="planning-path">${options((system.id==='research'?ordinaryResearchPaths(system,path):treePanel.filterPaths(system.paths.filter(p=>!p.heroGearTemplate))).map(p=>[p.id,treePanel.nameForPath(p.id)]),path.id)}</select></label></div>${treePanel.hasTree()?'<div class="tech-calculation-heading"><h3>所选科技升级测算</h3><button type="button" class="text-button" id="tech-return-tree">返回科技树 ↑</button></div>':''}<div class="form-grid three planning-range"><label>${technologyRecorded||currentUnrecorded||p.chiefSelection?'账号当前等级':'测算起点（预览）'}<select id="planning-from" ${p.chiefSelection||technologyRecorded||currentUnrecorded?'disabled':''}>${currentUnrecorded?'<option>未记录，请先填写账号现状</option>':options((currentAtMaximum?levels:levels.slice(0,-1)).map(r=>[String(r.level),r.label||`等级 ${r.level}`]),String(p.from))}</select></label><label>目标等级<select id="planning-to" ${currentAtMaximum||currentUnrecorded?'disabled':''}>${currentUnrecorded?'<option>待记录当前等级</option>':currentAtMaximum?`<option value="${p.from}">已到最高级</option>`:options(levels.filter(r=>r.level>p.from).map(r=>[String(r.level),r.label||`等级 ${r.level}`]),String(p.to))}</select></label><label>${esc(path.unitLabel||'升级数量')}<input type="number" id="planning-pieces" min="1" max="${path.maxPieces||1}" step="1" value="${p.pieces}" ${path.maxPieces===1||p.chiefSelection?'readonly':''}></label></div>`}${researchControls()}<div id="planning-result"></div><p class="hint" id="planning-path-notes">${esc(path.coverage||'')}${path.prerequisiteNote?`<br>前置条件：${esc(path.researchTree==='battle'?'图中前置科技各1级即可解锁并升满本阶段。':path.prerequisiteNote)}`:''}</p><details class="planning-sources"><summary>查看来源和适用范围</summary><p>${link(path.source)}</p><p class="hint">${esc(source(path.source)?.status||'')}<br>资料读取日期：${esc(source(path.source)?.status?.match(/20\d{2}-\d{2}-\d{2}/)?.[0]||data.asOf)}</p></details>`:`<div class="planning-empty"><strong>升级表仍待补齐</strong><p>此系统已纳入规划入口，资料不足的部分暂不生成材料需求或属性收益。</p></div>`}${system.notes?.length?`<details class="planning-sources"><summary>此系统的数据说明</summary><ul>${system.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>`:''}</section>${growthNotes(system.id,esc)}<section class="card planning-limits"><h2>当前结果怎么使用</h2><p>金额是按当前进度道具单价折算的材料价值。实际购买还需要结合礼包限购、兑换和免费产出；已有库存不等于额外现金支出。</p><p>各兵种和攻击、防御、生命、穿透分开记录；当前页不把不同属性直接相加，也暂不输出跨系统最优顺序。装备位置、技能触发和研究前置仍需对应账号核对。</p></section>`;
  }
  function updateTechnologyCalculation(){
    const {path,p,currentUnrecorded,currentGoalMet}=selection();
    const name=document.querySelector('#tech-calculation-name'),range=document.querySelector('#tech-calculation-range');
    if(name)name.textContent=treePanel.nameForPath(path.id);
    if(range)range.textContent=currentUnrecorded?'当前等级未记录，请先填写账号现状':currentGoalMet?'原计划目标已达成，可在图上选择新目标':`当前 ${p.from}级 → 计划 ${p.to}级`;
    const notes=document.querySelector('#planning-path-notes');if(notes)notes.textContent=[path.coverage,path.researchTree==='battle'?'图中前置科技各1级即可解锁并升满本阶段。':path.prerequisiteNote].filter(Boolean).join('；');
    update();
  }
  function update(){
    const {path,p,currentAtMaximum,currentUnrecorded,currentGoalMet}=selection(),el=document.querySelector('#planning-result');if(!el||!path)return;
    if(currentUnrecorded){el.innerHTML='<div class="note">此项目现有等级尚未记录。点击上方科技图标直接填写当前等级，再设置提升目标。</div>'+timeView(null);bindTime(null);return;}
    if(currentGoalMet&&!currentAtMaximum){el.innerHTML='<div class="note">此项科技已达到原计划目标，无需继续消耗材料。可在图上选择更高目标。</div>'+timeView(0);bindTime(0);return;}
    if(currentAtMaximum){el.innerHTML='<div class="note">此项目已记录为资料最高级，无需继续升级。</div>'+timeView(0);bindTime(0);return;}
    try{
      const state=getState(),r=calculatePlan(path,p.from,p.to,p.pieces,{items:state.items,stage:state.stage,progress:state.progress,inventory:state.account.inventory,refinementMethod:state.refinement.method,boxChoices:state.boxChoices});
      const warnings=[...(r.warnings||[])];const prerequisites=treePanel.prerequisiteFor(p.to);if(prerequisites)warnings.push(`解锁前置 · ${prerequisites.state}：${prerequisites.text}${prerequisites.building?'；'+prerequisites.building+'（账号建筑待核对）':''}。此处消耗仅含本项科技，未加入前置升级。`);
      
      el.innerHTML=`${warnings.length?`<div class="note planning-warning">${[...new Set(warnings)].map(w=>`<div>${esc(w)}</div>`).join('')}</div>`:''}<div class="planning-metrics"><div><span>${path.costStatus!=='available'?'原表材料折算（待核对）':r.priceComplete?'所需材料参考价值':'已知材料参考价值'}</span><strong>${!r.materials.length?(r.priceComplete?money(0):r.resources.length?'待定价':'待补数据'):money(r.fullValue??r.partialValue)}</strong><small>${path.costStatus!=='available'?'原表口径待核对，暂不作完整成本':r.priceComplete?'按当前进度单价计算':'有未定价项目，金额未包含全部消耗'}</small></div><div><span>${path.costMode==='checkpoint'?'原表数量与库存对照价值':'库存缺口参考价值'}</span><strong>${!r.materials.length?(r.priceComplete?money(0):r.resources.length?'待定价':'待补数据'):money(r.knownGapValue)}</strong><small>${!r.materials.length?'需先补齐材料或资源价格':r.inventoryComplete?'已扣除记录的材料库存':'未记录的材料按0库存预览'}</small></div><div>${timeMetric(r.timeHours)}</div></div><div class="table-scroll"><table><thead><tr><th>材料</th><th>${path.costMode==='checkpoint'?'目标档原表数量':'升级需求'}</th><th>已记录库存</th><th>材料缺口</th><th>需求参考价值</th></tr></thead><tbody>${r.materials.map(m=>`<tr><td><div class="item-with-art">${artIcon(itemOf(m.itemId))}<span>${esc(m.name)}</span></div></td><td>${fmt(m.needed,4)}</td><td>${m.owned===null?'未记录':fmt(m.owned,4)}</td><td>${fmt(m.gap,4)}</td><td>${m.value===null?'未定价':money(m.value)}</td></tr>`).join('')||'<tr><td colspan="5">本段资料未列可计价道具，请同时查看基础资源和说明。</td></tr>'}</tbody></table></div>${r.resources.length?`<h3 class="planning-subtitle">基础资源 · 仅记录数量，不计价</h3><div class="planning-resources">${r.resources.map(x=>`<span>${esc(x.name)}<strong>${fmt(x.quantity,4)}</strong></span>`).join('')}</div>`:''}<h3 class="planning-subtitle">属性与效果</h3>${r.attributes.length?`<div class="table-scroll"><table><thead><tr><th>属性</th><th>当前</th><th>目标</th><th>变化（每${esc(path.unitLabel==='颗'?'颗':path.unitLabel==='件'?'件':'项目')}）</th></tr></thead><tbody>${r.attributes.map(a=>`<tr><td>${esc(a.name)}</td><td>${a.before===null?"待补":fmt(a.before,4)+esc(a.unit)}</td><td>${a.after===null?"待补":fmt(a.after,4)+esc(a.unit)}</td><td>${a.delta===null?"待补":`${a.delta>=0?"+":""}${fmt(a.delta,4)}${a.unit==='%'?' 个百分点':esc(a.unit)}`}</td></tr>`).join('')}</tbody></table></div><p class="hint">以上为单件／单项目的变化，未将不同位置、兵种或多人效果相加。</p>`:'<p class="hint">此路径尚无可核对的完整数值属性，不计入属性收益排序。</p>'}${r.effects?.after?`<div class="planning-effect"><span>${path.researchTree==='battle'?'目标等级属性与前置':'目标档位原文效果'}</span><p>${esc(r.effects.after)}</p>${r.effects.before?`<small>当前：${esc(r.effects.before)}</small>`:''}</div>`:''}`;
      el.insertAdjacentHTML('beforeend',ordinaryResearchDetails(path,p.from,p.to,{esc,fmt})+timeView(r.timeHours));bindTime(r.timeHours);
    }catch(error){el.innerHTML=`<div class="note">${esc(error.message)}</div>`;}
  }
  function bind(){
    document.querySelector('#planning-open-current')?.addEventListener('click',()=>{const {system,path,p}=selection();onOpenCurrent?.({systemId:system.id,nodeId:treePanel.nodeFor(system,path,p)?.id});});
    chiefPanel.bind();
    bindGrowthRecords({getState,onSave:onGrowthChange,onSelect:(systemId,pathId,profile)=>{const path=systems.find(s=>s.id===systemId).paths.find(p=>p.id===pathId),from=profile.levels[pathId]??path.baseline?.level??path.rows[0]?.level??0,to=profile.planned[pathId];const next=path.rows.find(r=>r.level>from)?.level;const x=window.scrollX,y=window.scrollY;onChange({systemId,pathId,from,to:to>from?to:next??from+1,pieces:1},true);window.scrollTo(x,y);}});
    document.querySelectorAll('[data-show-comparison]').forEach(button=>button.addEventListener('click',()=>{const extra=document.querySelector('#chief-comparison-extra');if(extra)extra.open=true;}));
    if(selection().p.chiefSelection)document.querySelector('#tech-return-tree')?.addEventListener('click',()=>document.querySelector('#chief-loadout')?.scrollIntoView({block:'start'}));
    comparisonPanel.bind();
    savedPanel.bind();
    treePanel.bind();
    document.querySelectorAll('[data-planning-system]').forEach(el=>el.addEventListener('click',()=>{onChange({systemId:el.dataset.planningSystem,pathId:'',from:0,to:1,pieces:1},true);}));
    document.querySelector('#planning-path')?.addEventListener('change',e=>onChange({...selection().p,pathId:e.target.value,from:0,to:1,pieces:1},true));
    for(const id of ['research-tree','research-tier'])document.querySelector('#'+id)?.addEventListener('change',event=>{
      const {system,path}=selection(),tree=id==='research-tree'?event.target.value:path.researchTree,tier=id==='research-tier'?Number(event.target.value):path.researchTier;
      const candidates=system.paths.filter(p=>p.researchTree===tree),next=candidates.find(p=>p.researchTier===tier)||candidates[0];
      if(next)onChange({systemId:'research',pathId:next.id,from:0,to:1,pieces:1},true);
    });
    for(const [id,key] of [['planning-from','from'],['planning-to','to'],['planning-pieces','pieces']])document.querySelector('#'+id)?.addEventListener(id==='planning-pieces'?'input':'change',e=>{
      if(e.target.value.trim()==='')return;
      const s=selection(),next={...s.p,[key]:Number(e.target.value)};
      const moveTarget=key==='from'&&next.from>=next.to;
      if(moveTarget)next.to=s.levels.find(r=>r.level>next.from)?.level;
      try{calculatePlan(s.path,next.from,next.to,next.pieces,{items:getState().items,stage:getState().stage,inventory:getState().account.inventory,progress:getState().progress,refinementMethod:getState().refinement.method,boxChoices:getState().boxChoices});onChange(next,key==='from');if(key!=='from')update();}catch(error){notify(error.message);e.target.value=s.p[key];}
    });update();
  }
  return {view,bind};
}
