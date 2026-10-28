import {validateBattleProfile} from './battle-profile.js';
import {validatePlanningState} from './planning.js';
import {validateResearchSettings} from './research-time.js';
import {validateTechnologyLevels} from './technology-levels.js';
import {validateChiefLoadout} from './chief-loadout.js';
import { STAGES, resolveStage, progressFromStage, normalizeProgress } from './stages.js';
import { validateReviews } from './reviews.js';
import { valueContents, selectedChoiceItem } from './valuation.js';
import {calculateRefinement,DEFAULT_REFINEMENT_METHOD,parseRefinementMethod} from './refinement.js';
import {isRemovedItem} from './art.js';
import {validateInventoryHistory} from './inventory.js';
import {validateSavedPlans} from './saved-plans.js';
import {itemAvailability} from './availability.js';
export { STAGES } from './stages.js';
export const canonicalItemId = id => id==='pet-breakthrough-choice'?'pet-box':id;

export function getPrice(item, stage, overrides = {}, allowQuotes = false, items = [], seen = new Set(), context = {}) {
  if(!item||(isRemovedItem(item)&&!['rare-gear','epic-gear'].includes(item.id)))return null;
  if(!itemAvailability(item,stage,context.progress).available)return null;
  // Legacy browser overrides are retained in backups but do not affect maintained prices.
  if(seen.has(item.id))return null;
  if(item.packResidual){
    const rule=item.packResidual;let remainder=rule.cash,channel=false;
    for(const reward of rule.deductions){
      const dependency=items.find(i=>i.id===reward.itemId);
      const price=dependency?getPrice(dependency,stage,{},allowQuotes,items,new Set([...seen,item.id]),context):null;
      if(!price)return null;
      remainder-=reward.quantity*price.value/dependency.priceScale;
      channel ||=price.kind==='channel';
    }
    if(remainder<0)return null;
    return {value:remainder/rule.quantity*item.priceScale,kind:channel?'channel':'reference',source:rule.source,note:rule.note};
  }
  if(item.regularPackPricing){
    const rule=item.regularPackPricing;
    const speed=items.find(i=>i.id===rule.deductItemId);
    const speedPrice=speed?getPrice(speed,stage,{},false,items,new Set([...seen,item.id]),context):null;
    const hourly=speedPrice?speedPrice.value/speed.priceScale:rule.fallbackHourly;
    const value=(rule.cash-rule.hours*hourly)/rule.quantity*item.priceScale;
    if(!Number.isFinite(value)||value<0)return null;
    return {value,kind:'reference',source:'expert-packs-screenshot',note:`专家技能常规礼包：30元500本学识之书＋8小时加速；各类小时加速同价，按${hourly}元/小时扣除，折合${Number(value.toFixed(6))}元/1000本。${speedPrice?'随当前进度加速参考价计算。':'当前进度统一加速参考价未确定，暂用常规飞速成长1元/小时。'}未扣除附带钻石、资源、VIP等赠品。`};
  }
  if(item.valuation?.type==='refinement'){
    const fire=items.find(i=>i.id==='fire-crystal');
    const base=fire?getPrice(fire,stage,{},allowQuotes,items,new Set([...seen,item.id]),context):null;
    if(!base)return null;
    const method=context.refinementMethod??DEFAULT_REFINEMENT_METHOD;
    try{
      const result=calculateRefinement(method,base.value/fire.priceScale);
      return {value:result.unitPrice*item.priceScale,kind:base.kind,source:'refinement-screenshots',
        note:`按每周${method}方式计算，消耗${result.totalFire}火晶，期望产出${Number(result.totalOutput.toFixed(6))}个；每日首次半价，基础火晶价格待复核。`,refinement:result};
    }catch{return null;}
  }
  if(item.priceAlias){
    const target=items.find(i=>i.id===item.priceAlias);
    const shared=target?getPrice(target,stage,{},allowQuotes,items,new Set([...seen,item.id]),context):null;
    if(shared)return shared;
  }
  if(item.valuation){
    const pricedItem=selectedChoiceItem(item,context.boxChoices);
    const result=valueContents(pricedItem,stage,items,(dependency,s,next)=>getPrice(dependency,s,{},allowQuotes,items,next,context),seen);
    if(result.blocked||result.value===null)return null;
    return {value:result.value*item.priceScale,kind:result.boxPrice?.kind==='channel'||result.components.some(c=>c.price?.kind==='channel')?'channel':'reference',
      source:item.valuation.source,note:(item.valuation.type==='choice'?`按所选奖励：${result.components.map(c=>`${c.name}×${c.quantity}`).join('、')}计算`:(['owner-item-prices-2026-10-26','owner-stage-ratios-2026-10-26'].includes(item.valuation.source)?item.valuation.note:({fixed:'按固定内容折算',random:'按奖励概率计算期望',pity:'按奖励概率及100箱保底计算长期期望',residual:'保留幸运宝箱参考价，扣除蓝装紫装期望价值后反推传说装备单价'}[item.valuation.type]||'按内容估值')))+'；基础单价待复核。',valuation:result};
  }
  const price = item.prices[stage];
  if (!price || (price.kind === 'channel' && !allowQuotes)) return null;
  return price;
}

