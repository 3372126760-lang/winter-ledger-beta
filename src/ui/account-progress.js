import {GROWTH_SYSTEMS,growthRecordsView,bindGrowthRecords} from './growth-records.js';
import manifest from '../data/research-trees.json' with {type:'json'};
import {planTechnologyNode} from '../domain/research-tree.js';
import {createChiefLoadoutPanel} from './chief-loadout.js';
import {createResearchTreePanel} from './research-tree.js';

// Browsing account records has its own selection; it never writes state.planning.
export function createAccountProgressPanel(data,art,{esc,options,getState,onChiefChange,onTechnologyChange,onRefresh,onNavigate,onGrowthChange,notify}){
 const choices=[['chief-gear','领主装备与宝石'],['research','普通战斗科技'],['t11','T11科技'],['t12','T12科技'],['hero-gear','英雄装备'],['experts','专家'],['pets','宠物']];
 let selected={systemId:'chief-gear',pathId:'',from:0,to:1,pieces:1};
 const browsing=new Map();
 const findPath=id=>data.systems.flatMap(s=>s.paths).find(p=>p.id===id);
 const chief=createChiefLoadoutPanel(data,art,{esc,options,getState,mode:'current',onRecord:loadout=>onChiefChange(loadout),notify});
 const tree=createResearchTreePanel(data,{esc,mode:'current',getState,getSelection:()=>({p:selected}),onTechnologyChange,onChange:(next,refresh)=>{selected=next;browsing.set(next.systemId,next);if(refresh!==false)onRefresh();},notify});
 function open({systemId='chief-gear',nodeId}={}){
  tree.reset();
  if(systemId==='chief-gems')systemId='chief-gear';
  if(!choices.some(([id])=>id===systemId))systemId='chief-gear';
  if(GROWTH_SYSTEMS.includes(systemId)){selected={systemId,pathId:'',from:0,to:1,pieces:1};return;}
  if(systemId==='chief-gear'){selected={systemId,pathId:'',from:0,to:1,pieces:1};return;}
  if(!nodeId&&browsing.has(systemId)){selected=browsing.get(systemId);return;}
  const node=manifest.nodes.find(n=>n.id===nodeId&&n.systemId===systemId)||manifest.nodes.find(n=>n.systemId===systemId);
  selected=planTechnologyNode(node,findPath(node.pathId),selected,getState().account.technologyLevels);browsing.set(systemId,selected);
 }
 function view(){
  const system=data.systems.find(s=>s.id===selected.systemId),path=findPath(selected.pathId);
  return `<section class="account-progress" id="account-progress"><div class="section-heading"><div><h2>账号当前等级</h2><p class="hint">这里记录实际养成进度，供提升规划读取。填写0级与尚未记录分别保存。</p></div><button type="button" class="button quiet" id="account-open-planning">前往提升规划 →</button></div><div class="account-system-tabs" role="group" aria-label="选择当前养成系统">${choices.map(([id,name])=>`<button type="button" data-account-system="${id}" aria-pressed="${selected.systemId===id}" class="${selected.systemId===id?'active':''}">${name}</button>`).join('')}</div>${GROWTH_SYSTEMS.includes(selected.systemId)?growthRecordsView(data,selected.systemId,getState(),esc,{mode:'current'}):selected.systemId==='chief-gear'?chief.view('chief-gear'):`<section class="card"><p class="hint" id="tech-record-count">点击图标填写当前等级；${Object.keys(getState().account.technologyLevels).filter(id=>manifest.nodes.some(n=>n.id===id&&n.systemId===selected.systemId)).length} 项科技已记录。</p>${tree.view(system,path,selected)}</section>`}</section>`;
 }
 function bind(){
  document.querySelectorAll('[data-account-system]').forEach(button=>button.addEventListener('click',()=>{open({systemId:button.dataset.accountSystem});onRefresh();}));
  document.querySelector('#account-open-planning')?.addEventListener('click',()=>onNavigate('upgrade'));
  if(GROWTH_SYSTEMS.includes(selected.systemId))bindGrowthRecords({getState,onSave:onGrowthChange,onRefresh});else if(selected.systemId==='chief-gear')chief.bind();else tree.bind();
 }
 return {open,view,bind};
}
