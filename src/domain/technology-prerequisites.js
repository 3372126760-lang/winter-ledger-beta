// 科技等级条件与图中的连线分离。空白表格不推断成新的等级门槛。
export function technologyPrerequisites(manifest,node,target=1,levels={}){
 if(!node)return null;
 const index=Number(node.id.split('-').at(-1));
 let known=true,source='用户确认（国服）',building='',required=[];
 const byIndex=i=>manifest.nodes.find(n=>n.systemId===node.systemId&&n.troopId===node.troopId&&Number(n.id.split('-').at(-1))===i);
 const add=(n,min)=>{if(n)required.push({id:n.id,name:n.name,min,current:levels[n.id]??null});};
 const incoming=manifest.edges.filter(e=>e.to===node.id).map(e=>manifest.nodes.find(n=>n.id===e.from)).filter(Boolean);
 if(node.systemId==='research')incoming.forEach(n=>add(n,1));
 else if(node.systemId==='t11'){
  source='官方Wiki（国际服），国服待核对';
  if(index===0)building='战争学院火晶1';
  else if(index===1||index===2){add(byIndex(0),target>=5?5:target>=4?4:3);building=target>=8?'战争学院火晶5':target>=7?'战争学院火晶4':target>=5?'战争学院火晶3':target>=2?'战争学院火晶2':'';}
  else if(index===3){[1,2].forEach(i=>add(byIndex(i),target>=8?8:target>=7?7:6));building=target>=4?'战争学院火晶5':'战争学院火晶4';}
  else if(index===4||index===5){add(byIndex(index===4?1:2),target>=8?8:target>=7?7:6);building=target>=7?'战争学院火晶5':'战争学院火晶3';}
  else if(index===6){[3,4,5].forEach(i=>add(byIndex(i),byIndex(i).max));building='战争学院火晶5';}
  else {incoming.forEach(n=>add(n,1));building='战争学院火晶5';}
 }else if(node.systemId==='t12'){
  if(index===5)incoming.forEach(n=>add(n,n.max));
  else if(index===10){incoming.forEach(n=>add(n,target*5));building='战争学院火晶10';}
  else if(index===15){incoming.forEach(n=>add(n,target>=11?50:30));building='战争学院火晶10';source='官方Wiki（国际服），国服待核对';}
  else incoming.forEach(n=>add(n,1));
 }else return null;
 const state=!known?'待核对':required.some(r=>r.current!==null&&r.current<r.min)?'前置未达标':required.some(r=>r.current===null)?'前置等级未记录':'科技前置已满足';
 const text=required.length?required.map(r=>`${r.name} ≥ ${r.min}级（当前${r.current===null?'未记录':r.current+'级'}）`).join('；'):'无前置科技';
 return {required,known,state,building,source,text};
}
