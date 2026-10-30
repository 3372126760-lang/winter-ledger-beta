import {chiefRulesView} from './chief-rules.js';
import {CHIEF_ROWS,chiefRecordedCount,chiefArt,buildChiefPlanning,chiefGearMarks,chiefGearLabel} from '../domain/chief-loadout.js';
import {chiefAttributesAt,summarizeChiefLoadout} from '../domain/chief-attributes.js';
import {batchChiefLevels,undoChiefBatch} from '../domain/chief-bulk.js';

export function createChiefLoadoutPanel(data,art,{esc,options,getState,onRecord,onPlan,onTargetsChange,onOpenCurrent,mode='planning',notify}){
  const editingCurrent=mode==='current';
  const gearPath=data.systems.find(s=>s.id==='chief-gear').paths[0];
  const gemPath=data.systems.find(s=>s.id==='chief-gems').paths[0];
  const gearLevels=[{level:0,label:'未制作'},...gearPath.rows],gemLevels=[{level:0,label:'未镶嵌'},...gemPath.rows];
  const label=(levels,level)=>level===null?'未记录':levels.find(r=>r.level===level)?.label||'档位资料待补';
  const selectionName=p=>{const row=CHIEF_ROWS.find(r=>r.slots.some(s=>s.id===p.slotId));return row?`${row.name} · ${row.slots.find(s=>s.id===p.slotId).name}${p.kind==='gem'?` · 宝石${p.gemIndex+1}`:''}`:'';};
  const fmt=(value,digits=2)=>Number(value).toLocaleString('zh-CN',{maximumFractionDigits:digits});
  const pct=value=>value===null?'未记录':`+${fmt(value)}%`;
  let bulkScope='all',bulkKind='gem',bulkLevel='',bulkOnly=true,bulkOpen=false,lastBulk=null;
  const bulkLevels=()=>bulkKind==='gear'?gearLevels:gemLevels;
  function bulkView(){
    return `<details class="chief-bulk" id="chief-bulk" ${bulkOpen?'open':''}><summary>批量填写当前等级</summary><p class="hint">相同等级可一次填写多个位置。默认只填未记录的位置，应用前会列出影响范围。最近一次可在本次页面内撤销，后续手动修改会保留。</p><div class="chief-bulk-controls"><label>填写范围<select id="chief-bulk-scope">${options([['all','全部兵种'],...CHIEF_ROWS.map(r=>[r.id,r.name])],bulkScope)}</select></label><label>填写内容<select id="chief-bulk-kind">${options([['gear','领主装备'],['gem','领主宝石']],bulkKind)}</select></label><label>当前档位<select id="chief-bulk-level">${options([['','请选择当前档位'],...bulkLevels().map(r=>[String(r.level),chiefGearLabel(r.label)])],bulkLevel)}</select></label><label class="check-label"><input type="checkbox" id="chief-bulk-only" ${bulkOnly?'checked':''}>仅填未记录的位置</label></div><div id="chief-bulk-preview" aria-live="polite"></div><div class="chief-bulk-actions"><button type="button" class="button primary" id="chief-bulk-apply" disabled>选择档位后填写</button>${lastBulk?'<button type="button" class="button quiet" id="chief-bulk-undo">撤销最近一次批量填写</button>':''}</div></details>`;
  }
  function bulkPreview(){
    const preview=document.querySelector('#chief-bulk-preview'),button=document.querySelector('#chief-bulk-apply');if(!preview||!button)return;
    button.disabled=true;
    if(bulkLevel===''){preview.innerHTML='<p class="hint">请选择要填写的当前档位。</p>';button.textContent='选择档位后填写';return;}
    const result=batchChiefLevels(getState().account.chiefLoadout,{scope:bulkScope,kind:bulkKind,level:Number(bulkLevel),onlyUnrecorded:bulkOnly});
    const overwritten=result.changes.filter(c=>c.before!==null).length;
    preview.innerHTML=`<p><strong>将填写 ${result.changes.length} 处</strong>${result.skippedKnown?` · 跳过 ${result.skippedKnown} 处已有记录`:''}${overwritten?` · 将覆盖 ${overwritten} 处已有记录`:''}</p>${result.changes.length?`<div class="chief-bulk-targets">${result.changes.map(c=>`<span>${esc(c.name)}</span>`).join('')}</div>`:'<p class="hint">当前范围内没有需要变更的位置。</p>'}`;
    button.disabled=!result.changes.length;button.textContent=`填写这 ${result.changes.length} 处`;
  }
  function bindBulk(){
    document.querySelector('#chief-bulk')?.addEventListener('toggle',e=>{bulkOpen=e.target.open;});
    document.querySelector('#chief-bulk-scope')?.addEventListener('change',e=>{bulkScope=e.target.value;bulkPreview();});
    document.querySelector('#chief-bulk-kind')?.addEventListener('change',e=>{bulkKind=e.target.value;bulkLevel='';document.querySelector('#chief-bulk-level').innerHTML=options([['','请选择当前档位'],...bulkLevels().map(r=>[String(r.level),chiefGearLabel(r.label)])],bulkLevel);bulkPreview();});
    document.querySelector('#chief-bulk-level')?.addEventListener('change',e=>{bulkLevel=e.target.value;bulkPreview();});
    document.querySelector('#chief-bulk-only')?.addEventListener('change',e=>{bulkOnly=e.target.checked;bulkPreview();});
    document.querySelector('#chief-bulk-apply')?.addEventListener('click',()=>{
      try{if(bulkLevel==='')return;const state=getState(),result=batchChiefLevels(state.account.chiefLoadout,{scope:bulkScope,kind:bulkKind,level:Number(bulkLevel),onlyUnrecorded:bulkOnly});if(!result.changes.length)return;
        lastBulk=result.changes;onRecord(result.loadout);notify(`已批量填写 ${result.changes.length} 处，可撤销最近一次填写。`);
      }catch(error){notify(error.message);}
    });
    document.querySelector('#chief-bulk-undo')?.addEventListener('click',()=>{
      try{if(!lastBulk)return;const state=getState(),result=undoChiefBatch(state.account.chiefLoadout,lastBulk);lastBulk=null;onRecord(result.loadout);notify(`已撤销 ${result.restored} 处${result.skipped?`，保留 ${result.skipped} 处后续手动修改`:''}。`);}catch(error){notify(error.message);}
    });
    bulkPreview();
  }
  function imageTag(image,alt){
    if(!image.region)return `<img src="${esc(image.path)}" alt="${esc(alt)}">`;
    const r=image.region;
    return `<span class="chief-sprite" style="--sprite-width:${r.imageWidth/r.width*100}%;--sprite-height:${r.imageHeight/r.height*100}%;--sprite-left:${-r.x/r.width*100}%;--sprite-top:${-r.y/r.height*100}%"><img src="${esc(image.path)}" alt="${esc(alt)}"></span>`;
  }
  function gearMarks(level,image){
    if(!level)return '';
    const marks=chiefGearMarks(label(gearLevels,level));
    return `${marks.tier&&image.bakedTier!==marks.tier?`<span class="chief-gear-tier">${marks.tier}阶</span>`:''}${marks.stars?`<span class="chief-gear-stars" aria-label="${marks.stars}星">${'<span>★</span>'.repeat(marks.stars)}</span>`:''}${marks.stage?`<span class="chief-gear-stage">${marks.stage}段</span>`:''}`;
  }
  function totalView(loadout,selected){
    const result=summarizeChiefLoadout(data,loadout);
    let detail='';
    if(selected){
      const path=selected.kind==='gear'?gearPath:gemPath;
      const level=selected.kind==='gear'?loadout[selected.slotId].gear:loadout[selected.slotId].gems[selected.gemIndex];
      if(level!==null){
        const value=chiefAttributesAt(path,level),key=selected.kind==='gear'?'chief.attack':'chief-gem.health';
        let cumulative=0;
        detail=`<details class="chief-step-details"><summary>${esc(selectionName(selected))} · 查看从初始档到当前的逐级累加</summary><div class="table-scroll"><table><thead><tr><th>档位</th><th>本档${selected.kind==='gear'?'攻／防':'生命／穿透'}各提升</th><th>当前累计（各项）</th></tr></thead><tbody>${value.steps.map(step=>{
          const delta=step.attributes.find(a=>a.key===key)?.value||0;cumulative+=delta;
          return `<tr><td>${esc(chiefGearLabel(step.label))}</td><td>+${fmt(delta)} 个百分点</td><td>+${fmt(cumulative)}%</td></tr>`;
        }).join('')||'<tr><td colspan="3">当前尚未提升，累计加成为0。</td></tr>'}</tbody></table></div></details>`;
      }
    }
    return `${chiefRulesView(loadout)}<section class="chief-totals"><div class="section-heading"><h3>按兵种汇总 · 当前累计属性</h3><span class="pill">${result.complete?'已完整记录':'已录入部分合计'}</span></div><div class="table-scroll"><table><thead><tr><th>兵种</th><th>攻击</th><th>防御</th><th>生命</th><th>穿透</th><th>记录进度</th></tr></thead><tbody>${result.troops.map(t=>`<tr><td><strong>${t.name}</strong></td><td>${pct(t.attack)}</td><td>${pct(t.defense)}</td><td>${pct(t.health)}</td><td>${pct(t.lethality)}</td><td><small>装备 ${t.gearRecorded}/2<br>宝石 ${t.gemsRecorded}/6</small></td></tr>`).join('')}</tbody></table></div><div class="chief-general"><span>通用出征容量<strong>${result.capacity===null?'未记录':`+${fmt(result.capacity,0)}`}</strong></span><span>领主装备实力<strong>${result.gearPower===null?'未记录':fmt(result.gearPower,0)}</strong></span></div><p class="hint">每件按单档增量逐级累加，再分配到对应兵种；每颗宝石同时增加该兵种生命和穿透。未记录的部位尚未计入；当前合计包含装备、宝石和已达标套装加成；其他系统另计。</p>${detail}</section>`;
  }
  function levelEditor(levels,value,kind,slotId,gemIndex=null){
    const state=getState(),target=kind==='gear'?state.chiefTargets?.[slotId]?.gear:state.chiefTargets?.[slotId]?.gems[gemIndex];
    const identity=CHIEF_ROWS.find(r=>r.slots.some(s=>s.id===slotId));
    const name=identity.name+identity.slots.find(s=>s.id===slotId).name+(kind==='gem'?'宝石'+(gemIndex+1):'装备');
    const attrs=`data-slot="${slotId}" ${kind==='gem'?`data-gem="${gemIndex}"`:''}`;
    const current=options([['','未记录'],...levels.map(r=>[String(r.level),chiefGearLabel(r.label)])],value===null?'':String(value));
    const choices=levels.filter(r=>value!==null&&r.level>value);
    return `<div class="chief-inline-levels"><label>当前<select data-chief-level="${kind}" ${attrs} aria-label="${name}当前等级">${current}</select></label><label>计划<select data-chief-target="${kind}" ${attrs} aria-label="${name}计划等级" ${!choices.length?'disabled':''}>${options([['',value===null?'先填当前等级':!choices.length?'已满级':target!==null&&target!==undefined&&target<=value?'原计划已达成':'未设置'],...choices.map(r=>[String(r.level),chiefGearLabel(r.label)])],target!==null&&target!==undefined&&target>value?String(target):'')}</select></label></div>`;
  }
  function refreshBoard(){
    const position={x:window.scrollX,y:window.scrollY},active=document.activeElement;
    const selector=active?.matches('[data-chief-level],[data-chief-target]')?`[${active.hasAttribute('data-chief-target')?'data-chief-target':'data-chief-level'}="${active.dataset.chiefTarget||active.dataset.chiefLevel}"][data-slot="${active.dataset.slot}"]${active.dataset.gem!==undefined?`[data-gem="${active.dataset.gem}"]`:''}`:null;
    const root=document.querySelector('#chief-loadout');if(root){root.outerHTML=view(getState().planning.systemId);bind();}
    if(selector)document.querySelector(selector)?.focus({preventScroll:true});window.scrollTo(position.x,position.y);
  }
  function slotCard(row,slot){
    const state=getState(),record=state.account.chiefLoadout[slot.id],selected=state.planning.chiefSelection;
    const gearImage=chiefArt(art,{slotId:slot.id,gearLabel:label(gearLevels,record.gear),kind:'gear'});
    const active=selected?.kind==='gear'&&selected.slotId===slot.id;
    const selectOpts=(levels,value)=>options([['','未记录'],...levels.map(r=>[String(r.level),chiefGearLabel(r.label)])],value===null?'':String(value));
    return `<article class="chief-slot-card ${active?'chief-active':''}"><div class="chief-gear-line"><button type="button" class="chief-gear-icon ${record.gear===null||record.gear===0?'chief-unrecorded':''}" data-chief-plan="gear" data-slot="${slot.id}" aria-label="规划${row.name}${slot.name}" title="${record.gear===null?'先填写当前等级':'点击测算此件装备的升级'}" ${editingCurrent||record.gear===null||record.gear===gearLevels.at(-1).level?'disabled':''}>${imageTag(gearImage.image,`${row.name}${slot.name}`)}${gearMarks(record.gear,gearImage.image)}</button><div class="chief-gear-field"><strong>${slot.name}<small>${record.gear===null?'未记录':record.gear===0?'未制作':'已记录'}</small></strong>${editingCurrent?`<select data-chief-level="gear" data-slot="${slot.id}" aria-label="${row.name}${slot.name}当前装备等级">${selectOpts(gearLevels,record.gear)}</select>`:levelEditor(gearLevels,record.gear,'gear',slot.id)}${record.gear!==null?`<span class="chief-current-stat">累计攻／防各 ${pct(chiefAttributesAt(gearPath,record.gear).totals['chief.attack'])}</span>`:''}${gearImage.note&&record.gear!==null?`<span class="chief-art-note">${esc(gearImage.note)}</span>`:''}</div></div><div class="chief-gem-slots">${record.gems.map((level,index)=>{
      const image=chiefArt(art,{slotId:slot.id,troop:row.artTroop,gemLabel:label(gemLevels,level),kind:'gem',recorded:level!==null});
      const isActive=selected?.kind==='gem'&&selected.slotId===slot.id&&selected.gemIndex===index;
      return `<div class="chief-gem-slot ${isActive?'chief-active':''}"><button type="button" class="chief-gem-icon ${level===null||level===0?'chief-unrecorded':''}" data-chief-plan="gem" data-slot="${slot.id}" data-gem="${index}" aria-label="规划${row.name}${slot.name}宝石${index+1}" title="${esc(image.note||'点击测算此颗宝石的升级')}" ${editingCurrent||level===null||level===gemLevels.at(-1).level?'disabled':''}>${imageTag(image.image,`${row.name}宝石${index+1}`)}</button><div class="chief-gem-field"><span>宝石${index+1}</span>${editingCurrent?`<select data-chief-level="gem" data-slot="${slot.id}" data-gem="${index}" aria-label="${row.name}${slot.name}宝石${index+1}当前等级">${selectOpts(gemLevels,level)}</select>`:levelEditor(gemLevels,level,'gem',slot.id,index)}${level!==null?`<span class="chief-gem-stat">生命／穿透 ${pct(chiefAttributesAt(gemPath,level).totals['chief-gem.health'])}</span>`:''}</div>${image.note&&level!==null?`<span class="chief-art-note">16级代表图</span>`:''}</div>`;
    }).join('')}</div></article>`;
  }
  function view(systemId){
    if(!['chief-gear','chief-gems'].includes(systemId))return '';
    const state=getState(),count=chiefRecordedCount(state.account.chiefLoadout),selected=state.planning.chiefSelection;
    return `<section class="card chief-loadout" id="chief-loadout"><div class="section-heading"><div><p class="eyebrow">CHIEF LOADOUT</p><h2>${editingCurrent?'当前领主装备与宝石':'选择要提升的装备或宝石'}</h2></div><span class="pill">装备 ${count.gear}/6 · 宝石 ${count.gems}/18</span></div><p class="hint chief-help">${editingCurrent?'按游戏内位置填写实际等级，自动保存到账号记录。提升目标在“提升规划”中设置。':'在每个位置分别填写当前和计划等级；当前同步账号，计划单独保存，下方消耗随所选位置更新。'}</p>${editingCurrent?bulkView():''}<div class="chief-loadout-board">${CHIEF_ROWS.map(row=>`<div class="chief-troop-row" data-chief-troop="${row.id}">${slotCard(row,row.slots[0])}<div class="chief-troop-tag ${row.id}"><strong>${row.name}</strong><small>左右各一件</small></div>${slotCard(row,row.slots[1])}</div>`).join('')}</div>${!editingCurrent&&selected?`<div class="chief-linked"><span>正在测算：<strong>${esc(selectionName(selected))}</strong> · 当前等级来自账号记录</span><button type="button" class="text-button" id="chief-manual">切回手动测算</button></div>`:'<p class="hint">未记录与“未制作／未镶嵌”分开保存；请按实际账号填写。</p>'}${totalView(state.account.chiefLoadout,selected)}<details class="chief-source"><summary>贴图来源与说明</summary><p><a href="${esc(art.sourceUrl)}" target="_blank" rel="noreferrer">WoS Calc · 装备与宝石图标 ↗</a> · <a href="${esc(art.mappingSource)}" target="_blank" rel="noreferrer">游戏百科 · 装备与兵种对应 ↗</a></p><p>5、6阶装备及13—18级宝石采用你提供的游戏图鉴原图区域；其余独立图来自WoS Calc。阶数、星数和分段按记录档位显示，图片均已保存本地。</p></details></section>`;
  }
  function bind(){
    if(editingCurrent)bindBulk();
    document.querySelector('#chief-open-current')?.addEventListener('click',()=>onOpenCurrent?.({systemId:getState().planning.systemId}));
    document.querySelectorAll('[data-chief-level]').forEach(el=>el.addEventListener('change',()=>{
      const state=getState(),loadout=structuredClone(state.account.chiefLoadout),slot=loadout[el.dataset.slot];
      const value=el.value===''?null:Number(el.value),index=Number(el.dataset.gem);
      const previous=el.dataset.chiefLevel==='gear'?slot.gear:slot.gems[index];
      if(lastBulk&&value!==previous)lastBulk=lastBulk.map(change=>change.slotId===el.dataset.slot&&change.kind===el.dataset.chiefLevel&&(change.kind==='gear'||change.gemIndex===index)?{...change,manualEdited:true}:change);
      if(el.dataset.chiefLevel==='gear')slot.gear=value;else slot.gems[index]=value;
      onRecord(loadout);
      if(!editingCurrent){
        const kind=el.dataset.chiefLevel,max=(kind==='gear'?gearLevels:gemLevels).at(-1).level;
        if(value!==null&&value<max){const next=buildChiefPlanning(data,loadout,el.dataset.slot,kind,index,getState().planning);onPlan(next);}
        else onPlan(getState().planning);
        refreshBoard();
      }
    }));
    if(!editingCurrent)document.querySelectorAll('[data-chief-target]').forEach(el=>el.addEventListener('change',()=>{
      try{const state=getState(),next=structuredClone(state.chiefTargets||Object.fromEntries(CHIEF_ROWS.flatMap(r=>r.slots.map(s=>[s.id,{gear:null,gems:[null,null,null]}]))));
        const kind=el.dataset.chiefTarget,index=Number(el.dataset.gem),value=el.value===''?null:Number(el.value);
        if(kind==='gear')next[el.dataset.slot].gear=value;else next[el.dataset.slot].gems[index]=value;
        onTargetsChange(next);
        const plan=buildChiefPlanning(data,state.account.chiefLoadout,el.dataset.slot,kind,index,state.planning);
        onPlan({...plan,to:value??plan.to});refreshBoard();
      }catch(error){notify(error.message);}
    }));
    if(!editingCurrent)document.querySelectorAll('[data-chief-plan]').forEach(el=>el.addEventListener('click',()=>{
      try{onPlan(buildChiefPlanning(data,getState().account.chiefLoadout,el.dataset.slot,el.dataset.chiefPlan,Number(el.dataset.gem),getState().planning));refreshBoard();}catch(error){notify(error.message);}
    }));
    document.querySelector('#chief-manual')?.addEventListener('click',()=>{const {chiefSelection,...rest}=getState().planning;onPlan(rest);});
  }
  return {view,bind};
}
