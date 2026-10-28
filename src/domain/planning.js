import {getPrice} from './model.js';
import {FIRE_PROGRESS,migrateFireProgress} from './stages.js';
import {validateChiefSelection} from './chief-loadout.js';

const DEFAULT_PLANNING={systemId:'chief-gems',pathId:'',from:0,to:1,pieces:1};
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const quantity=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e12;

export function validatePlanningState(value){
  if(value===undefined)return {...DEFAULT_PLANNING};
  const fail=()=>{throw new Error('提升规划记录格式不符');};
  if(!value||typeof value!=='object'||Array.isArray(value))fail();
  const text=(v,empty=false)=>typeof v==='string'&&v.length<=(empty?180:80)&&(empty||v.trim().length>0)&&!/[\u0000-\u001f]/.test(v);
  if(!text(value.systemId)||!text(value.pathId,true))fail();
  if(![value.from,value.to,value.pieces].every(Number.isInteger)||value.from<0||value.to<=value.from||value.to>10000||value.pieces<1||value.pieces>18)fail();
  const chiefSelection=validateChiefSelection(value.chiefSelection,value.systemId);
  if(chiefSelection&&value.pieces!==1)fail();
  if(value.technologyTroop!==undefined&&(value.systemId!=='t11'||!['infantry','lancer','marksman'].includes(value.technologyTroop)))fail();
  return {systemId:value.systemId,pathId:value.pathId,from:value.from,to:value.to,pieces:value.pieces,...(chiefSelection?{chiefSelection}:{}),...(value.technologyTroop?{technologyTroop:value.technologyTroop}:{})};
}

export function planningAvailability(systemId,progress={}){
  if(systemId==='experts'&&(!Number.isInteger(progress.heroGeneration)||progress.heroGeneration<3))return {
    available:false,preview:true,status:'locked',reason:'专家三代英雄起开放；当前可先查阅规划资料。',
  };
  if(systemId==='t11'){
    const rank=FIRE_PROGRESS.findIndex(p=>p.id===migrateFireProgress(progress.fireProgress));
    const required=FIRE_PROGRESS.findIndex(p=>p.id==='t11');
    if(rank<required)return {available:false,preview:true,status:'locked',reason:'T11科技需达到战争学院进度；当前可先查阅材料。'};
  }
  if(systemId==='t12')return {
    available:true,preview:true,status:'confirmation-required',reason:'需确认账号已开放T12科技；英雄代数和道具价格大类不能代替实际解锁条件。',
  };
  return {available:true,preview:false,status:'available',reason:'具体建筑、技能和升级前置仍以游戏内账号为准。'};
}

function attributeMap(node){
  const map=new Map();
  for(const a of node?.attributes||[]){
    if(!a||typeof a.key!=='string'||typeof a.name!=='string'||!Number.isFinite(a.value)||typeof a.unit!=='string')continue;
    map.set(`${a.key}\u0000${a.unit}`,a);
  }
  return map;
}

