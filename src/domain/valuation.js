// Renewal-cycle average: each legendary drop resets the counter; draw N is guaranteed.
export function selectedChoiceItem(item,choices={}) {
  if(item.valuation?.type!=='choice')return item;
  const selected=item.valuation.contents.find(c=>c.itemId===choices[item.id]);
  return selected?{...item,valuation:{...item.valuation,type:'fixed',contents:[selected]}}:item;
}
export function pityDistribution(outcomes, guaranteedItemId, limit) {
  if(!Number.isInteger(limit)||limit<1)throw new Error('保底次数无效');
  if(outcomes.some(o=>!Number.isFinite(o.probability)||o.probability<0)||Math.abs(outcomes.reduce((s,o)=>s+o.probability,0)-1)>1e-9)throw new Error('概率合计必须为100%');
  const hits=outcomes.filter(o=>o.itemId===guaranteedItemId);
  if(hits.length!==1)throw new Error('保底奖励必须唯一');
  const p=hits[0].probability;
  let cycleLength=0,survival=1;
  for(let i=0;i<limit;i++){cycleLength+=survival;survival*=1-p;}
  const rate=1/cycleLength;
  return {cycleLength,guaranteedRate:rate,outcomes:outcomes.map(o=>({...o,baseProbability:o.probability,
    probability:o.itemId===guaranteedItemId?rate:p===1?0:o.probability/(1-p)*(1-rate)}))};
}

export function expectedContents(rule) {
  if(rule.type==='unresolved'||rule.type==='choice')return {blocked:rule.note,components:[]};
  if(rule.type==='fixed')return {components:rule.contents.map(o=>({...o,probability:1,expectedQuantity:o.quantity}))};
  let outcomes=rule.outcomes,cycle;
  if(rule.type==='pity'){
    cycle=pityDistribution(outcomes,rule.guaranteedItemId,rule.limit);outcomes=cycle.outcomes;
  }else if(rule.type==='random'){
    if(outcomes.some(o=>!Number.isFinite(o.probability)||o.probability<0)||Math.abs(outcomes.reduce((s,o)=>s+o.probability,0)-1)>1e-9)throw new Error('概率合计必须为100%');
  }else throw new Error('未知宝箱规则');
  return {components:outcomes.map(o=>({...o,expectedQuantity:o.quantity*o.probability})),cycle};
}

export function valueContents(item,stage,items,resolve,seen=new Set()) {
  if(seen.has(item.id))return {blocked:'材料估值出现循环依赖',components:[]};
  if(item.valuation.type==='residual')return residualValue(item,stage,items,resolve,new Set([...seen,item.id]));
  const nextSeen=new Set([...seen,item.id]),summary=expectedContents(item.valuation);
  if(summary.blocked)return summary;
  let value=0;const missing=[];
  const components=summary.components.map(c=>{
    if(!Number.isFinite(c.quantity)||c.quantity<0)throw new Error('宝箱奖励数量无效');
    const dependency=items.find(i=>i.id===c.itemId),price=dependency?resolve(dependency,stage,nextSeen):null;
    const subtotal=price?c.expectedQuantity*price.value/dependency.priceScale:null;
    if(c.expectedQuantity>0&&subtotal===null)missing.push(dependency?.name||c.itemId);
    value+=subtotal||0;return {...c,name:dependency?.name||c.itemId,price,priceScale:dependency?.priceScale,subtotal};
  });
  return {...summary,components,missing,value:missing.length?null:value,partialValue:value};
}

function residualValue(item,stage,items,resolve,seen) {
  const rule=item.valuation,summary=expectedContents(rule.distribution);
  const box=items.find(i=>i.id===rule.boxItemId),boxPrice=box?resolve(box,stage,seen):null;
  const missing=boxPrice?[]:[box?.name||rule.boxItemId];
  const targets=summary.components.filter(c=>c.itemId===item.id);
  if(targets.length!==1||targets[0].expectedQuantity<=0)return {blocked:'反推目标的期望数量无效',components:[]};
  let otherValue=0;
  const components=summary.components.map(c=>{
    const dependency=items.find(i=>i.id===c.itemId);
    if(c.itemId===item.id)return {...c,name:item.name,subtotal:null};
    const price=dependency?resolve(dependency,stage,seen):null;
    const subtotal=price?c.expectedQuantity*price.value/dependency.priceScale:null;
    if(c.expectedQuantity>0&&subtotal===null)missing.push(dependency?.name||c.itemId);
    otherValue+=subtotal||0;
    return {...c,name:dependency?.name||c.itemId,price,subtotal};
  });
  const boxValue=boxPrice?boxPrice.value/box.priceScale:null;
  const residual=missing.length?null:boxValue-otherValue;
  if(residual!==null&&residual<0)return {...summary,blocked:'箱价低于蓝装紫装的期望价值，请核对基础单价',components,missing};
  const value=residual===null?null:residual/targets[0].expectedQuantity;
  if(value!==null)components.find(c=>c.itemId===item.id).subtotal=residual;
  return {...summary,components,missing,value,boxValue,boxPrice,otherValue,targetExpectedQuantity:targets[0].expectedQuantity};
}