export function estimateGift({ stage, cash, lines, allowQuotes = false, refinementMethod=DEFAULT_REFINEMENT_METHOD,boxChoices={},progress }, items, overrides = {}) {
  const results = lines.filter(line=>!isRemovedItem(line.itemId)).map(line => {
    const item = items.find(i => i.id === canonicalItemId(line.itemId));
    const qty = Number(line.quantity);
    if (!item || !Number.isFinite(qty) || qty < 0 || (item.unit !== '小时' && !Number.isInteger(qty))) {
      return { ...line, item, invalid: true, subtotal: null };
    }
    const availability=itemAvailability(item,stage,progress);
    const price = getPrice(item, stage, overrides, allowQuotes, items,new Set(),{refinementMethod,boxChoices,progress});
    return { ...line, item, quantity: qty, price, availability, subtotal: price ? qty * price.value / item.priceScale : null, missing: qty > 0 && !price };
  });
  const total = results.reduce((sum, row) => sum + (row.subtotal ?? 0), 0);
  const active = results.filter(row => row.quantity > 0 && !row.invalid);
  const complete = active.length > 0 && !results.some(row => row.invalid || row.missing);
  const validCash = Number.isFinite(Number(cash)) && Number(cash) > 0;
  return { results, total, complete, ratio: complete && validCash ? total / Number(cash) : null,
    missing: results.filter(r => r.missing).length, invalid: results.filter(r => r.invalid).length,
    usesQuotes: results.some(r => r.quantity > 0 && r.price?.kind === 'channel') };
}

export function gemUpgrade(from, to, pieces, gems, inventory) {
  if (![from, to, pieces].every(Number.isInteger) || pieces < 1 || pieces > 18 || from < 0 || to <= from || to > 16) throw new Error('请选择递增的宝石等级和1—18颗数量');
  const levels = gems.filter(g => g.level > from && g.level <= to);
  if (levels.length !== to - from) throw new Error('升级数据不完整');
  const costs = { 'charm-guide': 0, 'charm-design': 0, codex: 0 };
  for (const g of levels) for (const key of Object.keys(costs)) costs[key] += g.cost[key] * pieces;
  const materials = Object.entries(costs).map(([itemId, needed]) => ({ itemId, needed, owned: Number(inventory[itemId] || 0), gap: Math.max(0, needed - Number(inventory[itemId] || 0)) }));
  const before = from === 0 ? 0 : gems.find(g => g.level === from)?.attribute;
  const after = gems.find(g => g.level === to)?.attribute;
  return { materials, attributePointsPerGem: (after - before) * 100, pieces };
}

export function initialState() {
  return { schemaVersion: 1, stage: 'gen7-fc8', progress: progressFromStage('gen7-fc8'), gift: { name: '', cash: 30, lines: [{ itemId: 'charm-guide', quantity: 0 }], allowQuotes: false },
    account: { name: '', inventory: {}, history: [], deletedHistory: [], chiefLoadout:validateChiefLoadout(),technologyLevels:validateTechnologyLevels() }, planning:validatePlanningState(), research:validateResearchSettings(), technologyTargets:validateTechnologyLevels(), chiefTargets:validateChiefLoadout(), battleProfile:validateBattleProfile(), savedPlans:[], overrides: {}, offerReviews: {}, boxChoices:{}, refinement: {method:DEFAULT_REFINEMENT_METHOD}, upgrade: { from: 11, to: 12, pieces: 1 } };
}

