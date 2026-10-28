import manifest from '../data/research-trees.json' with {type:'json'};
import {technologyTree,planTechnologyNode} from '../domain/research-tree.js';
import {setTechnologyLevel} from '../domain/technology-levels.js';
import {technologyEffects} from './technology-effects.js';
import {technologyPrerequisites} from '../domain/technology-prerequisites.js';

export function createResearchTreePanel(data,{esc,getSelection,getState,onChange,onTechnologyChange,onOpenCurrent,onTargetsChange,onSelectionChange,mode='planning',notify}){
 const editingCurrent=mode==='current';
 const zooms={research:1,t11:0.7,t12:1};
 const troopNames={infantry:'盾兵',lancer:'矛兵',marksman:'射手'};
 let current=null,editorId=null,pendingViewport=null;
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
  const count=document.querySelector('#tech-record-count');if(count)count.textContent=`点击图标填写当前等级；${manifest.nodes.filter(n=>n.systemId===current.systemId&&Object.hasOwn(records(),n.id)).length} 项科技已记录。`;
  const tier=document.querySelector('#research-tier');if(tier&&path.researchTier)tier.value=String(path.researchTier);
  const note=document.querySelector('#ordinary-stage-note');if(note)note.textContent=`当前第${path.researchTier}阶段 · 17类战斗科技。名称后的数字表示科技阶段；当前／目标等级是该阶段内的研究等级。`;
  openEditor();onSelectionChange?.();
 }
 function canvas(tree,p){
  const zoom=zooms[tree.systemId];
  return `<div class="tech-canvas ${zoom<0.45?'tech-overview':''}" style="width:${tree.size.width*zoom}px;height:${tree.size.height*zoom}px;--tech-scale:${zoom}"><svg aria-hidden="true" class="tech-lines" viewBox="0 0 ${tree.size.width} ${tree.size.height}" width="${tree.size.width*zoom}" height="${tree.size.height*zoom}">${tree.edges.map(e=>line(e,tree)).join('')}</svg>${tree.systemId==='research'?[1,2,3,4,5,6].map(t=>`<div class="tech-stage-marker" style="top:${((t-1)*1200+12)*zoom}px">战斗科技 · 第${t}阶段</div>`).join(''):''}${tree.systemId==='t12'?'<div class="tech-equipment-caption" style="top:'+490*zoom+'px">装备精炼 · 解锁煌耀士兵</div>':''}${tree.systemId==='t11'?`<div class="tech-core" style="left:${manifest.t11Core.x*zoom}px;top:${manifest.t11Core.y*zoom}px">${manifest.t11Core.icon?`<img src="${esc(manifest.t11Core.icon)}" alt="" width="78" height="78">`:''}<span>火晶技术</span><strong>三兵种分支</strong></div>`:''}${tree.nodes.map(n=>{
   const selected=tree.selected?.id===n.id,progress=levelBadge(n,selected,p);
   return `<button type="button" class="tech-node ${selected?'selected':''} ${n.unit?'tech-unit':''} ${n.equipment?'tech-equipment':''}" style="left:${n.x*zoom}px;top:${n.y*zoom}px;--node-color:${n.color||'#c8a65a'}" data-tech-node="${esc(n.id)}" aria-pressed="${selected}" aria-label="${esc((n.troopId?troopNames[n.troopId]+' · ':'')+n.name+'，上限'+n.max+'级')}" title="${esc(n.name)} · ${editingCurrent?'点击记录当前等级':'点击设置目标等级'}"><span class="tech-icon">${n.icon?`<img src="${esc(n.icon)}" alt="" width="76" height="76" loading="lazy" decoding="async">`:`<span class="tech-unit-label">XII<small>${troopNames[n.troopId]||''}</small></span>`}</span>${progress}<span class="tech-node-name">${esc(n.name)}</span></button>`;
  }).join('')}</div>`;
 }
 function view(system,path,p){
  const tree=technologyTree(manifest,system,path,p);current=tree;if(!tree)return '';
  const recorded=tree.selected?records()[tree.selected.id]??null:null;
  const caption=recorded===null?`现有等级未记录${editingCurrent?'，点击图标填写':'，点击图标直接填写'}`:recorded===tree.selected?.max?`现有 ${recorded}级 · 已满级`:`现有 ${recorded}级${editingCurrent?'':` · 目标 ${p.to}级`}`;
  const tabs=tree.systemId==='t12'?`<div class="tech-troop-tabs" role="group" aria-label="T12兵种">${Object.entries(troopNames).map(([id,name])=>`<button type="button" data-tech-troop="${id}" aria-pressed="${tree.troopId===id}" class="${tree.troopId===id?'active':''}">煌耀${name}</button>`).join('')}</div>`:'';
  return `<section class="game-tech-tree tech-theme-${tree.systemId}" id="game-tech-tree" data-tech-mode="${mode}" aria-label="${esc(system.name)}游戏科技树"><div class="tech-tree-heading"><div><span>${tree.systemId==='research'?'TECH RESEARCH':tree.systemId==='t11'?'FIRE CRYSTAL TECH':'EXALTED TECH'}</span><h3>${tree.systemId==='research'?'研究所 · 战斗科技':tree.systemId==='t11'?'火晶科技 · T11':'炽炎科技 · T12'}</h3></div>${editingCurrent?'<span class="tech-mode-label">记录现状</span>':'<button type="button" class="tech-detail-jump" id="tech-jump-detail">查看所选科技消耗 ↓</button>'}</div>${tabs}<div class="tech-map-controls">${tree.systemId==='t11'?`<div class="tech-focus-buttons"><button type="button" data-tech-focus="all">全图</button>${Object.entries(troopNames).map(([id,name])=>`<button type="button" data-tech-focus="${id}">${name}分支</button>`).join('')}</div>`:tree.systemId==='research'?`<div class="tech-focus-buttons">${[1,2,3,4,5,6].map(t=>`<button type="button" data-tech-stage="${t}">${t}阶段</button>`).join('')}</div>`:'<span>五件装备 → 兵种解锁 → 四列属性分支</span>'}<div class="tech-zoom"><button type="button" id="tech-zoom-out" aria-label="缩小科技树">−</button><span id="tech-zoom-label">${Math.round(zooms[tree.systemId]*100)}%</span><button type="button" id="tech-zoom-in" aria-label="放大科技树">＋</button></div></div><div class="tech-viewport" id="tech-viewport" tabindex="0" role="region" aria-label="科技树画布，可滚动查看">${canvas(tree,p)}</div><div class="tech-selection"><span id="tech-selection-copy">已选：<strong>${esc(tree.selected?.name||path.name)}</strong>${tree.troopId?` · ${troopNames[tree.troopId]}`:''} · ${esc(caption)}</span><small>${editingCurrent?'点击图标填写当前等级，自动保存；“—”表示未记录，0级表示尚未研究。':'点击图标可修改账号当前等级和计划目标，两者分开保存；下方消耗自动更新，页面保持原位。'}</small>${tree.systemId==='t11'?'<small>T11三兵种暂共用原工具箱的同等级材料模板；矛、射分支按效果命名，国服专名仍待核对。</small>':''}</div><details class="tech-layout-source"><summary>查看排版依据</summary><p>节点位置和分支参考游戏内截图，科技贴图来自官方Wiki并已保存至本地。T12兵种解锁节点使用文字标记。</p>${manifest.sources.filter((s,i)=>i===(tree.systemId==='research'?0:tree.systemId==='t11'?1:2)||i===3).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ↗</a>`).join('')}</details></section>`;
 }
 function moveTo(x,y){
  const viewport=activeViewport();if(!viewport||!current)return;
  const zoom=zooms[current.systemId];viewport.scrollLeft=Math.max(0,x*zoom-viewport.clientWidth/2);viewport.scrollTop=Math.max(0,y*zoom-viewport.clientHeight/2);
 }
 function rememberViewport(){
  const element=activeViewport();
  pendingViewport=element?{left:element.scrollLeft,top:element.scrollTop,pageX:window.scrollX,pageY:window.scrollY,focus:document.activeElement?.id}:null;
 }
 function closeEditor(){editorId=null;activeViewport()?.querySelector('#tech-node-editor')?.remove();}
 function positionEditor(){
  const viewport=activeViewport(),editor=viewport?.querySelector('#tech-node-editor'),button=viewport?.querySelector(`[data-tech-node="${editorId}"]`);
  if(!viewport||!editor||!button)return;
  const box=button.getBoundingClientRect(),region=viewport.getBoundingClientRect();
  if(box.bottom<region.top||box.top>region.bottom||box.right<region.left||box.left>region.right||box.bottom<0||box.top>window.innerHeight||box.right<0||box.left>window.innerWidth){closeEditor();return;}
  const width=Math.min(320,viewport.clientWidth-24,window.innerWidth-24);editor.style.width=width+'px';
  const left=Math.max(12,Math.min(window.innerWidth-width-12,box.left+box.width/2-width/2));
  const availableTop=window.innerHeight-editor.offsetHeight-12;
  const preferred=box.bottom+8>availableTop&&box.top-editor.offsetHeight-8>=12?box.top-editor.offsetHeight-8:box.bottom+8;
  const top=Math.max(12,Math.min(availableTop,preferred));
  editor.style.left=left+'px';editor.style.top=top+'px';
 }
 function openEditor(){
  const viewport=activeViewport(),node=current?.nodes.find(n=>n.id===editorId);if(!viewport||!node)return;
  viewport.querySelector('#tech-node-editor')?.remove();
  const level=records()[node.id]??null,{p}=getSelection(),maximum=level===node.max;
  const goalMet=!editingCurrent&&level!==null&&targets()[node.id]!==undefined&&targets()[node.id]<=level;
  const target=editingCurrent||level===null||maximum||goalMet?null:p.to>level&&p.to<=node.max?p.to:level+1;
  const labels=Array.from({length:node.max+1},(_,i)=>`<option value="${i}" ${level===i?'selected':''}>${i}级${i===node.max?' · 最高级':''}</option>`).join('');
  const currentInput=`<label>${editingCurrent?'现有等级':'账号当前等级'}<select id="tech-editor-current" aria-label="现有科技等级"><option value="" ${level===null?'selected':''}>未记录</option>${labels}</select></label>`;
  const targetInput=level===null?'<p>先在这里填写账号当前等级，再设置计划目标。</p>':maximum?'<p class="tech-editor-max">已达到资料最高级。</p>':`<label>计划目标等级<select id="tech-editor-target" aria-label="计划目标等级">${goalMet?`<option value="" selected>原计划${targets()[node.id]}级已达成，选择新目标</option>`:''}${Array.from({length:node.max-level},(_,i)=>level+i+1).map(i=>`<option value="${i}" ${i===target?'selected':''}>${i}级</option>`).join('')}</select></label>`;
  viewport.insertAdjacentHTML('beforeend',`<section class="tech-node-editor" id="tech-node-editor" aria-label="${editingCurrent?'记录':'规划'}${esc(node.name)}等级"><div class="tech-editor-heading"><strong>${esc(node.name)}${node.troopId?' · '+troopNames[node.troopId]:''}</strong><button type="button" id="tech-editor-close" aria-label="关闭等级编辑">×</button></div>${currentInput}${editingCurrent?'':targetInput}${technologyEffects(findPath(node.pathId),node,level,target,{esc})}${prerequisiteView(node,target)}<small>${editingCurrent?'保存的是账号实际等级，提升目标在“提升规划”中设置。':'当前等级修改会同步账号记录；计划目标单独保存。'}</small>${!editingCurrent?`${level!==null?`<button type="button" class="tech-editor-detail" id="tech-editor-detail">${maximum?'查看已满级状态':'查看详细消耗'} ↓</button>`:''}`:''}</section>`);
  viewport.querySelector('#tech-editor-close').addEventListener('click',closeEditor);
  viewport.querySelector('#tech-node-editor').addEventListener('keydown',event=>{if(event.key==='Escape'){const button=viewport.querySelector(`[data-tech-node="${node.id}"]`);closeEditor();button?.focus({preventScroll:true});}});
  viewport.querySelector('#tech-editor-current').addEventListener('change',event=>{
   try{
    const next=setTechnologyLevel(records(),node.id,event.target.value===''?null:Number(event.target.value));
    onTechnologyChange(next);onChange(planTechnologyNode(node,findPath(node.pathId),getSelection().p,next),false);syncSelection();activeViewport()?.querySelector('#tech-editor-current')?.focus({preventScroll:true});
   }catch(error){notify(error.message);}
  });
  viewport.querySelector('#tech-editor-target')?.addEventListener('change',event=>{
   try{if(event.target.value==='')return;const value=Number(event.target.value),plan=planFor(node);onTargetsChange?.(setTechnologyLevel(targets(),node.id,value));onChange({...plan,to:value},false);syncSelection();activeViewport()?.querySelector('#tech-editor-target')?.focus({preventScroll:true});}catch(error){notify(error.message);}
  });
  viewport.querySelector('#tech-editor-current-link')?.addEventListener('click',()=>{closeEditor();onOpenCurrent?.({systemId:node.systemId,nodeId:node.id});});
  viewport.querySelector('#tech-editor-detail')?.addEventListener('click',()=>{closeEditor();(document.querySelector('#technology-calculation')||document.querySelector('#planning-path'))?.scrollIntoView({block:'start'});});
  positionEditor();
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
  document.querySelectorAll('[data-tech-stage]').forEach(button=>button.addEventListener('click',()=>{closeEditor();moveTo(300,(Number(button.dataset.techStage)-1)*1200+280);}));
  document.querySelectorAll('[data-tech-focus]').forEach(button=>button.addEventListener('click',()=>{
   const troop=button.dataset.techFocus;
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
  openEditor();viewport.addEventListener('scroll',positionEditor);
 }
 window.addEventListener('scroll',positionEditor,{passive:true});window.addEventListener('resize',positionEditor);
 return {view,bind,prerequisiteFor:(target)=>current?.selected?technologyPrerequisites(manifest,current.selected,target,records()):null,reset:()=>{editorId=null;pendingViewport=null;},nodeFor:(system,path,p)=>technologyTree(manifest,system,path,p)?.selected,hasTree:()=>Boolean(current),recordedLevel:(system,path,p)=>{const node=technologyTree(manifest,system,path,p)?.selected;return node?records()[node.id]??null:null;},filterPaths:paths=>current?.systemId==='t12'?paths.filter(p=>current.nodes.some(n=>n.pathId===p.id)):paths,nameForPath:id=>current?.nodes.find(n=>n.pathId===id&&(current.systemId!=='t11'||n.troopId===current.troopId))?.name||findPath(id)?.name};
}
