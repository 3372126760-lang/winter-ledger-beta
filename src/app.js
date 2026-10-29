import {PUBLIC_BETA} from './runtime.js';
import {createBattleProfile} from './ui/battle-profile.js';
import {createRefinementPanel} from './ui/refinement.js';
import { valueContents, selectedChoiceItem } from './domain/valuation.js';
import { HERO_GENERATIONS, fireChoicesForHero, normalizeProgress, resolveStage } from './domain/stages.js';
import { STAGES, initialState, validateState, getPrice as resolvePrice, estimateGift, gemUpgrade } from './domain/model.js';
import { createOffersPanel } from './ui/offers.js';
import { createArtResolver, galleryArt, isRemovedItem } from './domain/art.js';
import { createArtPanel } from './ui/art.js';
import {artImage} from './ui/art-image.js';
import {itemAvailability} from './domain/availability.js';
import {createPersistence} from './domain/persistence.js';
import {createInventoryHistoryPanel} from './ui/inventory-history.js';
import {createPlanningPanel} from './ui/planning.js';
import {createAccountProgressPanel} from './ui/account-progress.js';
import {validatePlanningState} from './domain/planning.js';
import {validateChiefLoadout} from './domain/chief-loadout.js';
import {coverageTable} from './ui/growth-notes.js';
import {validateSavedPlans} from './domain/saved-plans.js';
import {validateResearchSettings} from './domain/research-time.js';
import {validateTechnologyLevels} from './domain/technology-levels.js';

