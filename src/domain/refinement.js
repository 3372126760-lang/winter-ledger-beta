export const DEFAULT_REFINEMENT_METHOD='1+6';
export const REFINEMENT_TIERS=[
  {from:1,to:20,cost:20,outcomes:[[1,.65],[2,.25],[3,.10]]},
  {from:21,to:40,cost:50,outcomes:[[2,.85],[3,.15]]},
  {from:41,to:60,cost:100,outcomes:[[3,.85],[4,.125],[5,.02],[6,.005]]},
  {from:61,to:80,cost:130,outcomes:[[3,.75],[4,.15],[5,.05],[6,.03],[7,.01],[8,.005],[9,.005]]},
  {from:81,to:100,cost:160,outcomes:[[3,.70],[4,.12],[5,.09],[6,.04],[7,.015],[8,.01],[9,.01],[10,.005],[11,.005],[12,.005]]},
];
export const tierExpectation=tier=>tier.outcomes.reduce((sum,[quantity,p])=>sum+quantity*p,0);

export function parseRefinementMethod(input) {
  if(typeof input!=='string'||input.length>100)throw new Error('请输入精炼方式，例如22+6');
  const text=input.trim().replace(/＋/g,'+').replace(/，/g,',');
  let days;
  if(/^\d+\s*\+\s*\d+$/.test(text)){
    const [first,tail]=text.split('+').map(Number);
    if(tail>6)throw new Error('+后只能填0—6天，每天精炼一次');
    days=[first,...Array.from({length:6},(_,i)=>i<tail?1:0)];
  }else if(/^\d+$/.test(text))days=[Number(text),0,0,0,0,0,0];
  else if(/^\d+(?:\s*,\s*\d+){6}$/.test(text))days=text.split(',').map(Number);
  else throw new Error('使用N+6，或用逗号填写7天的精炼次数');
  if(days.some(n=>!Number.isInteger(n)||n<0||n>100))throw new Error('每日次数需为0—100的整数');
  const count=days.reduce((s,n)=>s+n,0);
  if(count<1||count>100)throw new Error('截图覆盖每周第1—100次，请将周总次数设在1—100之间');
  return days;
}

export function calculateRefinement(method,firePrice=null) {
  if(firePrice!==null&&(!Number.isFinite(firePrice)||firePrice<0))throw new Error('火晶价格无效');
  const schedule=parseRefinementMethod(method),days=[],buckets=REFINEMENT_TIERS.map(t=>({...t,count:0,halfCount:0,fireCost:0,expectedOutput:0}));
  let weeklyCount=0,totalFire=0,totalOutput=0,fullCost=0;
  schedule.forEach((count,index)=>{
    const day={day:index+1,count,first:count?weeklyCount+1:null,last:null,fireCost:0,expectedOutput:0,discount:0,draws:[]};
    for(let j=0;j<count;j++){
      weeklyCount++;
      const k=REFINEMENT_TIERS.findIndex(t=>weeklyCount>=t.from&&weeklyCount<=t.to),tier=REFINEMENT_TIERS[k];
      const half=j===0,cost=tier.cost*(half?.5:1),expected=tierExpectation(tier);
      day.draws.push({weeklyIndex:weeklyCount,tierIndex:k,half,cost,expectedOutput:expected});
      day.fireCost+=cost;day.expectedOutput+=expected;day.discount+=tier.cost-cost;
      const bucket=buckets[k];bucket.count++;bucket.halfCount+=Number(half);bucket.fireCost+=cost;bucket.expectedOutput+=expected;
      totalFire+=cost;totalOutput+=expected;fullCost+=tier.cost;
    }
    if(count)day.last=weeklyCount;days.push(day);
  });
  return {method,schedule,days,buckets,weeklyCount,totalFire,totalOutput,discount:fullCost-totalFire,
    firePerRefined:totalFire/totalOutput,totalMoney:firePrice===null?null:totalFire*firePrice,
    unitPrice:firePrice===null?null:totalFire*firePrice/totalOutput};
}
