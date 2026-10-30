import {applyTechnologyQuickEdit} from '../domain/technology-quick-entry.js';
import {technologyQuickRows} from './technology-quick-entry.js';
import {calculatePlan} from '../domain/planning.js';
import manifest from '../data/research-trees.json' with {type:'json'};
import {technologyTree,planTechnologyNode} from '../domain/research-tree.js';
import {setTechnologyLevel} from '../domain/technology-levels.js';
import {technologyEffects} from './technology-effects.js';
import {technologyPrerequisites} from '../domain/technology-prerequisites.js';

export function createResearchTreePanel(data,{esc,getSelection,getState,onChange,onTechnologyChange,onOpenCurrent,onTargetsChange,onSelectionChange,mode='planning',notify}){
 const editingCurrent=mode==='current';
 const zooms={research:1,t11:0.7,t12:1};
 const troopNames={infantry:'盾兵',lancer:'矛兵',marksman:'射手'};
 let current=null,editorId=null,pendingViewport=null,viewMode='quick',quickQuery='',quickScope=null;
 const records=()=>getState().account.technologyLevels||{};
 const targets=()=>getState().technologyTargets||{};
 const activeViewport=()=>document.querySelector(`#game-tech-tree[data-tech-mode="${mode}"] #tech-viewport`);
 const findPath=id=>data.systems.flatMap(s=>s.paths).find(p=>p.id===id);
 function prerequisiteView(node,target){
  const r=technologyPrerequisites(manifest,node,target||1,records());if(!r)return '';
  return `<div class="tech-editor-effects"><h4>解锁前置 · ${esc(r.state)}</h4><p>${esc(r.text)}</p>${r.building?`<p>建筑条件：${esc(r.building)}（尚未核对账号建筑）</p>`:''}<small>${esc(r.source)}${!r.known?'；此处仅展示连线，具体等级待补':''}。前置消耗尚未加入本项测算。</small></div>`;
 }
 function line(edge,tree){
  const source=tree.nodes.find(n=>n.id===edge.from)||(edge.from==='t11-core'?manifest.t11Core:null),target=tree.nodes.find(n=>n.id===edge.to);
  if(!source||!target)return '';
  const color=target.color||(tree.systemId==='research'?'#69caff':'#c8a65a');
  let d;
  if(tree.systemId==='t11'&&target.troopId==='infantry'){
   const middle=(source.x+target.x)/2;d=`M${source.x} ${source.y} H${middle} V${target.y} H${target.x}`;
  }else {const middle=(source.y+target.y)/2;d=`M${source.x} ${source.y} V${middle} H${target.x} V${target.y}`;}
  return `<path d="${d}" stroke="${color}" class="${edge.type==='equipment'?'tech-equipment-link':''}"/>`;
 }
 function plannedLevel(node,selected,p){
  if(editingCurrent)return null;
  const level=records()[node.id];
  if(level===node.max)return level;
  return targets()[node.id]??(selected&&level!==undefined?p.to:null);
 }
 function levelBadge(node,selected,p){
  const level=records()[node.id]??'—',target=plannedLevel(node,selected,p);
  return `<span class="tech-level">${editingCurrent?`${level}/${node.max}`:`当前 ${level}/${node.max}`}</span>${!editingCurrent?`<span class="tech-planned-level">计划 ${target??'—'}/${node.max}</span>`:''}`;
 }
 function planFor(node){
  const plan=planTechnologyNode(node,findPath(node.pathId),getSelection().p,records()),target=targets()[node.id];
  return !editingCurrent&&target>plan.from&&target<=node.max?{...plan,to:target}:plan;
 }
 function syncSelection(){
  const {p}=getSelection(),path=findPath(p.pathId),system=data.systems.find(s=>s.id===p.systemId);
  current=technologyTree(manifest,system,path,p);
  const viewport=activeViewport();if(!viewport||!current)return;
  for(const button of viewport.querySelectorAll('[data-tech-node]')){
   const node=current.nodes.find(n=>n.id===button.dataset.techNode);if(!node)continue;
   const selected=node.id===current.selected?.id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
   button.querySelector('.tech-level')?.remove();button.querySelector('.tech-planned-level')?.remove();
   button.querySelector('.tech-icon').insertAdjacentHTML('afterend',levelBadge(node,selected,p));
  }
  const node=current.selected,level=node?records()[node.id]??null:null;
  const copy=document.querySelector('#tech-selection-copy');
  if(copy)copy.innerHTML=`已选：<strong>${esc(node?.name||path.name)}</strong>${node?.troopId?' · '+troopNames[node.troopId]:''} · 当前 ${level===null?'未记录':level+'级'}${!editingCurrent&&level!==null?' · 计划 '+(level===node.max?level:p.to)+'级':''}`;
  const count=document.querySelector('#tech-record-count');if(count)count.textContent=`填写当前等级；${manifest.nodes.filter(n=>n.systemId===current.systemId&&Object.hasOwn(records(),n.id)).length} 项科技已记录。`;
  const tier=document.querySelector('#research-tier');if(tier&&path.researchTier)tier.value=String(path.researchTier);
  const note=document.querySelector('#ordinary-stage-note');if(note)note.textContent=`当前第${path.researchTier}阶段 · 17类战斗科技。名称后的数字表示科技阶段；当前／目标等级是该阶段内的研究等级。`;
  syncQuickRows();openEditor();onSelectionChange?.();
 }
 function canvas(tree,p){
  const zoom=zooms[tree.systemId];
  return `<div class="tech-canvas ${zoom<0.45?'tech-overview':''}" style="width:${tree.size.width*zoom}px;height:${tree.size.height*zoom}px;--tech-scale:${zoom}"><svg aria-hidden="true" class="tech-lines" viewBox="0 0 ${tree.size.width} ${tree.size.height}" width="${tree.size.width*zoom}" height="${tree.size.height*zoom}">${tree.edges.map(e=>line(e,tree)).join('')}</svg>${tree.systemId==='research'?[1,2,3,4,5,6].map(t=>`<div class="tech-stage-marker" style="top:${((t-1)*1200+12)*zoom}px">战斗科技 · 第${t}阶段</div>`).join(''):''}${tree.systemId==='t12'?'<div class="tech-equipment-caption" style="top:'+390*zoom+'px">装备精炼 · 解锁煌耀士兵</div>':''}${tree.systemId==='t11'?`<div class="tech-core" style="left:${manifest.t11Core.x*zoom}px;top:${manifest.t11Core.y*zoom}px">${manifest.t11Core.icon?`<img src="${esc(manifest.t11Core.icon)}" alt="" width="78" height="78">`:''}<span>火晶技术</span><strong>三兵种分支</strong></div>`:''}${tree.nodes.map(n=>{
   const selected=tree.selected?.id===n.id,progress=levelBadge(n,selected,p);
   return `<button type="button" class="tech-node ${selected?'selected':''} ${n.unit?'tech-unit':''} ${n.equipment?'tech-equipment':''}" style="left:${n.x*zoom}px;top:${n.y*zoom}px;--node-color:${n.color||'#c8a65a'}" data-tech-node="${esc(n.id)}" aria-pressed="${selected}" aria-label="${esc((n.troopId?troopNames[n.troopId]+' · ':'')+n.name+'，上限'+n.max+'级')}" title="${esc(n.name)} · ${editingCurrent?'点击记录当前等级':'点击设置目标等级'}"><span class="tech-icon">${n.icon?`<img src="${esc(n.icon)}" alt="" width="76" height="76" loading="lazy" decoding="async">`:`<span class="tech-unit-label">XII<small>${troopNames[n.troopId]||''}</small></span>`}</span>${progress}<span class="tech-node-name">${esc(n.name)}</span></button>`;
  }).join('')}</div>`;
 }
 function view(system,path,p){
  const tree=technologyTree(manifest,system,path,p);if(current?.systemId!==tree?.systemId){quickScope=null;quickQuery='';}else if(tree?.systemId==='t12'&&current.troopId!==tree.troopId)quickScope=tree.troopId;current=tree;if(!tree)return '';
  const recorded=tree.selected?records()[tree.selected.id]??null:null;
  const caption=recorded===null?`现有等级未记录${editingCurrent?'，点击图标填写':'，点击图标直接填写'}`:recorded===tree.selected?.max?`现有 ${recorded}级 · 已满级`:`现有 ${recorded}级${editingCurrent?'':` · 目标 ${p.to}级`}`;
  const tabs=tree.systemId==='t12'?`<div class="tech-troop-tabs" role="group" aria-label="T12兵种">${Object.entries(troopNames).map(([id,name])=>`<button type="button" data-tech-troop="${id}" aria-pressed="${tree.troopId===id}" class="${tree.troopId===id?'active':''}">煌耀${name}</button>`).join('')}</div>`:'';
  return `<section class="game-tech-tree tech-theme-${tree.systemId}" id="game-tech-tree" data-tech-mode="${mode}" data-entry-view="${viewMode}" aria-label="${esc(system.name)}游戏科技树"><div class="tech-tree-heading"><div><span>${tree.systemId==='research'?'TECH RESEARCH':tree.systemId==='t11'?'FIRE CRYSTAL TECH':'EXALTED TECH'}</span><h3>${tree.systemId==='research'?'研究所 · 战斗科技':tree.systemId==='t11'?'火晶科技 · T11':'炽炎科技 · T12'}</h3></div>${editingCurrent?'<span class="tech-mode-label">记录现状</span>':'<button type="button" class="tech-detail-jump" id="tech-jump-detail">查看所选科技消耗 ↓</button>'}</div>${tabs}<div class="tech-map-controls">${tree.systemId==='t11'?`<div class="tech-focus-buttons"><button type="button" data-tech-focus="all">全图</button>${Object.entries(troopNames).map(([id,name])=>`<button type="button" data-tech-focus="${id}">${name}分支</button>`).join('')}</div>`:tree.systemId==='research'?`<div class="tech-focus-buttons">${[1,2,3,4,5,6].map(t=>`<button type="button" data-tech-stage="${t}">${t}阶段</button>`).join('')}</div>`:'<span>五件装备 → 兵种解锁 → 四列属性分支</span>'}<div class="tech-zoom"><button type="button" id="tech-zoom-out" aria-label="缩小科技树">−</button><span id="tech-zoom-label">${Math.round(zooms[tree.systemId]*100)}%</span><button type="button" id="tech-zoom-in" aria-label="放大科技树">＋</button></div></div><div class="tech-view-switch" role="group" aria-label="科技填写方式"><button type="button" data-tech-view="quick" class="${viewMode==='quick'?'active':''}">快速填等级</button><button type="button" data-tech-view="map" class="${viewMode==='map'?'active':''}">科技图</button><span>填完按 Enter 下一项 · Tab 切换字段 · 自动保存</span></div><div class="tech-workspace"><div class="tech-quick-panel" id="tech-quick-panel" ${viewMode==='quick'?'':'hidden'}><div class="tech-quick-filters"><label>筛选科技<input id="tech-quick-search" type="search" placeholder="输入科技名称" value="${esc(quickQuery)}"></label><label>${tree.systemId==='research'?'阶段':'兵种'}<select id="tech-quick-scope">${scopeOptions(tree)}</select></label></div><div class="tech-quick-scroll"><table class="tech-quick-table"><thead><tr><th>科技</th><th>当前等级</th>${editingCurrent?'':'<th>目标等级</th>'}<th>状态</th></tr></thead><tbody id="tech-quick-rows">${quickRows(tree)}</tbody></table></div><p class="tech-quick-help">空白是未记录，0是尚未研究。“满”按钮仅设置所在字段，不修改另一列。</p></div><div id="tech-map-pane" ${viewMode==='map'?'':'hidden'}><div class="tech-viewport" id="tech-viewport" tabindex="0" role="region" aria-label="科技树画布，可滚动查看">${canvas(tree,p)}</div></div><aside class="tech-editor-host" id="tech-editor-host" aria-label="所选科技快速编辑"></aside></div><div class="tech-selection"><span id="tech-selection-copy">已选：<strong>${esc(tree.selected?.name||path.name)}</strong>${tree.troopId?` · ${troopNames[tree.troopId]}`:''} · ${esc(caption)}</span><small>${editingCurrent?'直接填写当前等级，自动保存；“—”表示未记录，0级表示尚未研究。':'直接填写账号当前等级和计划目标，两者分开保存；下方消耗自动更新，页面保持原位。'}</small>${tree.systemId==='t11'?'<small>T11三兵种暂共用原工具箱的同等级材料模板；矛、射分支按效果命名，国服专名仍待核对。</small>':''}</div><details class="tech-layout-source"><summary>查看排版依据</summary><p>节点位置和分支参考游戏内截图，科技贴图来自官方Wiki并已保存至本地。T12兵种解锁节点使用文字标记。</p>${manifest.sources.filter((s,i)=>i===(tree.systemId==='research'?0:tree.systemId==='t11'?1:2)||i===3).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ↗</a>`).join('')}</details></section>`;
 }
 function moveTo(x,y){
  const viewport=activeViewport();if(!viewport||!current)return;
  const zoom=zooms[current.systemId];viewport.scrollLeft=Math.max(0,x*zoom-viewport.clientWidth/2);viewport.scrollTop=Math.max(0,y*zoom-viewport.clientHeight/2);
 }
 function rememberViewport(){
  const element=activeViewport();
  pendingViewport=element?{left:element.scrollLeft,top:element.scrollTop,pageX:window.scrollX,pageY:window.scrollY,focus:document.activeElement?.id}:null;
 }
 function closeEditor(){editorId=null;document.querySelector('#tech-editor-host')?.replaceChildren();}
 function scopeOptions(tree){
  const scope=quickScope??(tree.systemId==='research'?String(findPath(tree.selected?.pathId)?.researchTier||1):tree.troopId||'infantry');
  const choices=tree.systemId==='research'?[['all','全部阶段'],...[1,2,3,4,5,6].map(n=>[String(n),`第${n}阶段`])]:[...(tree.systemId==='t11'?[['all','全部兵种']]:[]),...Object.entries(troopNames)];
  return choices.map(([id,name])=>`<option value="${id}" ${id===scope?'selected':''}>${name}</option>`).join('');
 }
 function quickNodes(tree=current){
  const scope=quickScope??(tree.systemId==='research'?String(findPath(tree.selected?.pathId)?.researchTier||1):tree.troopId||'infantry');
  const pool=manifest.nodes.filter(n=>n.systemId===tree.systemId);
  return pool.filter(n=>(scope==='all'||(tree.systemId==='research'?String(findPath(n.pathId)?.researchTier)===scope:n.troopId===scope))&&n.name.includes(quickQuery));
 }
 function quickRows(tree=current){return technologyQuickRows(quickNodes(tree),records(),targets(),{esc,selectedId:tree.selected?.id,currentOnly:editingCurrent});}
 function syncQuickRows(){
  const table=document.querySelector('#tech-quick-rows');if(!table)return;
  for(const row of table.querySelectorAll('[data-quick-row]')){
   const node=manifest.nodes.find(n=>n.id===row.dataset.quickRow),level=records()[node.id],target=targets()[node.id];
   row.classList.toggle('selected',current.selected?.id===node.id);
   for(const input of row.querySelectorAll('input'))if(document.activeElement!==input)input.value=(input.dataset.quickKind==='current'?level:target)??'';
   row.querySelector('.tech-quick-state').textContent=level===node.max?'已满级':level===undefined?target===undefined?'未记录':`预览0 → ${target}`:target===undefined?'待设目标':target<=level?'目标已达成':`${level} → ${target}`;
   const max=row.querySelector('[data-quick-fill="target"]');if(max)max.disabled=level===node.max;
  }
 }
 function selectQuickNode(node){
  editorId=node.id;
  const change=planFor(node),switchBranch=current.systemId==='t12'&&current.troopId!==node.troopId;
  if(switchBranch){rememberViewport();onChange(change,true);}else{onChange(change,false);syncSelection();}
 }
 function commitQuick(node,kind,raw){
  const next=applyTechnologyQuickEdit(node,records(),targets(),kind,raw);
  if(kind==='current')onTechnologyChange(next.levels);else onTargetsChange?.(next.targets);
  selectQuickNode(node);
 }
 function openEditor(){
  const host=document.querySelector('#tech-editor-host'),node=current?.selected;if(!host||!node)return;
  const path=findPath(node.pathId),level=records()[node.id]??null,{p}=getSelection(),maximum=level===node.max;
  const target=maximum?null:targets()[node.id]??p.to;
  let preview='';
  if(!maximum&&target>(level??0)){
   const result=calculatePlan(path,level??0,target,1);
   const names={steel:'钢材','refined-fire-crystal':'精炼火晶','fire-particle':'火晶微粒'};
   preview=`<div class="tech-editor-materials"><h4>升级材料 · ${level??0} → ${target}级${level===null?'（预览）':''}</h4>${result.materials.length?result.materials.map(m=>`<div><span>${names[m.itemId]||m.itemId}</span><strong>${m.itemId==='steel'?Number((m.needed/10000).toFixed(4))+'万':Number(m.needed.toFixed(4))}</strong></div>`).join(''):'<p>原表未列额外材料，请核对实际解锁界面。</p>'}<p>${result.timeHours===0?'无需加速 · 0小时':result.timeHours===null?'基础工期待补':'基础工期 '+Number(result.timeHours.toFixed(4))+'小时'}</p></div>`;
  }
  host.innerHTML=`<section class="tech-node-editor" id="tech-node-editor" aria-label="${esc(node.name)}等级编辑"><div class="tech-editor-heading"><strong>${esc(node.name)}${node.troopId?' · '+troopNames[node.troopId]:''}</strong><span>上限${node.max}级</span></div><div class="tech-dock-inputs"><label>当前等级<input type="number" id="tech-editor-current" aria-label="现有科技等级" min="0" max="${node.max}" step="1" value="${level??''}" placeholder="未记录"></label>${editingCurrent?'':`<label>目标等级<input type="number" id="tech-editor-target" aria-label="计划目标等级" min="1" max="${node.max}" step="1" value="${target??''}" ${maximum?'disabled':''} placeholder="未设置"></label>`}</div>${level===null?'<p class="tech-preview-note">当前未记录：材料按0级起预览，不会自动记成0级。</p>':''}${maximum?'<p class="tech-editor-max">已满级</p>':preview}<details><summary>属性与解锁条件</summary>${technologyEffects(path,node,level,target,{esc})}${prerequisiteView(node,target)}</details><p class="hint">自动保存；当前等级与计划目标独立记录。</p></section>`;
  for(const [id,kind]of [['tech-editor-current','current'],['tech-editor-target','target']])host.querySelector('#'+id)?.addEventListener('change',e=>{
   try{commitQuick(node,kind,e.target.value);document.querySelector('#'+id)?.focus({preventScroll:true});}catch(error){notify(error.message);e.target.value=(kind==='current'?records()[node.id]:targets()[node.id])??'';}
  });
 }
 function bindQuick(){
  const root=document.querySelector('#game-tech-tree');
  root.querySelector('#tech-quick-search')?.addEventListener('input',e=>{quickQuery=e.target.value;root.querySelector('#tech-quick-rows').innerHTML=quickRows();});
  root.querySelector('#tech-quick-scope')?.addEventListener('change',e=>{quickScope=e.target.value;if(current.systemId==='t12'&&quickScope!==current.troopId){selectQuickNode(manifest.nodes.find(n=>n.systemId==='t12'&&n.troopId===quickScope));}else root.querySelector('#tech-quick-rows').innerHTML=quickRows();});
  root.querySelectorAll('[data-tech-view]').forEach(button=>button.addEventListener('click',()=>{
   viewMode=button.dataset.techView;root.dataset.entryView=viewMode;root.querySelector('#tech-quick-panel').hidden=viewMode!=='quick';root.querySelector('#tech-map-pane').hidden=viewMode!=='map';
   root.querySelectorAll('[data-tech-view]').forEach(b=>b.classList.toggle('active',b===button));
  }));
  const table=root.querySelector('#tech-quick-rows');
  table.addEventListener('click',e=>{
   const fill=e.target.closest('[data-quick-fill]'),choose=e.target.closest('[data-quick-select]');
   try{if(fill){const node=manifest.nodes.find(n=>n.id===fill.dataset.quickNode);commitQuick(node,fill.dataset.quickFill,fill.dataset.quickValue);}else if(choose)selectQuickNode(manifest.nodes.find(n=>n.id===choose.dataset.quickSelect));}catch(error){notify(error.message);}
  });
  const saveQuickInput=e=>{
   const input=e.target.closest('[data-quick-kind]');if(!input)return;
   const node=manifest.nodes.find(n=>n.id===input.dataset.quickNode);
   const saved=input.dataset.quickKind==='current'?records()[node.id]:targets()[node.id];if((input.value.trim()===''&&saved===undefined)||(input.value.trim()!==''&&Number(input.value)===saved))return;
   try{if(input.validity.badInput)throw new Error('请输入有效等级');commitQuick(node,input.dataset.quickKind,input.value);input.setCustomValidity('');}
   catch(error){input.setCustomValidity(error.message);input.reportValidity();input.value=(input.dataset.quickKind==='current'?records()[node.id]:targets()[node.id])??'';notify(error.message);}
  };
  table.addEventListener('change',saveQuickInput);
  table.addEventListener('focusout',saveQuickInput);
  table.addEventListener('input',e=>{e.target.setCustomValidity?.('');});
  table.addEventListener('keydown',e=>{
   const input=e.target.closest('[data-quick-kind]');if(!input||e.key!=='Enter')return;e.preventDefault();
   const fields=[...table.querySelectorAll(`input[data-quick-kind="${input.dataset.quickKind}"]`)],next=fields[fields.indexOf(input)+1];input.dispatchEvent(new Event('change',{bubbles:true}));
   if(input.validity.valid){next?.focus({preventScroll:true});next?.select();next?.scrollIntoView({block:'nearest',inline:'nearest'});}
  });
 }
 function bind(){
  if(!current)return;
  const {p}=getSelection(),tree=current,viewport=activeViewport();if(!viewport)return;
  function bindNodes(){viewport.querySelectorAll('[data-tech-node]').forEach(button=>{button.addEventListener('pointerdown',event=>{if(event.button===0){event.preventDefault();button.focus({preventScroll:true});}});button.addEventListener('click',()=>{
   try{const node=tree.nodes.find(n=>n.id===button.dataset.techNode),path=findPath(node.pathId);editorId=node.id;onChange(planFor(node),false);syncSelection();}catch(error){notify(error.message);}
  });});}
  function redraw(x,y){const {p}=getSelection();viewport.innerHTML=canvas(tree,p);document.querySelector('#tech-zoom-label').textContent=Math.round(zooms[tree.systemId]*100)+'%';bindNodes();moveTo(x,y);openEditor();}
  for(const [id,change] of [['tech-zoom-in',0.15],['tech-zoom-out',-0.15]])document.querySelector('#'+id)?.addEventListener('click',()=>{
   const old=zooms[tree.systemId],x=(viewport.scrollLeft+viewport.clientWidth/2)/old,y=(viewport.scrollTop+viewport.clientHeight/2)/old;
   zooms[tree.systemId]=Math.max(0.2,Math.min(1.45,Number((old+change).toFixed(2))));redraw(x,y);
  });
  document.querySelectorAll('[data-tech-stage]').forEach(button=>button.addEventListener('click',()=>{if(viewMode==='quick'){quickScope=button.dataset.techStage;document.querySelector('#tech-quick-scope').value=quickScope;document.querySelector('#tech-quick-rows').innerHTML=quickRows();}else moveTo(300,(Number(button.dataset.techStage)-1)*1200+280);}));
  document.querySelectorAll('[data-tech-focus]').forEach(button=>button.addEventListener('click',()=>{
   const troop=button.dataset.techFocus;
   if(viewMode==='quick'){quickScope=troop;document.querySelector('#tech-quick-scope').value=troop;document.querySelector('#tech-quick-rows').innerHTML=quickRows();return;}
   closeEditor();
   if(troop==='all'){zooms.t11=Math.max(0.2,Math.min(0.45,viewport.clientWidth/tree.size.width,viewport.clientHeight/tree.size.height)*0.95);redraw(tree.size.width/2,tree.size.height/2);}
   else{zooms.t11=0.8;const branch=tree.nodes.filter(n=>n.troopId===troop);redraw(branch.reduce((n,p)=>n+p.x,0)/branch.length,branch.reduce((n,p)=>n+p.y,0)/branch.length);}
  }));
  document.querySelectorAll('[data-tech-troop]').forEach(button=>button.addEventListener('click',()=>{
   closeEditor();const troop=button.dataset.techTroop,node=manifest.nodes.find(n=>n.systemId==='t12'&&n.troopId===troop);if(node){rememberViewport();onChange(planFor(node),true);}
  }));
  document.querySelector('#tech-jump-detail')?.addEventListener('click',()=>{closeEditor();(document.querySelector('#technology-calculation')||document.querySelector('#planning-path'))?.scrollIntoView({block:'start'});});
  document.querySelector('#tech-return-tree')?.addEventListener('click',()=>document.querySelector('#game-tech-tree')?.scrollIntoView({block:'start'}));
  bindNodes();
  const previous=pendingViewport;
  if(previous){pendingViewport=null;viewport.scrollLeft=previous.left;viewport.scrollTop=previous.top;window.scrollTo(previous.pageX,previous.pageY);}
  else if(tree.selected)moveTo(tree.selected.x,tree.selected.y+(tree.systemId==='research'?120:0));
  bindQuick();openEditor();
 }

 return {view,bind,prerequisiteFor:(target)=>current?.selected?technologyPrerequisites(manifest,current.selected,target,records()):null,reset:()=>{editorId=null;pendingViewport=null;quickScope=null;quickQuery='';},nodeFor:(system,path,p)=>technologyTree(manifest,system,path,p)?.selected,hasTree:()=>Boolean(current),recordedLevel:(system,path,p)=>{const node=technologyTree(manifest,system,path,p)?.selected;return node?records()[node.id]??null:null;},filterPaths:paths=>current?.systemId==='t12'?paths.filter(p=>current.nodes.some(n=>n.pathId===p.id)):paths,nameForPath:id=>current?.nodes.find(n=>n.pathId===id&&(current.systemId!=='t11'||n.troopId===current.troopId))?.name||findPath(id)?.name};
}