const [catalog, upgrades, offers, artData, planningData, chiefArtData] = await Promise.all(['/src/data/catalog.json', '/src/data/upgrades.json', '/src/data/offers.json', '/src/data/item-art.json','/src/data/planning.json','/src/data/chief-art.json'].map(async url => {
  const response = await fetch(url,{signal:AbortSignal.timeout(10000)}); if (!response.ok) throw new Error('资料加载失败'); return response.json();
}));
const { sources, issues } = catalog;
const items = galleryArt(catalog.items);
artData.entries = galleryArt(artData.entries);
artData.entryCount = artData.entries.length;
artData.uniqueImageCount = new Set(artData.entries.map(e=>e.localPath).filter(Boolean)).size;
artData.failedUrls = artData.entries.filter(e=>!e.localPath).map(e=>e.sourceUrl);
const inventoryItems = () => items.filter(i=>itemAvailability(i,state.stage,state.progress).available);
const recordedInventoryCount = () => inventoryItems().filter(i=>Object.hasOwn(state.account.inventory,i.id)).length;
const storageKey = 'winter-value-model:v1';
let storageMessage = '', page = location.hash.slice(1)||'overview', filter = '', priceScope = 'all', stockFilter = '', accountTab='levels';
let state = initialState();
try { const saved = localStorage.getItem(storageKey); if (saved) state = validateState(JSON.parse(saved), items); }
catch { storageMessage = '本地记录无法读取，已打开空白草稿。可重新导入备份。'; }
const app = document.querySelector('#app');
const persistence=createPersistence({getState:()=>state,validate:value=>validateState(value,items),storageKey,storage:localStorage,mode:PUBLIC_BETA?'browser':'disk',onStatus:text=>{storageMessage=text;for(const id of ['save-state','inventory-save-status']){const el=document.querySelector('#'+id);if(el)el.textContent=text;}}});
const fmt = (v, digits = 2) => Number(v).toLocaleString('zh-CN', { maximumFractionDigits: digits });
const money = v => `¥${fmt(v, 4)}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const itemOf = id => items.find(i => i.id === id);
const getPrice=(item,stage,overrides={},allowQuotes=false)=>resolvePrice(item,stage,overrides,allowQuotes,catalog.items,new Set(),{refinementMethod:state.refinement.method,boxChoices:state.boxChoices,progress:state.progress});
const stageName = () => STAGES.find(s => s.id === state.stage).name;
const unitLabel = item => `${item.priceScale === 1 ? '' : fmt(item.priceScale)}${item.unit}`;
const typeName = kind => ({ reference: '参考估值 · 待复核', channel: '渠道折算 · 待确认' }[kind]);
const pill = (text, type = '') => `<span class="pill ${type}">${esc(text)}</span>`;
const options = (list, selected) => list.map(([id, label]) => `<option value="${esc(id)}" ${id === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
const resolveItemArt=createArtResolver(artData.entries,items,()=>state.progress.heroGeneration);
function artIcon(input,size='') {
  const art=resolveItemArt(input),item=typeof input==='object'?input:items.find(i=>i.id===input||i.name===input),label=item?.name||(typeof input==='string'?input:'道具');
  return `<span class="item-art ${size} ${art?'':'no-art'}" title="${esc(art?(art.representative?art.note:(item?.artNote||art.note||art.name)):'贴图对应关系待确认')}">${art?`${artImage(art,esc)}${art.representative?`<span class="art-generation">S${art.displayGeneration}</span>`:''}`:''}<span class="art-fallback" aria-hidden="true">${esc(label.slice(0,1))}</span></span>`;
}
app.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&e.target.parentElement.classList.contains('item-art'))e.target.parentElement.classList.add('no-art');},true);
const artPanel=createArtPanel(artData,{esc,options,fmt,getGeneration:()=>state.progress.heroGeneration,visibleEntries:entries=>entries.filter(e=>{if(e.category==='专家材料'&&state.progress.heroGeneration<3)return false;const matches=items.filter(i=>i.name===e.name||i.artName===e.name);return !matches.length||matches.some(i=>itemAvailability(i,state.stage,state.progress).available);})});
const inventoryHistory=createInventoryHistoryPanel({items,esc,fmt,options,artIcon,getAccount:()=>state.account,onSave:refresh=>{save();if(refresh)render();},notify:toast});
const refinementPanel=createRefinementPanel({esc,fmt,money,getMethod:()=>state.refinement.method,setMethod:method=>{state.refinement.method=method;save();},getFirePrice:()=>getPrice(itemOf('fire-crystal'),state.stage),isUnlocked:()=>itemAvailability(itemOf('refined-fire-crystal'),state.stage,state.progress).available,stageName});
const accountProgress=createAccountProgressPanel(planningData,chiefArtData,{esc,options,getState:()=>state,onRefresh:render,onNavigate:navigatePage,onGrowthChange:next=>{state.battleProfile=next;save();},onChiefChange:loadout=>{state.account.chiefLoadout=validateChiefLoadout(loadout);save();render();},onTechnologyChange:next=>{state.account.technologyLevels=validateTechnologyLevels(next);save();},notify:toast});
function openCurrentLevels(selection){accountTab='levels';accountProgress.open(selection);navigatePage('account');}
const battleProfile=createBattleProfile(planningData,{getState:()=>state,esc,save:next=>{state.battleProfile=next;save();}});
const planningPanel=createPlanningPanel(planningData,chiefArtData,{esc,fmt,money,options,pill,artIcon,itemOf,onNavigate:target=>{if(target==='account')accountTab='inventory';navigatePage(target);},getState:()=>({...state,items:catalog.items}),onOpenCurrent:openCurrentLevels,onChiefChange:next=>{state.account.chiefLoadout=validateChiefLoadout(next);save();},onGrowthChange:next=>{state.battleProfile=next;save();},onChiefTargetsChange:next=>{state.chiefTargets=validateChiefLoadout(next);save();},onTechnologyChange:next=>{state.account.technologyLevels=validateTechnologyLevels(next);save();},onTargetsChange:next=>{state.technologyTargets=validateTechnologyLevels(next);save();},onChange:(next,refresh)=>{state.planning=validatePlanningState(next);save();if(refresh)render();else {const totals=document.querySelector('#battle-plan-totals');if(totals)totals.innerHTML=battleProfile.totals();}},onResearchChange:next=>{state.research=validateResearchSettings(next);save();},onSavedPlansChange:next=>{state.savedPlans=validateSavedPlans(next);save();},notify:toast});
const sourceLink = id => { const s = sources.find(x => x.id === id); return s&&!s.url?esc(s.title):s ? `<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ↗</a>` : '来源待补'; };
function save() {
  persistence.save();
  const el = document.querySelector('#save-state'); if (el) el.textContent = storageMessage || '已保存在此浏览器';
}
let previousGift = null;
const offersPanel = createOffersPanel(offers,{items,esc,fmt,pill,options,artIcon,getStage:()=>state.stage,getReviews:()=>state.offerReviews,onReviewChange:(id,record)=>{if(record)state.offerReviews[id]=record;else delete state.offerReviews[id];save();},onNavigate:target=>navigatePage(target),notify:toast,onApply:(gift,stage)=>{if(stage!==state.stage){toast('礼包采用进度与顶部价格大类不一致，请先调整顶部英雄和火晶进度');return;}previousGift={gift:structuredClone(state.gift)};state.gift=gift;save();navigatePage('gift');toast('已填入礼包草稿，可撤销恢复上一份');}});
function availability() {
  return { reference: items.filter(i => {const p=getPrice(i,state.stage);return p&&p.kind!=='channel';}).length,
    quotes: items.filter(i => i.prices[state.stage]?.kind === 'channel').length };
}
function metrics() {
  const a = availability();
  return `<div class="metrics"><div><span>当前进度</span><strong>${stageName()}</strong><small>由英雄与火晶进度自动匹配</small></div><div><span>可用参考价</span><strong>${a.reference}<i> / ${items.length}</i></strong><small>统一资料价格，原资料仍待复核</small></div><div><span>待确认渠道价</span><strong>${a.quotes}<i> 项</i></strong><small>默认不计入参考估值</small></div><div><span>资料快照</span><strong>${[catalog.asOf,planningData.asOf].sort().at(-1).slice(5).replace("-",".")}</strong><small>价格 ${catalog.asOf} · 规划 ${planningData.asOf}</small></div></div>`;
}
const navigation = [['overview','概览','01'],['gift','礼包估值','02'],['offers','礼包资料','03'],['prices','道具价格','04'],['art','道具图鉴','05'],['account','账号与库存','06'],['refinement','火晶精炼','07'],['upgrade','提升规划','08'],['sources','资料校对','09']];
function fireProgressControl() {
  const choices=fireChoicesForHero(state.progress.heroGeneration);
  if(choices.length>1)return `<label>火晶／兵种进度<select id="fire-progress">${options(choices.map(p=>[p.id,p.name]),state.progress.fireProgress)}</select></label>`;
  const label=state.progress.heroGeneration>=10?'火晶十／T12（同价）':choices[0].name;
  return `<div class="automatic-fire"><span>火晶／兵种进度</span><strong>${esc(label)}</strong><small>自动匹配</small></div>`;
}
function navigatePage(target) {
  if(!navigation.some(n=>n[0]===target))return;
  if(page!==target)history.pushState(null,'','#'+target);
  page=target;render();window.scrollTo(0,0);
}
function syncPageFromUrl(){
  const target=location.hash.slice(1)||'overview';
  if(target!==page){page=target;render();window.scrollTo(0,0);}
}
window.addEventListener('popstate',syncPageFromUrl);
window.addEventListener('hashchange',syncPageFromUrl);
function render() {
  if(!navigation.some(n=>n[0]===page))page='overview';
  if(location.hash!=='#'+page)history.replaceState(null,'','#'+page);
  document.title=navigation.find(n=>n[0]===page)[1]+' · 冬日账本';

  app.innerHTML = `<div class="layout"><aside class="sidebar"><a class="brand" href="#overview"><span class="brand-mark">冬</span><div>冬日账本<small>无尽冬日 · 性价比模型</small></div></a><div class="sidebar-label">工作台</div><nav>${navigation.map(([id, name, index]) => `<button data-page="${id}" class="nav-item ${page===id?'active':''}"><span>${index}</span>${name}${page===id?'<b>›</b>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="status-dot"></span>${PUBLIC_BETA?'内测版':'本地运行'}<small>${PUBLIC_BETA?'库存保存在此浏览器':'F盘自动存档'} · 可导出备份<br>${PUBLIC_BETA?'v1.9 · Beta 1':'v1.8 · 科技图上规划'}</small></div></aside><main><header><div class="breadcrumb">工作台 <span>/</span> ${navigation.find(n=>n[0]===page)[1]}</div><div class="toolbar"><div class="progress-controls"><label>英雄进度<select id="hero-generation">${options(HERO_GENERATIONS.map(g=>[String(g.id),g.name]),String(state.progress.heroGeneration))}</select></label>${fireProgressControl()}<span class="resolved-stage">价格大类<strong>${stageName()}</strong></span></div><button class="button quiet" id="export">导出备份</button><button class="button quiet" id="import">导入备份</button><input hidden type="file" id="import-file" accept=".json,application/json"></div></header><div class="content">${PUBLIC_BETA?'<div class="note beta-notice"><strong>内测版</strong> · 数据和功能持续完善。库存、等级和方案仅保存在当前浏览器，请定期导出备份；更换设备后可导入。</div>':''}${state.progress.needsConfirmation?'<div class="note">已按旧价格大类预填进度，请在顶部重新选择实际英雄与火晶进度。</div>':''}${({overview:overview,gift:giftView,offers:offersPanel.view,art:artPanel.view,prices:pricesView,account:accountView,refinement:refinementPanel.view,upgrade:upgradeView,sources:sourcesView})[page]()}</div><footer><span id="save-state">${esc(storageMessage || '已保存在此浏览器')}</span><span>估值有来源，缺项可追溯。</span></footer></main></div><div id="toast" role="status" aria-live="polite"></div>`;
  bindCommon();
  ({ gift: bindGift, offers: offersPanel.bind, art: artPanel.bind, sources: offersPanel.bindAudit, prices: bindPrices, account: bindAccount, refinement: refinementPanel.bind, upgrade: bindUpgrade }[page] || (()=>{}))();
}
function title(kicker, heading, description, extra='') {
  return `<div class="page-title"><div><p class="eyebrow">${kicker}</p><h1>${heading}</h1><p class="description">${description}</p></div>${extra}</div>`;
}
function overview() {
  return `${title('WINTER VALUE MODEL', '每一份投入，都看清去向。', '从礼包估值开始，逐步连接道具价格、账号库存与属性提升。', pill(PUBLIC_BETA?'内测版 · 浏览器保存':'本地自动存档','green'))}${metrics()}<div class="quick-actions"><button data-page="account" data-open-inventory><span>长期库存</span><strong>${recordedInventoryCount()} 种材料已记录</strong><small>查看库存与时间记录 →</small></button><button data-page="upgrade"><span>提升规划</span><strong>8个系统 · 逐级材料</strong><small>装备、宝石、科技、专家与宠物 →</small></button><button data-page="refinement"><span>每周火晶精炼</span><strong>${esc(state.refinement.method)}</strong><small>按概率与每日半价计算成本 →</small></button></div><div class="overview-grid"><section class="card feature"><div class="section-heading"><span class="eyebrow">从这里开始</span><span class="mini-icon">↗</span></div><h2>这个礼包，值多少？</h2><p>选择王国进度，录入礼包价格和材料。逐项查看参考价值，缺少的价格会直接显示。</p><button class="button primary" data-page="gift">计算一个礼包 <span>→</span></button><div class="flow"><span>选择进度</span><b>→</b><span>录入内容</span><b>→</b><span>查看估值</span></div></section><section class="card"><div class="section-heading"><h2>模型的三层依据</h2>${pill('逐步完善')}</div><div class="principle"><b>01</b><div><strong>原始资料</strong><p>保存礼包内容、材料消耗与来源。</p></div></div><div class="principle"><b>02</b><div><strong>估值口径</strong><p>统一参考价与渠道价分别记录。</p></div></div><div class="principle"><b>03</b><div><strong>个人规划</strong><p>结合库存计算材料缺口，再接入购买优化。</p></div></div></section></div><section class="card"><div class="section-heading"><h2>进度与价格覆盖</h2><button class="text-button" data-page="prices">查看完整价格表 →</button></div><div class="stage-track">${STAGES.map(s=>`<div class="stage-tile ${s.id===state.stage?'selected':''}"><strong>${s.name}</strong><span>${items.filter(i=>getPrice(i,s.id)?.kind==='reference').length} 项参考价 · ${items.filter(i=>getPrice(i,s.id,{},true)?.kind==='channel').length} 项渠道价</span></div>`).join('')}</div></section>${coverageTable(planningData,esc)}<div class="note">参考价值用于比较材料；实际购买还要结合礼包限购、免费获取和兑换。未提供的价格、属性和库存均保留未知。</div>`;
}
function giftView() {
  return `${title('PACK EVALUATION','礼包估值','按统一参考档位比较内容价值。实付价格用于计算参考倍数，不改变道具单价。')}<div class="gift-grid"><section class="card"><div class="section-heading"><h2>礼包内容</h2><div class="gift-header-actions">${pill(stageName())}${previousGift?'<button class="text-button" id="undo-offer">撤销资料填入</button>':''}</div></div>${giftOriginView()}<div class="form-grid"><label>礼包名称<input id="gift-name" placeholder="例如：本期活动礼包" maxlength="200" value="${esc(state.gift.name)}"></label><label>实际价格（元）<input id="cash" type="number" min="0.01" step="0.01" value="${state.gift.cash}"></label></div><div class="line-head"><span>道具</span><span>数量（实际个数／小时）</span><span></span></div>${state.gift.lines.map((l,i)=>`<div class="gift-line">${artIcon(itemOf(l.itemId))}<select aria-label="第${i+1}行道具" data-line-item="${i}">${options(items.filter(x=>itemAvailability(x,state.stage,state.progress).available||x.id===l.itemId).map(x=>[x.id,x.name+(itemAvailability(x,state.stage,state.progress).available?'':'（未解锁）')]),l.itemId)}</select><input aria-label="第${i+1}行数量" data-line-qty="${i}" type="number" min="0" step="${itemOf(l.itemId)?.unit==='小时'?'any':'1'}" value="${l.quantity}"><button class="remove-button" data-remove="${i}" aria-label="删除第${i+1}行">×</button></div>`).join('')}${[...new Set(state.gift.lines.map(l=>l.itemId))].map(id=>boxChoiceControl(itemOf(id))).join('')}<button id="add-line" class="button dashed">＋ 添加道具</button><label class="check-label"><input type="checkbox" id="allow-quotes" ${state.gift.allowQuotes?'checked':''}>纳入待确认的渠道折算价</label><p class="hint">早期渠道价代表某个礼包的折算成本。开启后，结果会标记为包含渠道估算。</p></section><aside class="result-card" id="gift-summary"></aside></div><section class="card"><div class="section-heading"><h2>逐项估值</h2><span class="muted">批量单价自动换算为实际数量</span></div><div class="table-scroll" id="gift-details"></div></section>`;
}
function updateGiftResult() {
  const result = estimateGift({ ...state.gift, stage:state.stage,refinementMethod:state.refinement.method,boxChoices:state.boxChoices,progress:state.progress },catalog.items);
  document.querySelector('#gift-summary').innerHTML = `<p class="eyebrow">${result.complete?'礼包参考价值':'已估值部分'}</p><div class="result-value">${money(result.total)}</div><div class="result-divider"></div><div class="result-pair"><span>实付金额</span><strong>${money(state.gift.cash)}</strong></div><div class="result-pair"><span>参考价值／实付金额</span><strong>${result.ratio===null?'待补齐':fmt(result.ratio,2)+' ×'}</strong></div><div class="result-status ${result.complete?'ok':''}">${result.invalid?'有无效数量，请检查输入':result.missing?`${result.missing} 项缺少可用价格，暂不计算总倍数`:result.complete?'当前录入内容均可估值':'填写道具数量后开始计算'}</div><p class="hint">${result.usesQuotes?'包含待确认渠道价，本结果为候选估算。':'参考价由维护者统一提供，不等于当前最低购买成本。'}</p>`;
  document.querySelector('#gift-details').innerHTML = `<table><thead><tr><th>道具</th><th>数量</th><th>参考单价</th><th>小计</th><th>口径</th></tr></thead><tbody>${result.results.map(r=>`<tr><td><div class="item-with-art">${artIcon(r.item)}<span>${esc(r.item?.name||'未知道具')}</span></div></td><td>${r.invalid?'无效输入':`${fmt(r.quantity,4)} ${esc(r.item.unit)}`}</td><td>${r.price?`${money(r.price.value)} / ${unitLabel(r.item)}`:'—'}</td><td>${r.subtotal===null?'—':money(r.subtotal)}</td><td>${r.invalid?pill('输入无效','amber'):r.price?pill(typeName(r.price.kind),r.price.kind==='channel'?'amber':''):pill('未提供可用价格','amber')}</td></tr>`).join('')}</tbody></table>`;
}
function pricesView() {
  return `${title('ITEM PRICES','让每个价格，都有依据。','每行单价对应明确单位，由维护者统一更新；玩家按自己的进度查看和计算。')}${metrics()}<section class="card"><div class="section-heading"><h2>${stageName()} · 道具价格</h2><div class="filters"><input id="price-search" placeholder="搜索道具名称" value="${esc(filter)}"><select id="price-scope" aria-label="价格状态筛选">${options([['all','全部状态'],['missing','未提供价格'],['locked','未解锁'],['choice','待选择奖励'],['channel','渠道折算价']],priceScope)}</select></div></div><div id="price-rows" class="table-scroll"></div></section>`;
}
function updatePriceRows() {
  const visible = items.filter(i=>[i.name,...(i.aliases||[])].some(n=>n.includes(filter))).filter(i=>{ const p=getPrice(i,state.stage,{},true),a=itemAvailability(i,state.stage,state.progress); return priceScope==='all'||(priceScope==='missing'&&!p&&a.available&&i.valuation?.type!=='choice')||(priceScope==='locked'&&!a.available)||(priceScope==='choice'&&a.available&&i.valuation?.type==='choice'&&!p)||(p?.kind===priceScope); });
  document.querySelector('#price-rows').innerHTML = `<table><thead><tr><th>道具</th><th>单价（元）</th><th>计价单位</th><th>状态与依据</th></tr></thead><tbody>${visible.map(i=>{const p=getPrice(i,state.stage,{},true),availability=itemAvailability(i,state.stage,state.progress); return `<tr><td><div class="item-with-art">${artIcon(i)}<div><strong>${esc(i.name)}</strong><small>${esc(i.category)}</small></div></div></td><td class="numeric">${p?fmt(p.value,6):'—'}</td><td>${unitLabel(i)}</td><td>${p?pill(typeName(p.kind),p.kind==='channel'?'amber':''):pill(!availability.available?'未解锁':i.valuation?.type==='choice'?'待选择奖励':'未提供价格','amber')}<small>${p?esc(p.note):(!availability.available?availability.reason:i.valuation?.type==='choice'?'选择实际开出的内容后，自动计算每箱价值。':'未确认变价或缺资料，暂不自动延用。')}</small>${p?sourceLink(p.source):''}${availability.available?boxChoiceControl(i)+valuationDetails(i):''}</td></tr>`;}).join('')||'<tr><td colspan="4">没有符合筛选条件的道具。</td></tr>'}</tbody></table>`;
  document.querySelectorAll('[data-open-refinement]').forEach(button=>button.addEventListener('click',()=>{page='refinement';render();window.scrollTo(0,0);}));
  bindBoxChoices();
}
function boxChoiceControl(item) {
  if(item?.valuation?.type!=='choice')return '';
  const choices=item.valuation.contents.map(c=>{
    const reward=itemOf(c.itemId),price=reward?getPrice(reward,state.stage):null;
    return [c.itemId,`${reward?.name||c.itemId} ×${c.quantity}${price?`（${money(c.quantity*price.value/reward.priceScale)}/箱）`:'（当前进度缺价）'}`];
  });
  return `<label class="box-choice-control">${esc(item.name)} · 本次开出内容<select data-box-choice="${esc(item.id)}" aria-label="${esc(item.name)}开出内容">${options([['','请选择实际开出的奖励'],...choices],state.boxChoices[item.id]||'')}</select><small>仅按所选一种奖励计价；价格表和礼包估值同步使用。</small></label>`;
}
function bindBoxChoices(){
  document.querySelectorAll('[data-box-choice]').forEach(el=>el.addEventListener('change',()=>{
    if(el.value)state.boxChoices[el.dataset.boxChoice]=el.value;else delete state.boxChoices[el.dataset.boxChoice];
    save();render();
  }));
}
function valuationDetails(item) {
  if(!item.valuation||!itemAvailability(item,state.stage,state.progress).available)return '';
  if(item.valuation.type==='refinement')return `<div class="refinement-price-method">${pill('当前方式 '+state.refinement.method,'green')}<button class="text-button" data-open-refinement>调整精炼方式 →</button></div><p class="hint">精炼火晶单价＝火晶单价 × 周消耗火晶 ÷ 周期望产量，随精炼方式自动更新。</p>`;
  const result=valueContents(selectedChoiceItem(item,state.boxChoices),state.stage,catalog.items,(dependency,stage,seen)=>resolvePrice(dependency,stage,{},false,catalog.items,seen,{boxChoices:state.boxChoices,progress:state.progress}));
  const rule=item.valuation;
  const rows=result.components.length?result.components:(rule.contents||[]).map(c=>({...c,name:itemOf(c.itemId)?.name||c.itemId,expectedQuantity:c.quantity}));
  return `<details class="valuation-details"><summary>${result.blocked?'查看规则与待补项':rule.type==='residual'?'查看橙装反推计算':'查看期望计算'}</summary><p>${esc(rule.note)}</p>${rule.type==='residual'&&result.value!==null&&!result.blocked?`<p>传说装备单价＝（${fmt(result.boxValue,6)}－${fmt(result.otherValue,6)}）÷${fmt(result.targetExpectedQuantity,9)}＝<strong>${fmt(result.value,6)} 元</strong>。装备幸运宝箱价格保持 ${fmt(result.boxValue,6)} 元。</p>`:''}${result.cycle?`<p>平均每 ${fmt(result.cycle.cycleLength,6)} 箱出1件传说装备；长期传说比例 ${fmt(result.cycle.guaranteedRate*100,6)}%。保底替代该次普通奖励，不额外叠加。</p>`:''}${rows.length?`<table><thead><tr><th>奖励</th><th>概率</th><th>${rule.type==='choice'?'可选数量':'每箱期望数量'}</th><th>参考价值（元）</th></tr></thead><tbody>${rows.filter(r=>!isRemovedItem(r)).map(r=>`<tr><td>${esc(r.name)} ×${fmt(r.quantity,4)}</td><td>${rule.type==='choice'?'自选':fmt(r.probability*100,6)+'%'}</td><td>${fmt(r.expectedQuantity,6)}</td><td>${r.subtotal===null||r.subtotal===undefined?'待补／待选择':fmt(r.subtotal,6)}</td></tr>`).join('')}</tbody></table>`:''}${result.missing?.length?`<p>缺少材料价格：${esc(result.missing.join('、'))}，不使用旧箱子价格补齐。</p>`:''}<p>材料基础单价：${sourceLink('value-table')}</p><p>${sourceLink(rule.source)}${rule.pitySource?'；保底规则：'+sourceLink(rule.pitySource):''}</p></details>`;
}
function stockFields() {
  return inventoryItems().filter(i=>`${i.name} ${(i.aliases||[]).join(' ')} ${i.category}`.includes(stockFilter)).map(i=>`<label><span class="inventory-field-title">${artIcon(i)}<span>${esc(i.name)}</span></span><div class="inventory-input"><input data-stock="${i.id}" aria-label="${esc(i.name)}库存" type="number" min="0" step="${i.unit==='小时'?'any':'1'}" placeholder="未记录" value="${state.account.inventory[i.id]??''}"><span>${i.unit}</span></div></label>`).join('')||'<p class="hint">没有匹配的材料。</p>';
}
function accountView() {
  const inventory=accountTab==='inventory'?`${inventoryHistory.view()}<section class="card"><div class="section-heading"><h2>材料库存</h2><span id="stock-count">${pill(`${recordedInventoryCount()} 种材料已记录`)}</span></div><input id="stock-search" aria-label="搜索库存材料" placeholder="搜索材料或类别，例如：宠物" value="${esc(stockFilter)}"><div class="inventory-grid" id="stock-grid">${stockFields()}</div></section>`:'';
  return `${title('ACCOUNT & INVENTORY','记录账号现状。','保存实际等级与材料库存，提升规划会读取这些记录；只有实际升级后才需要更新这里。')}<div class="account-tabs" role="group" aria-label="账号记录内容"><button type="button" data-account-tab="levels" aria-pressed="${accountTab==='levels'}" class="${accountTab==='levels'?'active':''}">当前属性与等级</button><button type="button" data-account-tab="inventory" aria-pressed="${accountTab==='inventory'}" class="${accountTab==='inventory'?'active':''}">材料库存与时间记录</button></div>${accountTab==='levels'?battleProfile.account()+accountProgress.view():inventory}<section class="card account-info"><details><summary>账号备注与保存位置</summary><label class="account-name">账号备注<input id="account-name" maxlength="200" placeholder="填写便于识别的账号名称" value="${esc(state.account.name)}"></label><p class="hint"><strong id="inventory-save-status">${esc(persistence.message)}</strong><br>${PUBLIC_BETA?'内测版记录保存在当前设备的此浏览器中，清理网站数据会移除记录，不跨设备自动同步。':'自动存档在F盘项目文件夹的 storage 中；'}导出备份包含当前等级与全部库存历史。</p></details></section>`;
}
function upgradeView() { return planningPanel.view()+`<div id="battle-plan-totals">${battleProfile.totals()}</div>`; }
function artSourcesView() {
  const matched=items.filter(i=>resolveItemArt(i)),pending=items.filter(i=>!resolveItemArt(i));
  return `<section class="card"><div class="section-heading"><h2>道具贴图资料</h2><button class="text-button" data-page="art">打开完整图鉴 →</button></div><p class="hint">来源：<a href="${esc(artData.sourceUrl)}" target="_blank" rel="noreferrer">${esc(artData.sourceName)} ↗</a>。已保存${artData.entryCount}个条目、${artData.uniqueImageCount-artData.failedUrls.length}张独立图片；${matched.length}/${items.length}个模型道具已明确匹配。贴图不改变价格、单位和升级规则。</p><details class="mapping-details"><summary>查看${pending.length}个暂未自动匹配的模型条目</summary><div class="unmapped-list">${pending.map(i=>`<span>${esc(i.name)}</span>`).join('')}</div></details></section>`;
}
function sourcesView() {
  return `${title('SOURCES & REVIEW','把不确定的地方，留在明处。','来源、口径和待确认事项集中管理。新资料应先确认适用进度，再更新对应数据。')}${coverageTable(planningData,esc)}<section class="card"><div class="section-heading"><h2>提升规划资料来源</h2><span class="pill">${planningData.sources.length} 条来源</span></div><details><summary>展开逐项来源与核对状态</summary>${planningData.sources.map(s=>`<div class="source-row"><div><strong>${esc(s.title)}</strong><p>${esc(s.status)}</p></div>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noreferrer">查看原始资料 ↗</a>`:"本地只读参考资料"}</div>`).join("")}</details></section>${artSourcesView()}${offersPanel.auditView()}<section class="card"><div class="section-heading"><h2>本次已接入来源</h2><span class="muted">快照 ${catalog.asOf}</span></div>${sources.map(s=>`<div class="source-row"><div><strong>${esc(s.title)}</strong><p>${esc(s.status)}</p></div>${sourceLink(s.id)}</div>`).join('')}</section><section class="card"><div class="section-heading"><h2>校对事项</h2>${pill(`${issues.length} 项记录`)}</div>${issues.map(i=>`<div class="issue-row"><div><strong>${esc(i.title)}</strong><p>${esc(i.detail)}</p></div>${pill(i.status,i.status==='已落实'?'green':'amber')}</div>`).join('')}</section><div class="note">价格由维护者统一更新。备份保存玩家进度、账号备注、库存、礼包草稿和校对记录；旧个人单价仅归档，不参与计算。</div>`;
}
function bindCommon() {
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();navigatePage('overview');});
  document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>{if(el.hasAttribute('data-open-inventory'))accountTab='inventory';navigatePage(el.dataset.page);}));
  for(const [id,key] of [['hero-generation','heroGeneration'],['fire-progress','fireProgress']]) {
    document.querySelector('#'+id)?.addEventListener('change',e=>{
      state.progress=normalizeProgress({heroGeneration:state.progress.heroGeneration,fireProgress:state.progress.fireProgress,[key]:key==='heroGeneration'?Number(e.target.value):e.target.value});
      state.stage=resolveStage(state.progress);save();render();
    });
  }
  document.querySelector('#export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`冬日账本备份-${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('备份已导出');});
  document.querySelector('#import').addEventListener('click',()=>document.querySelector('#import-file').click());
  document.querySelector('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10*1024*1024)throw new Error('备份文件超过10MB');const parsed=JSON.parse(await file.text());const next=validateState(parsed?.state?.schemaVersion===1?parsed.state:parsed,items);state=next;save();render();toast('备份已导入');}catch(err){toast(err.message);}e.target.value='';});
}
function giftOriginView() {
  const o=state.gift.origin;if(!o)return '';
  return `<div id="gift-origin" class="note">来自：${esc(o.packName)} · ${esc(o.sectionTitle)} · ${esc(o.tierLabel)}。本次按“${o.mode==='fixed'?'全部同时获得':'自选勾选项目'}”填入。手动更改材料或金额后取消来源标记。</div>`;
}
function invalidateOrigin() {delete state.gift.origin;document.querySelector('#gift-origin')?.remove();}
function bindGift() {
  document.querySelector('#undo-offer')?.addEventListener('click',()=>{state.gift=previousGift.gift;previousGift=null;save();render();toast('已恢复上一份礼包草稿');});
  document.querySelector('#gift-name').addEventListener('input',e=>{state.gift.name=e.target.value;invalidateOrigin();save();});
  document.querySelector('#cash').addEventListener('input',e=>{state.gift.cash=Number(e.target.value);invalidateOrigin();save();updateGiftResult();});
  document.querySelectorAll('[data-line-item]').forEach(el=>el.addEventListener('change',()=>{state.gift.lines[Number(el.dataset.lineItem)].itemId=el.value;invalidateOrigin();save();render();}));
  document.querySelectorAll('[data-line-qty]').forEach(el=>el.addEventListener('input',()=>{state.gift.lines[Number(el.dataset.lineQty)].quantity=Number(el.value);invalidateOrigin();save();updateGiftResult();}));
  document.querySelectorAll('[data-remove]').forEach(el=>el.addEventListener('click',()=>{state.gift.lines.splice(Number(el.dataset.remove),1);invalidateOrigin();save();render();}));
  document.querySelector('#add-line').addEventListener('click',()=>{if(state.gift.lines.length>=100){toast('最多100行');return;}state.gift.lines.push({itemId:items[0].id,quantity:0});invalidateOrigin();save();render();});
  document.querySelector('#allow-quotes').addEventListener('change',e=>{state.gift.allowQuotes=e.target.checked;save();updateGiftResult();});
  updateGiftResult();bindBoxChoices();
}
function bindPrices() {
  document.querySelector('#price-search').addEventListener('input',e=>{filter=e.target.value;updatePriceRows();});
  document.querySelector('#price-scope').addEventListener('change',e=>{priceScope=e.target.value;updatePriceRows();}); updatePriceRows();
}
function bindAccount() {
  document.querySelector('#account-name').addEventListener('input',e=>{state.account.name=e.target.value;save();});
  document.querySelectorAll('[data-account-tab]').forEach(button=>button.addEventListener('click',()=>{accountTab=button.dataset.accountTab;render();}));
  if(accountTab==='levels'){battleProfile.bind();accountProgress.bind();return;}
  document.querySelector('#stock-search').addEventListener('input',e=>{stockFilter=e.target.value;document.querySelector('#stock-grid').innerHTML=stockFields();bindStockInputs();});
  bindStockInputs();
  inventoryHistory.bind();
}
function bindStockInputs() {
  document.querySelectorAll('[data-stock]').forEach(el=>el.addEventListener('input',()=>{const item=itemOf(el.dataset.stock),v=Number(el.value);if(el.value.trim()===''){delete state.account.inventory[item.id];save();document.querySelector('#stock-count').innerHTML=pill(`${recordedInventoryCount()} 种材料已记录`);inventoryHistory.refresh();return;}if(!Number.isFinite(v)||v<0||(item.unit!=='小时'&&!Number.isInteger(v))){toast('请输入有效的非负数量');el.value=state.account.inventory[item.id]??'';return;}state.account.inventory[item.id]=v;save();document.querySelector('#stock-count').innerHTML=pill(`${recordedInventoryCount()} 种材料已记录`);inventoryHistory.refresh();}));
}
function bindUpgrade() { planningPanel.bind(); }
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message;el.className='visible';setTimeout(()=>{el.className='';},4500); }
const diskState=await persistence.load();
if(diskState)state=diskState;
render();
if(persistence.needsInitialSave)save();
