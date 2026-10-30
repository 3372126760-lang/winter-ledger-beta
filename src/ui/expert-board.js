import {expertAdvancementState} from '../domain/expert-advancement.js';
import {expertSkillRequirementsView,expertResearchReferenceView} from './expert-requirements.js';
import info from '../data/expert-board.json' with {type:'json'};
import {expertRelationAt,expertTalentAt} from '../domain/experts.js';

const browsing={current:'西里尔',planning:'西里尔'};
const image=(url,name,esc,cls='')=>url?`<img class="${cls}" src="${esc(url)}" alt="${esc(name)}" loading="lazy" width="80" height="80">`:`<span class="expert-art-fallback ${cls}" aria-label="${esc(name)}">${esc(name.slice(0,1))}</span>`;

export function expertBoardView(system,profile,esc,{currentOnly,field,selectedPathId}){
 const mode=currentOnly?'current':'planning',selectedPath=system.paths.find(p=>p.id===selectedPathId);
 const expert=(!currentOnly&&info.experts.find(e=>selectedPath?.id.startsWith('expert-'+e.id+'-')))||info.experts.find(e=>e.id===browsing[mode])||info.experts[0];
 const path=system.paths.find(p=>p.id===expert.levelPath),level=profile.levels[path.id],target=profile.planned[path.id];
 const fields=p=>`<div class="expert-level-fields ${currentOnly?'expert-current-only':''}">${field(p,'levels')}${currentOnly?'':field(p,'planned')}</div>`;
 const jump=p=>currentOnly?'':`<button type="button" class="text-button expert-cost-link ${p.id===selectedPathId?'is-selected':''}" data-expert-path="${esc(p.id)}">${p.id===selectedPathId?'正在查看此项消耗 ↓':'查看升级消耗 ↓'}</button>`;
 const at=(p,type)=>{const n=profile[type][p.id];return n===undefined?null:p.rows.find(r=>r.level===n);};
 const effect=(p,type)=>{const row=at(p,type);return row?row.effect||'该级效果待补':type==='levels'?'当前等级未记录':'尚未设置目标';};
 const stage=expertAdvancementState(expert,profile),advance=system.paths.find(p=>p.id===expert.advancementPath);
 const relation=expertRelationAt(expert,stage);
 const next=stage===null?null:expert.milestones[stage];
 const reference=expert.referenceIcons||[];
 const talents=expert.talents.length?expert.talents:reference.filter(i=>!expert.skills.some(s=>s.name===i.name)).slice(0,1).map(i=>({name:i.name,image:i.image,levels:[]}));
 return `<section class="card expert-board" data-expert-mode="${mode}"><div class="section-heading"><div><p class="eyebrow">DAWN ACADEMY</p><h2>曙光学院 · 专家</h2><p class="hint">选择专家，查看好感度、关系、天赋与技能。${currentOnly?'这里记录当前进度。':'当前记录与账号同步，计划目标单独保存。'}</p></div><span class="pill">${info.experts.length}位专家</span></div><div class="expert-roster" role="group" aria-label="选择专家">${info.experts.map(e=>{
  const n=profile.levels[e.levelPath];
  return `<button type="button" class="expert-roster-item ${e.id===expert.id?'selected':''}" data-expert-select="${esc(e.id)}" aria-pressed="${e.id===expert.id}">${image(e.portrait,e.name,esc)}<strong>${esc(e.name)}</strong><small>${n===undefined?'未记录':n+'级'}</small></button>`;
 }).join('')}</div><div class="expert-detail-layout"><aside class="expert-profile"><div class="expert-portrait">${image(expert.portrait,expert.name,esc)}</div><h3>${esc(expert.name)}</h3>${expert.referenceStatus?`<p class="expert-reference-status">${esc(expert.referenceStatus)}</p>`:''}<span class="expert-relation-badge">${relation===null?'关系进阶未记录':esc(relation)+' · 已记录进阶'}</span><div class="expert-affinity"><h4>好感度等级</h4>${fields(path)}${jump(path)}</div>${advance?`<div class="expert-affinity expert-advancement"><h4>关系进阶 · 专家印记</h4>${fields(advance)}${jump(advance)}<p class="hint">好感度每10级需单独进阶。已到10级不代表已完成10级进阶。</p></div>`:''}<div class="expert-level-effect"><strong>当前参考效果</strong><p>${esc(effect(path,'levels'))}</p>${currentOnly?'':`<strong>计划参考效果</strong><p>${esc(effect(path,'planned'))}</p>`}</div><p class="hint">来源等级属性可能已包含关系加成，尚未按实际进阶阶段拆分；这里只作参考，不自动计入常驻属性合计。</p></aside><div class="expert-training"><section class="expert-relations"><h3>关系进阶</h3><div class="expert-relation-track">${expert.milestones.map((m,i)=>`<span class="${stage!==null&&i<stage?'reached':''}"><b>${m.afterLevel}级</b>${esc(m.relation)}</span>`).join('')}</div><p>${next?`下一个资料节点：${next.afterLevel}级 · ${esc(next.relation)}，来源表列专家印记${next.mark}个。`:stage===null?'关系进阶尚未记录，请按游戏实际阶段填写。':'已到当前资料最高关系节点。'}</p><small>普通升级只计好感度；印记仅在“关系进阶”路线计费。旧等级记录保留，关系阶段不会自动补填。</small></section><section class="expert-talents"><h3>专家天赋 <small>随关系提升 · 效果参考</small></h3>${talents.map(t=>{
 const row=expertTalentAt(t,stage===null||level===0?undefined:Math.max(1,stage*10));
 return `<article class="expert-talent">${image(t.image,t.name,esc)}<div><strong>${esc(t.name)}</strong><p>${row?.description?esc(row.description):stage===null?'记录关系进阶阶段后查看天赋参考效果。':'此天赋的逐级效果待补，请以游戏内为准。'}</p></div></article>`;
 }).join('')||'<p class="hint">该专家天赋逐级资料待补。</p>'}</section><section class="expert-skills"><h3>专家技能 <small>${expert.skills.length}项已收录</small></h3><div class="expert-skill-grid">${expert.skills.map((skill,i)=>{
 const p=system.paths.find(p=>p.id===skill.pathId);if(!p)return '';
 return `<article class="expert-skill ${p.id===selectedPathId?'selected':''}"><div class="expert-skill-heading">${image(skill.image,skill.name,esc)}<div><h4>${esc(skill.name)}</h4><small>等级上限 ${p.rows.at(-1).level}</small></div></div>${fields(p)}${expertSkillRequirementsView(expert,skill,profile,currentOnly,esc)}<div class="expert-skill-effects"><p><b>当前</b>${esc(effect(p,'levels'))}</p>${currentOnly?'':`<p><b>计划</b>${esc(effect(p,'planned'))}</p>`}</div>${jump(p)}</article>`;
 }).join('')}</div></section>${expertResearchReferenceView(expert,esc)}<details class="expert-research-note"><summary>资料说明</summary><p>研究资料覆盖与缺项已在上方单独列出。</p><p>技能经验、学识之书和关系印记沿用现有升级表；活动积分、竞技场与特定玩法效果保留生效范围。部分天赋与技能图标资料缺失时显示文字，不替换为其他专家图片。</p><a href="${esc(expert.source)}" target="_blank" rel="noreferrer">查看${esc(expert.name)}资料来源 ↗</a> · <a href="${info.layoutSource}" target="_blank" rel="noreferrer">官方专家功能介绍 ↗</a></details></div></div>${expert.id==='加雷斯'&&(profile.levels.gareth!==undefined||profile.planned.gareth!==undefined)?`<details class="expert-legacy"><summary>加雷斯旧独立记录</summary><p class="hint">旧记录单独保留，未自动复制为好感度等级。</p>${['levels',...(currentOnly?[]:['planned'])].map(type=>`<label>${type==='levels'?'当前':'计划'}<input type="number" min="0" step="1" data-growth-record="${type}" data-growth-path="gareth" data-growth-system="experts" value="${profile[type].gareth??''}"></label>`).join('')}</details>`:''}</section>`;
}

export function bindExpertBoard({getState,onSelect,onRefresh}){
 const root=document.querySelector('.expert-board');if(!root)return;
 const currentOnly=root.dataset.expertMode==='current',mode=currentOnly?'current':'planning';
 root.querySelectorAll('[data-expert-select]').forEach(button=>button.addEventListener('click',()=>{
  const expert=info.experts.find(e=>e.id===button.dataset.expertSelect);if(!expert)return;
  browsing[mode]=expert.id;
  if(!currentOnly&&onSelect)onSelect('experts',expert.levelPath,getState().battleProfile);else onRefresh?.();
 }));
 root.querySelectorAll('[data-expert-path]').forEach(button=>button.addEventListener('click',()=>{
  onSelect?.('experts',button.dataset.expertPath,getState().battleProfile);
  document.querySelector('.planning-detail')?.scrollIntoView({block:'start',behavior:'smooth'});
 }));
}
