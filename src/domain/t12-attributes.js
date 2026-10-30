// T12 source percentages are stored as hundredths of a percentage point.
// Capacity is a troop count and must not be divided by 100.
export function normalizeT12Attributes(path){
 if(!path.id.startsWith('t12-'))return path;
 const group=Number(path.id.match(/^t12-g(\d+)-/)?.[1]),instant=group>=1&&(group-1)%20<6;
 const normalize=row=>{
  const sourceEffect=row.sourceEffect??row.effect??'';
  const attributes=[];
  const capacity=sourceEffect.match(/出征部队容量\s*\+\s*(\d+(?:\.\d+)?)/);
  if(capacity)attributes.push({key:'t12.capacity',name:'出征部队容量',value:Number(capacity[1]),unit:'人'});
  const troops={'盾兵':'infantry','矛兵':'lancer','射手':'marksman','弓兵':'marksman'};
  const stats={'攻击力':'attack','防御力':'defense','生命值':'health','杀伤力':'lethality','穿透力':'lethality'};
  const effect=sourceEffect.replace(/杀伤力/g,'穿透力').replace(/(盾兵|矛兵|射手|弓兵)(攻击力|防御力|生命值|穿透力)\s*\+\s*(\d+(?:\.\d+)?)/g,(_,troop,stat,raw)=>{
   const value=Number(raw)/100,key=`t12.${troops[troop]}.${stats[stat]}`;
   if(!attributes.some(a=>a.key===key))attributes.push({key,name:troop+stat,value,unit:'%'});
   return `${troop}${stat}+${value}%`;
  });
  return {...row,sourceEffect,effect,attributes,...(instant?{sourceTimeHours:Object.hasOwn(row,'sourceTimeHours')?row.sourceTimeHours:row.timeHours,timeHours:0}: {})};
 };
 const rows=path.rows.map(normalize),identities=new Map(rows.flatMap(r=>r.attributes).map(a=>[a.key,a]));
 return {...path,rows,baseline:{...path.baseline,attributes:[...identities.values()].map(a=>({...a,value:0}))},...(instant?{timeMode:'instant',prerequisiteNote:'维护者实机确认：顶部五项装备与兵种解锁无需研究加速（0小时），钢材、精炼火晶、火晶微粒等材料照常计算；开放前置另核对。'}:{}),coverage:path.coverage.replace('效果按原文展示','百分比属性按原始值÷100；容量按人数'),attributeSource:'用户校正：T12属性原值100＝1%，容量不换算'};
}
