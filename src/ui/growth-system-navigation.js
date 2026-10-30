export function growthSystemEntries(data){
 return data.systems.flatMap(s=>{
  const count=s.paths.filter(p=>p.costStatus==='available').length;
  const description=count?`${count} 条材料测算${s.paths.length>count?` · ${s.paths.length-count} 条预览`:'路径'}`:s.paths.length?`${s.paths.length} 条资料预览`:'待补升级数据';
  return s.id==='pets'?[{id:s.id,name:'宠物升级',petSection:'upgrade',description},{id:s.id,name:'宠物洗练',petSection:'refinement',description:'六项词条 · 突破解锁品质'}]:[{id:s.id,name:s.name,description}];
 });
}

export function growthSystemNavigation(data,selected,esc,{mode='planning'}={}){
 const petSection=selected.petSection||'upgrade';
 return `<div class="planning-systems" role="group" aria-label="${mode==='current'?'选择当前养成系统':'选择提升系统'}">${growthSystemEntries(data).map(entry=>{
  const active=entry.id===selected.systemId&&(!entry.petSection||entry.petSection===petSection);
  return `<button type="button" class="planning-system ${active?'selected':''}" data-${mode==='current'?'account':'planning'}-system="${esc(entry.id)}" ${entry.petSection?`data-pet-section="${entry.petSection}"`:''} aria-pressed="${active}"><strong>${esc(entry.name)}</strong><span>${esc(entry.description)}</span></button>`;
 }).join('')}</div>`;
}