export function validateState(value, items) {
  const fail = () => { throw new Error('数据格式不符：请导入本工具导出的版本1备份'); };
  if (!value || value.schemaVersion !== 1 || !STAGES.some(s => s.id === value.stage)) fail();
  let progress;
  if(value.progress===undefined) progress={...progressFromStage(value.stage),needsConfirmation:true};
  else {
    const p=value.progress;
    if(!p||typeof p!=='object'||Array.isArray(p)||(p.needsConfirmation!==undefined&&typeof p.needsConfirmation!=='boolean')) fail();
    progress={...normalizeProgress(p),...(p.needsConfirmation?{needsConfirmation:true}:{})};
    resolveStage(progress);
  }
  const ids = new Set(items.map(i => i.id));
  const bounded = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1e12;
  if (!value.gift || typeof value.gift.name !== 'string' || value.gift.name.length > 200 || !bounded(value.gift.cash) || typeof value.gift.allowQuotes !== 'boolean' || !Array.isArray(value.gift.lines) || value.gift.lines.length > 100) fail();
  for (const line of value.gift.lines) {
    if(isRemovedItem(line.itemId))continue;
    const item = items.find(i => i.id === canonicalItemId(line.itemId));
    if (!item || !bounded(line.quantity) || (item.unit !== '小时' && !Number.isInteger(line.quantity))) fail();
  }
  let origin;
  if (value.gift.origin !== undefined) {
    const o = value.gift.origin;
    const keys = ['packId','packName','sectionTitle','tierLabel','mode','sourceId'];
    if (!o || keys.some(k=>typeof o[k] !== 'string' || o[k].length > 300) || !['fixed','choice'].includes(o.mode) || !['regular','special'].includes(o.sourceId)) fail();
    origin = Object.fromEntries(keys.map(k=>[k,o[k]]));
  }
  if (!value.account || typeof value.account.name !== 'string' || value.account.name.length > 200 || !value.account.inventory || Array.isArray(value.account.inventory)) fail();
  const inventory={};
  for (const [key, qty] of Object.entries(value.account.inventory)) {
    if(isRemovedItem(key))continue;
    const id=canonicalItemId(key),item = items.find(i => i.id === id);
    if (!item || !bounded(qty) || (item.unit !== '小时' && !Number.isInteger(qty))) fail();
    inventory[id]=(inventory[id]||0)+qty;
    if(!bounded(inventory[id]))fail();
  }
  if (!value.overrides || Array.isArray(value.overrides)) fail();
  for (const [key, price] of Object.entries(value.overrides)) {
    const [stage, id, extra] = key.split(':');
    if(isRemovedItem(id))continue;
    if (extra || !STAGES.some(s => s.id === stage) || !ids.has(canonicalItemId(id)) || !bounded(price)) fail();
  }
  const u = value.upgrade;
  if (!u || ![u.from, u.to, u.pieces].every(Number.isInteger) || u.from < 0 || u.to <= u.from || u.to > 16 || u.pieces < 1 || u.pieces > 18) fail();
  const offerReviews=validateReviews(value.offerReviews);
  const method=value.refinement===undefined?DEFAULT_REFINEMENT_METHOD:value.refinement?.method;
  parseRefinementMethod(method);
  const boxChoices=value.boxChoices??{};
  if(typeof boxChoices!=='object'||Array.isArray(boxChoices))fail();
  for(const [id,choice] of Object.entries(boxChoices)){
    const box=items.find(i=>i.id===id);
    if(box?.valuation?.type!=='choice'||!box.valuation.contents.some(c=>c.itemId===choice))fail();
  }
  // Reconstruct known fields instead of merging untrusted imported objects.
  return { schemaVersion: 1, stage: resolveStage(progress), progress, gift: { name: value.gift.name, cash: value.gift.cash, allowQuotes: value.gift.allowQuotes,
    lines: value.gift.lines.filter(l=>!isRemovedItem(l.itemId)).map(l => ({ itemId: canonicalItemId(l.itemId), quantity: l.quantity })), ...(origin ? { origin } : {}) },
    account: { name: value.account.name, inventory, history:validateInventoryHistory(value.account.history,items), deletedHistory:validateInventoryHistory(value.account.deletedHistory,items),chiefLoadout:validateChiefLoadout(value.account.chiefLoadout),technologyLevels:validateTechnologyLevels(value.account.technologyLevels) },
    overrides: Object.fromEntries(Object.entries(value.overrides).filter(([key])=>!isRemovedItem(key.split(':')[1]))), offerReviews, boxChoices:{...boxChoices}, refinement:{method}, planning:validatePlanningState(value.planning), research:validateResearchSettings(value.research), technologyTargets:validateTechnologyLevels(value.technologyTargets), chiefTargets:validateChiefLoadout(value.chiefTargets), battleProfile:validateBattleProfile(value.battleProfile), savedPlans:validateSavedPlans(value.savedPlans), upgrade: { from: u.from, to: u.to, pieces: u.pieces } };
}
