export function technologyEffects(path,node,level,target,{esc}){
 const at=value=>path.rows.find(r=>r.level===value)||(path.baseline?.level===value?path.baseline:null);
 const before=level===null?null:at(level),after=target===null?null:at(target);
 const preview=before||after||path.rows[0];
 const format=a=>`${Number(a.value).toLocaleString('zh-CN',{maximumFractionDigits:4})}${a.unit}`;
 const keys=new Map([...(before?.attributes||[]),...(after?.attributes||[]),...(preview?.attributes||[])].map(a=>[a.key,a]));
 let content='';
 if(keys.size)content=`<table><thead><tr><th>属性</th><th>当前</th>${after?'<th>计划</th><th>提升</th>':''}</tr></thead><tbody>${[...keys.values()].map(a=>{
  const start=before?.attributes?.find(x=>x.key===a.key),end=after?.attributes?.find(x=>x.key===a.key);
  return `<tr><td>${esc(a.name)}</td><td>${start?esc(format(start)):'未记录'}</td>${after?`<td>${end?esc(format(end)):'待补'}</td><td>${start&&end?esc('+'+Number((end.value-start.value).toFixed(4))+(a.unit==='%'?'个百分点':a.unit)):'—'}</td>`:''}</tr>`;
 }).join('')}</tbody></table>${!before&&!after?`<p>1级效果预览：${esc((preview.attributes||[]).map(a=>a.name+' '+format(a)).join('；'))}</p>`:''}`;
 else content=`${before?`<p>当前 ${level}级：${esc(before.effect||(level===0?'尚未研究':'效果数值待补'))}</p>`:''}${after?`<p>计划 ${target}级：${esc(after.effect||'效果数值待补')}</p>`:''}${!before&&!after?`<p>${esc(preview?.effect?`1级效果预览：${preview.effect}`:`${node.name}：各级效果数值待补`)}</p>`:''}`;
 const prerequisite=node.systemId==='research'?null:(after||before)?.prerequisites;
 return `<div class="tech-editor-effects"><h4>科技效果</h4>${content}${prerequisite?`<small>前置：${esc(prerequisite)}</small>`:''}</div>`;
}
