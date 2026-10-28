import { STAGES } from '../domain/model.js';
import {isRemovedItem} from '../domain/art.js';
import { OFFER_SOURCES, buildGiftDraft } from '../domain/offers.js';
import { createReview, effectiveSection, reviewStatus, sectionStageIds, reviewRecords, reviewStatistics } from '../domain/reviews.js';

export function createOffersPanel(data, helpers) {
  const { items, esc, fmt, pill, options, artIcon, onApply, getStage, getReviews, onReviewChange, onNavigate, notify } = helpers;
  const reviewDrafts=new Map();
  let query='', category='all', stage='all', packId='', sectionId='', rowId='', mode='', adoptedStage='', selected=[];
  const labelStage = section => sectionStageIds(section).map(id=>STAGES.find(s=>s.id===id).name).join('／')||'进度待确认';
  const findPack = () => data.packs.find(p=>p.id===packId);
  const findSection = () => {const p=findPack(),s=p?.sections.find(s=>s.id===sectionId);return s?effectiveSection(p,s,getReviews()):null;};
  const findRow = () => findSection()?.rows.find(r=>r.id===rowId);
  const sourceLink = source => `<a href="${esc(OFFER_SOURCES[source].url)}" target="_blank" rel="noreferrer">查看原始资料 ↗</a>`;
  function resetSection(section) {sectionId=section?.id||'';rowId=section?.rows[0]?.id||'';mode=['fixed','choice'].includes(section?.rewardRule)?section.rewardRule:'';selected=mode==='fixed'?section.rows[0].materials.map((_,i)=>i):[];const ids=section?sectionStageIds(section):[];adoptedStage=ids.length===1?ids[0]:'';}
  function listPacks() {
    return data.packs.filter(p=>category==='all'||p.category===category)
      .filter(p=>`${p.name} ${p.sections.map(s=>s.title+' '+s.columns.filter((c,i)=>!isRemovedItem(s.rows[0]?.materials[i]||c)).join(' ')).join(' ')}`.includes(query.trim()))
      .filter(p=>listSections(p).length);
  }
  const listSections = pack => pack.sections.map(s=>effectiveSection(pack,s,getReviews())).filter(s=>stage==='all'||(stage==='unresolved'?!sectionStageIds(s).length:stage==='reviewed'?s.review.status==='active':stage==='stale'?s.review.status==='stale':sectionStageIds(s).includes(stage)));
  function view() {
    return `<div class="page-title"><div><p class="eyebrow">PACK SOURCE LIBRARY</p><h1>先把礼包内容，记清楚。</h1><p class="description">保留原始名称、档位、数量和进度标注。生成估值草稿前，请确认本次进度与奖励获取方式。</p></div>${pill(`${data.packs.length} 个礼包`,'green')}</div><div class="offers-summary"><span><strong>${data.packs.reduce((n,p)=>n+p.sections.length,0)}</strong> 组资料分段</span><span><strong id="offer-unresolved">${reviewStatistics(data,getReviews()).unresolvedSections}</strong> 组进度待确认</span><span><strong>${data.audit.findings.length}</strong> 项重复／差异</span><span><strong id="offer-reviewed">${reviewStatistics(data,getReviews()).active}</strong> 组个人校对</span><span>快照 ${esc(data.asOf)}</span></div><section class="card offers-controls"><label>搜索礼包或材料<input id="offer-query" placeholder="例如：曙光、宝石、火晶" value="${esc(query)}"></label><label>资料类别<select id="offer-category">${options([['all','全部类别'],['regular','常规礼包'],['special','特惠礼包']],category)}</select></label><label>资料进度<select id="offer-stage">${options([['all','全部进度'],['unresolved','进度待确认'],['reviewed','个人已校对'],['stale','来源变化待复核'],...STAGES.map(s=>[s.id,s.name])],stage)}</select></label></section><div class="offers-grid"><section class="card offer-list-panel"><div class="section-heading"><h2>礼包目录</h2><span class="muted" id="offer-count"></span></div><div id="offer-list"></div></section><div id="offer-detail"></div></div>`;
  }
  function refreshList() {
    const packs=listPacks();
    const stats=reviewStatistics(data,getReviews());document.querySelector('#offer-unresolved').textContent=stats.unresolvedSections;document.querySelector('#offer-reviewed').textContent=stats.active;
    if (!packs.some(p=>p.id===packId)) {packId=packs[0]?.id||'';resetSection(findPack()?listSections(findPack())[0]:null);}
    if (findPack()&&!listSections(findPack()).some(s=>s.id===sectionId)) resetSection(listSections(findPack())[0]);
    document.querySelector('#offer-count').textContent=`${packs.length} 个结果`;
    document.querySelector('#offer-list').innerHTML=packs.map(p=>`<button class="offer-list-item ${p.id===packId?'selected':''}" data-offer="${p.id}"><strong>${esc(p.name)}</strong><span>${OFFER_SOURCES[p.category].name} · ${p.sections.length} 组分段</span>${data.audit.findings.some(f=>f.packIds.includes(p.id))?'<small>存在校对记录</small>':''}</button>`).join('')||'<p class="hint">没有符合条件的礼包。</p>';
    document.querySelectorAll('[data-offer]').forEach(button=>button.addEventListener('click',()=>{packId=button.dataset.offer;resetSection(listSections(findPack())[0]);refreshList();}));
    refreshDetail();
  }
  function refreshDetail() {
    const pack=findPack(), section=findSection(), row=findRow();
    const container=document.querySelector('#offer-detail');
    if (!pack||!section||!row) {container.innerHTML='<section class="card"><p class="hint">当前没有可查看的资料分段。</p></section>';return;}
    adoptedStage=getStage();
    const findings=data.audit.findings.filter(f=>f.packIds.includes(pack.id));
    container.innerHTML=`<section class="card"><div class="section-heading"><div><h2>${esc(pack.name)}</h2><p class="hint">${OFFER_SOURCES[pack.category].name} · ${sourceLink(pack.source)}</p></div>${pill(labelStage(section),sectionStageIds(section).length?'green':'amber')}</div>${pack.note?`<div class="note">原资料备注：${esc(pack.note)}</div>`:''}${findings.map(f=>`<div class="note">${esc(f.title)}：${esc(f.detail)}</div>`).join('')}<label>原始资料分段<select id="offer-section">${options(listSections(pack).map((s,i)=>[s.id,`${s.title} · 记录${i+1}`]),sectionId)}</select></label><p class="hint">${esc(section.stage.reason)}。${section.review.status==='active'?'正在采用个人校对；原始资料保留。':'奖励规则尚未校对。'}</p><div class="table-scroll raw-offer-table"><table><thead><tr><th>原始档位</th>${section.columns.map((c,i)=>isRemovedItem(section.rows[0]?.materials[i]||c)?'':`<th><div class="item-with-art">${artIcon(section.rows[0]?.materials[i]?.itemId||c,'tiny')}<span>${esc(c)}</span></div></th>`).join('')}</tr></thead><tbody>${section.rows.map(r=>`<tr class="${r.id===rowId?'selected-tier':''}"><td>${esc(r.tierLabel)}</td>${r.materials.filter(m=>!isRemovedItem(m)).map(m=>`<td>${esc(m.rawQuantity)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>${reviewForm(pack,section)}<section class="card"><div class="section-heading"><h2>生成礼包草稿</h2>${pill('由你确认本次内容')}</div><div class="form-grid three"><label>采用档位<select id="offer-tier">${options(section.rows.map(r=>[r.id,r.tierLabel]),rowId)}</select></label><label>本次价格大类<output class="adopted-stage" id="offer-adopt-stage">${esc(STAGES.find(s=>s.id===adoptedStage).name)}</output><small>随顶部进度自动匹配</small></label><label>奖励获取方式<select id="offer-mode">${options([['','请选择'],['fixed','全部同时获得'],['choice','自选：仅获得勾选项']],mode)}</select></label></div><div id="offer-materials"></div><p class="hint">数量来自所选档位。5分钟加速自动折算为小时；“英雄装备自选箱”不会当成幸运箱。随机箱保持箱子条目。</p><div class="offer-draft-footer"><p id="offer-blocker" class="hint" role="status"></p><button class="button primary" id="offer-apply">填入礼包估值 →</button></div><p class="hint">填入后可撤销恢复上一份草稿。此操作不会改动原始资料。</p></section>`;
    bindReviewForm(pack,section);
    document.querySelector('#offer-section').addEventListener('change',e=>{resetSection(effectiveSection(pack,pack.sections.find(s=>s.id===e.target.value),getReviews()));refreshDetail();});
    document.querySelector('#offer-tier').addEventListener('change',e=>{rowId=e.target.value;refreshDetail();});
    document.querySelector('#offer-mode').addEventListener('change',e=>{mode=e.target.value;selected=mode==='fixed'?row.materials.map((_,i)=>i):[];updateMaterials();});
    document.querySelector('#offer-apply').addEventListener('click',()=>{try {const draft=buildGiftDraft(pack,section,findRow(),adoptedStage,mode,selected);onApply(draft,adoptedStage);} catch(error){document.querySelector('#offer-blocker').textContent=error.message;}});
    updateMaterials();
  }
  function updateMaterials() {
    const row=findRow();
    document.querySelector('#offer-materials').innerHTML=`<div class="offer-material-list">${row.materials.map((m,index)=>{
      if(isRemovedItem(m))return '';
      const item=items.find(i=>i.id===m.itemId), usable=item&&m.quantity!==null;
      return `<label class="offer-material"><input type="checkbox" data-offer-material="${index}" ${selected.includes(index)?'checked':''} ${mode!=='choice'||!usable?'disabled':''}>${artIcon(m.itemId||m.rawName)}<div><strong>${esc(m.rawName)} <span>× ${esc(m.rawQuantity)}</span></strong><small>${usable?`${esc(item.name)}：${fmt(m.quantity,6)} ${esc(item.unit)}${m.conversion==='实际数量'?'':`（${esc(m.conversion)}）`}`:'道具或单位待对齐，尚不能自动填入'}</small></div>${pill(usable?'已对齐':'待对齐',usable?'':'amber')}</label>`;
    }).join('')}</div>`;
    document.querySelectorAll('[data-offer-material]').forEach(el=>el.addEventListener('change',()=>{const index=Number(el.dataset.offerMaterial);selected=el.checked?[...selected,index]:selected.filter(i=>i!==index);updateDraft();}));updateDraft();
  }
  function updateDraft() {
    const button=document.querySelector('#offer-apply'),status=document.querySelector('#offer-blocker');
    try {const draft=buildGiftDraft(findPack(),findSection(),findRow(),adoptedStage,mode,selected);button.disabled=false;status.textContent=`将填入${draft.lines.length}种材料，实付${fmt(draft.cash)}元。`;}
    catch(error){button.disabled=true;status.textContent=error.message;}
  }
  function reviewDraft(pack,section) {
    if (!reviewDrafts.has(section.id)) {
      const saved=reviewStatus(pack,section,getReviews()).record;
      reviewDrafts.set(section.id,{stages:saved?[...saved.stages]:[...sectionStageIds(section)],rewardMode:saved?.rewardMode||'',note:saved?.note||''});
    }
    return reviewDrafts.get(section.id);
  }
  function reviewForm(pack,section) {
    const status=reviewStatus(pack,section,getReviews()),draft=reviewDraft(pack,section);
    return `<section class="card review-form"><div class="section-heading"><h2>校对这个分段</h2>${pill(status.status==='active'?'采用个人校对':status.status==='stale'?'来源变化，旧校对未生效':'尚未保存校对',status.status==='active'?'green':'amber')}</div><p class="hint">只影响“${esc(pack.name)}／${esc(section.title)}”这个分段。可确认多个适用进度；不选进度则沿用原始标注。</p>${status.status==='stale'?'<div class="note">来源中的名称、数量或分段顺序已变化。旧校对暂不参与计算，请核对上方最新资料后重新保存。</div>':''}<fieldset class="review-stage-fields"><legend>已确认的适用进度</legend>${STAGES.map(s=>`<label><input type="checkbox" data-review-stage="${s.id}" ${draft.stages.includes(s.id)?'checked':''}>${s.name}</label>`).join('')}</fieldset><label>已确认的奖励获取方式<select id="review-mode">${options([['','暂不修订奖励规则'],['fixed','全部同时获得'],['choice','自选：仅获得勾选项']],draft.rewardMode)}</select></label><label class="review-note-label">确认依据或新资料说明<textarea id="review-note" rows="3" maxlength="2000" placeholder="例如：已核对某期礼包截图，适用于哪些进度，奖励如何选择。">${esc(draft.note)}</textarea></label><div class="review-actions"><button class="button primary" id="review-save">保存本分段校对</button><button class="button quiet" id="review-clear" ${status.record?'':'disabled'}>恢复原始资料</button></div><p id="review-feedback" class="hint" role="status">校对只保存在本浏览器，随备份导出。不会改动原始资料或直接补上道具单价。</p></section>`;
  }
  function bindReviewForm(pack,section) {
    const read=()=>({stages:[...document.querySelectorAll('[data-review-stage]:checked')].map(el=>el.dataset.reviewStage),rewardMode:document.querySelector('#review-mode').value,note:document.querySelector('#review-note').value});
    document.querySelectorAll('.review-form input,.review-form select,.review-form textarea').forEach(el=>el.addEventListener('input',()=>reviewDrafts.set(section.id,read())));
    document.querySelector('#review-save').addEventListener('click',()=>{
      try {
        const record=createReview(pack,section,read());onReviewChange(section.id,record);reviewDrafts.delete(section.id);
        resetSection(findSection());refreshList();notify('已保存本分段校对，其他礼包分段不受影响');
      } catch(error){document.querySelector('#review-feedback').textContent=error.message;}
    });
    document.querySelector('#review-clear').addEventListener('click',()=>{
      onReviewChange(section.id,null);reviewDrafts.delete(section.id);resetSection(findSection());refreshList();notify('已恢复原始资料，原始快照未改变');
    });
  }
  function savedReviewsView() {
    const records=reviewRecords(data,getReviews()),stats=reviewStatistics(data,getReviews());
    return `<section class="card"><div class="section-heading"><h2>已保存的个人校对</h2>${pill(`${stats.active} 组生效 · ${stats.stale} 组待复核`,stats.stale?'amber':'green')}</div><p class="hint">在“礼包资料”里选择分段，确认进度或奖励规则并填写依据后保存。来源有变化时，旧校对停止生效，等待重新核对。</p>${records.length?`<div class="table-scroll"><table><thead><tr><th>礼包与分段</th><th>适用进度／奖励规则</th><th>状态与依据</th><th>操作</th></tr></thead><tbody>${records.map(r=>`<tr><td><strong>${esc(r.pack?.name||r.id)}</strong><small>${esc(r.section?.title||'当前来源已无此分段')}</small></td><td>${r.record.stages.length?r.record.stages.map(id=>esc(STAGES.find(s=>s.id===id).name)).join('、'):'沿用原始进度'}<small>${r.record.rewardMode==='fixed'?'全部同时获得':r.record.rewardMode==='choice'?'自选勾选项':'沿用原始奖励规则'}</small></td><td>${pill(r.status==='active'?'个人校对生效':r.status==='stale'?'来源变化待复核':'来源记录缺失',r.status==='active'?'green':'amber')}<details class="review-evidence"><summary>查看确认依据</summary><p>${esc(r.record.note)}</p></details><small>${esc(new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'short'}).format(new Date(r.record.updatedAt)))}</small></td><td><div class="review-table-actions"><button class="text-button" data-review-open="${r.id}" ${r.section?'':'disabled'}>查看／修改</button><button class="text-button" data-review-remove="${r.id}">恢复原始</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="review-empty">还没有个人校对记录。原始进度和待确认状态保持不变。</div>'}</section>`;
  }
  function bindAudit() {
    document.querySelectorAll('[data-review-open]').forEach(el=>el.addEventListener('click',()=>{
      const record=reviewRecords(data,getReviews()).find(r=>r.id===el.dataset.reviewOpen);
      if (!record?.section) return;
      query='';category='all';stage='all';packId=record.pack.id;resetSection(effectiveSection(record.pack,record.section,getReviews()));onNavigate('offers');
    }));
    document.querySelectorAll('[data-review-remove]').forEach(el=>el.addEventListener('click',()=>{
      onReviewChange(el.dataset.reviewRemove,null);reviewDrafts.delete(el.dataset.reviewRemove);onNavigate('sources');notify('已恢复原始资料');
    }));
  }
  function bind() {
    document.querySelector('#offer-query').addEventListener('input',e=>{query=e.target.value;refreshList();});
    document.querySelector('#offer-category').addEventListener('change',e=>{category=e.target.value;refreshList();});
    document.querySelector('#offer-stage').addEventListener('change',e=>{stage=e.target.value;refreshList();});refreshList();
  }
  function auditView() {
    return `<section class="card"><div class="section-heading"><h2>礼包资料校对</h2>${pill(`${data.audit.findings.length} 项重复／差异`,'amber')}</div><p class="hint">${data.packs.length}个礼包、${data.packs.reduce((n,p)=>n+p.sections.length,0)}组分段；当前${reviewStatistics(data,getReviews()).unresolvedSections}组未确认进度；原始资料有${data.audit.unresolvedSections}组未标明明确进度。全部保留原始记录。</p>${data.audit.findings.map(f=>`<div class="issue-row"><div><strong>${esc(f.title)}</strong><p>${esc(f.detail)}</p></div>${pill(f.kind==='duplicate'?'疑似重复':'待校对','amber')}</div>`).join('')}<details class="mapping-details"><summary>查看${data.audit.unresolvedMaterials.length}种待对齐道具／单位</summary><div class="unmapped-list">${data.audit.unresolvedMaterials.map(m=>`<span>${esc(m.name)}</span>`).join('')}</div></details><p class="hint">未对齐不代表没有价值；确认道具身份与单位后再接入。<a href="${OFFER_SOURCES.regular.url}" target="_blank" rel="noreferrer">常规礼包来源 ↗</a> · <a href="${OFFER_SOURCES.special.url}" target="_blank" rel="noreferrer">特惠礼包来源 ↗</a></p></section>`;
  }
  return { view, bind, auditView:()=>savedReviewsView()+auditView(), bindAudit };
}
