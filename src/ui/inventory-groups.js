import {expertAffinityTotal} from '../domain/expert-inventory.js';
import {inventoryUnit,inventoryDisplayQuantity} from '../domain/inventory-units.js';
export function inventoryGroupsView(items,inventory,filter,{esc,artIcon,fmt,money,getPrice,stage,allItems=items}){
 const subgroup=i=>i.affinityPoints||i.id==='affection'?'好感度礼物':i.id==='expert-mark'||i.expertSlug?'专家印记':i.id==='knowledge'?'技能材料':'';
 const group=i=>i.id.startsWith('speed-')?'各类小时加速':subgroup(i)?'专家':i.id.startsWith('pet-')?'宠物材料':i.category;
 const groups=new Map();
 for(const item of items){
  if(item.inventoryHidden||(item.id==='affection'&&!Object.hasOwn(inventory,'affection')))continue;
  const name=group(item);
  if(!`${item.name} ${(item.aliases||[]).join(' ')} ${name} ${subgroup(item)} ${item.category}`.includes(filter))continue;
  if(!groups.has(name))groups.set(name,[]);groups.get(name).push(item);
 }
 const fields=list=>`<div class="inventory-grid">${list.map(i=>{
  const price=i.affinityPoints?getPrice(i,stage):null;
  const name=i.id==='affection'?'已折算好感度（旧记录）':i.id==='hero-component-choice'?'当前代专武箱子（原记录）':i.name;
  return `<label><span class="inventory-field-title">${artIcon(i)}<span>${esc(name)}</span></span><div class="inventory-input"><input data-stock="${i.id}" aria-label="${esc(i.name)}库存" type="number" min="0" step="${i.inventoryScale?'0.0001':i.unit==='小时'?'any':'1'}" placeholder="未记录" value="${inventoryDisplayQuantity(i,inventory[i.id])??''}"><span>${i.id==='affection'?'点':inventoryUnit(i)}</span></div>${i.affinityPoints?`<small>每个 ${i.affinityPoints}点 · ${price?money(price.value/i.priceScale)+'/个':'价格待补'}</small>`:''}${i.acquisition?`<small>${esc(i.acquisition)}</small><details class="inventory-box-details"><summary>奖励概率与期望</summary><ul>${i.valuation.outcomes.map(o=>{const reward=allItems.find(x=>x.id===o.itemId);return `<li>${esc(reward?.name||o.itemId)} × ${fmt(o.quantity,6)}${esc(reward?.unit||'个')} · ${fmt(o.probability*100,3)}%</li>`;}).join('')}</ul><small>${getPrice(i,stage)?'每箱期望参考价值 '+money(getPrice(i,stage).value/i.priceScale):'有奖励尚未定价，完整箱价待补。'}</small></details>`:''}</label>`;
 }).join('')}</div>`;
 return [...groups].map(([name,list])=>`<section class="inventory-category"><h3>${esc(name)}</h3>${name==='专家'?['好感度礼物','专家印记','技能材料'].map(sub=>{
  const rows=list.filter(i=>subgroup(i)===sub);
  return rows.length?`<section class="inventory-subgroup"><h4>${sub}</h4>${sub==='好感度礼物'?'<div id="expert-affinity-summary">'+affinitySummary(inventory,fmt)+'</div>':''}${fields(rows)}${sub==='专家印记'?'<p class="hint">专属印记仅供对应专家使用；通用印记单独保存。</p>':''}</section>`:'';
 }).join(''):fields(list)}</section>`).join('')||'<p class="hint">没有匹配的材料。</p>';
}
export function affinitySummary(inventory,fmt){const total=expertAffinityTotal(inventory);return `<strong>专家好感度合计：${total.recorded?fmt(total.points)+'点':'未记录'}</strong><p class="hint">指南针10点、炙热之心100点、征服之帆1000点。${total.complete?'':'部分礼物未记录，当前显示已记录合计。'}${Object.hasOwn(inventory,'affection')?'包含旧好感度记录，请勿将同一批礼物重复填入旧记录。':''}</p>`;}