// Costs belong to the step entering each listed level. A listed checkpoint is
// allowed only as a whole interval; no interpolation of unlisted levels occurs.
export function calculatePlan(path,from,to,pieces,context={}){
  if(!path||!Array.isArray(path.rows)||!path.rows.length)throw new Error('该路径尚无可计算的升级数据');
  const maxPieces=path.maxPieces??1;
  if(![from,to,pieces,maxPieces].every(Number.isInteger)||from<0||to<=from||to>10000||pieces<1||pieces>maxPieces||maxPieces<1||maxPieces>18)throw new Error('请选择有效的当前等级、递增目标和升级数量');
  const rows=[...path.rows].sort((a,b)=>a.level-b.level);
  if(rows.some((r,index)=>!Number.isInteger(r.level)||r.level<0||r.level>10000||(index>0&&rows[index-1].level===r.level)))throw new Error('升级资料档位重复或无效');
  const before=rows.find(r=>r.level===from)||(path.baseline?.level===from?path.baseline:null);
  const after=rows.find(r=>r.level===to);
  if(!before||!after)throw new Error('只能选择资料已收录的档位，暂不估算缺失等级');
  // Unknown checkpoint totals must remain a target-row lookup, never a sum of
  // presumed incremental upgrades or a subtraction of uncertain totals.
  const selected=path.costMode==='checkpoint'?[after]:rows.filter(r=>r.level>from&&r.level<=to);
  if(!selected.length)throw new Error('这两个档位之间没有升级数据');
  const totals=new Map(),resourceTotals=new Map();let timeHours=0,timeKnown=true;
  for(const row of selected){
    for(const [id,amount] of Object.entries(row.cost||{})){
      if(!id||!quantity(amount))throw new Error('升级材料数量无效');
      const total=(totals.get(id)||0)+amount*pieces;
      if(!quantity(total))throw new Error('升级材料数量超过支持范围');
      if(total>0)totals.set(id,total);
    }
    for(const [name,amount] of Object.entries(row.resources||{})){
      if(!name||!quantity(amount))throw new Error('升级资源数量无效');
      const total=(resourceTotals.get(name)||0)+amount*pieces;
      if(!quantity(total))throw new Error('升级资源数量超过支持范围');
      if(total>0)resourceTotals.set(name,total);
    }
    if(row.timeHours===undefined||row.timeHours===null)timeKnown=false;
    else if(!quantity(row.timeHours))throw new Error('升级时间资料无效');
    else timeHours+=row.timeHours*pieces;
  }
  // 学习经验以秒计；换算为小时加速，与库存和现行单价一起核算。
  const learningSeconds=resourceTotals.get('专家技能经验')||0;
  if(learningSeconds){totals.set('speed-learning',(totals.get('speed-learning')||0)+learningSeconds/3600);resourceTotals.delete('专家技能经验');}
  const items=context.items||[],inventory=context.inventory||{};
  const materials=[...totals].map(([itemId,needed])=>{
    const item=items.find(i=>i.id===itemId);
    const stock=own(inventory,itemId)?inventory[itemId]:null;
    if(stock!==null&&!quantity(stock))throw new Error('库存数量无效');
    const owned=stock,gap=Math.max(0,needed-(owned??0));
    const price=item?getPrice(item,context.stage,{},false,items,new Set(),{
      progress:context.progress,refinementMethod:context.refinementMethod,boxChoices:context.boxChoices,
    }):null;
    const scale=item?.priceScale;
    const priced=price&&Number.isFinite(price.value)&&Number.isFinite(scale)&&scale>0;
    return {itemId,name:item?.name||itemId,needed,owned,gap,price:priced?price:null,
      value:priced?needed*price.value/scale:null,gapValue:priced?gap*price.value/scale:null};
  });
  const freeResources=new Set(['生肉','肉','木材','木','煤矿','煤','铁矿','铁']);
  const resources=[...resourceTotals].map(([name,quantity])=>({name,quantity,excludedFromPricing:freeResources.has(name)}));
  const a=attributeMap(before),b=attributeMap(after),keys=new Set([...a.keys(),...b.keys()]);
  const attributes=[...keys].map(key=>{
    const start=a.get(key),end=b.get(key),identity=end||start;
    return {key:identity.key,name:identity.name,before:start?.value??null,after:end?.value??null,
      delta:start&&end?end.value-start.value:null,unit:identity.unit};
  });
  const missingPrices=materials.filter(m=>!m.price).map(m=>m.name);
  const unpricedResources=resources.filter(r=>!r.excludedFromPricing);
  const priceComplete=missingPrices.length===0&&unpricedResources.length===0;
  const inventoryComplete=materials.every(m=>m.owned!==null);
  const partialValue=materials.reduce((sum,m)=>sum+(m.value??0),0);
  const knownGapValue=materials.reduce((sum,m)=>sum+(m.gapValue??0),0);
  const warnings=[];
  if(path.costMode==='checkpoint')warnings.push('仅展示目标档位的原表材料数量，不代表从当前等级升到目标的消耗；未对不明累计值求和或相减。');
  if(path.costStatus!=='available')warnings.push('该路径的消耗口径仍待核对，结果仅供查阅。');
  if(missingPrices.length)warnings.push(`尚缺材料单价：${missingPrices.join('、')}。`);
  if(unpricedResources.length)warnings.push(`尚未定价的资源：${unpricedResources.map(r=>r.name).join('、')}；当前金额未含这些消耗。`);
  if(learningSeconds)warnings.push(`专家技能经验 ${learningSeconds} 点＝${learningSeconds} 秒学习加速，按1小时加速单价折算。`);
  if(!inventoryComplete)warnings.push('部分材料库存未记录；这些材料的缺口暂按没有库存计算。');
  if(!timeKnown)warnings.push('部分档位未提供升级时间。');
  if(!attributes.length||attributes.some(a=>a.delta===null))warnings.push('战斗属性尚未完整结构化，不能据此比较各系统的属性收益。');
  if(path.researchTree==='battle')warnings.push('普通科技：连线前置各达到1级后可解锁，并可升满本阶段。此处仅计所选科技，尚未加入前置消耗。');
  else if(path.prerequisiteNote)warnings.push(path.prerequisiteNote);
  return {materials,resources,timeHours:timeKnown?timeHours:null,attributes,
    effects:{before:path.researchTree==='battle'?(before.effect||'').split('前置：')[0]:before.effect||'',after:path.researchTree==='battle'?(after.effect||'').split('前置：')[0]:after.effect||''},
    fullValue:priceComplete?partialValue:null,partialValue,knownGapValue,missingPrices,
    inventoryComplete,priceComplete,ready:path.costStatus==='available'&&priceComplete,warnings};
}
