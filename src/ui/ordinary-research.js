export function ordinaryResearchPaths(system,path){
 return system.paths.filter(p=>p.researchTree===path.researchTree&&p.researchTier===path.researchTier);
}

export function ordinaryResearchControls(system,path,{esc,options}){
 const tiers=[...new Set(system.paths.filter(p=>p.researchTree===path.researchTree).map(p=>p.researchTier))].sort((a,b)=>a-b);
 return `<div class="form-grid ordinary-research-filters"><label>科技类别<select id="research-tree" aria-label="科技类别">${options([['battle','战斗科技 · 完整1—6阶段'],['growth','发展科技 · 旧资料']],path.researchTree)}</select></label><label>科技阶段<select id="research-tier" aria-label="科技阶段">${options(tiers.map(t=>[String(t),`第${t}阶段`]),String(path.researchTier))}</select></label></div>${path.researchTree==='battle'?`<p class="hint" id="ordinary-stage-note">当前第${path.researchTier}阶段 · 17类战斗科技。名称后的数字表示科技阶段；当前／目标等级是该阶段内的研究等级。</p>`:'<p class="hint">发展科技仍为原有部分资料，完整树待补。</p>'}`;
}

export function ordinaryResearchDetails(path,from,to,{esc,fmt}){
 if(path.researchTree!=='battle')return '';
 const attribute=path.rows[0].attributes[0];
 const time=r=>r.timeHours===null?'待核对':r.timeHours<1?fmt(r.timeHours*60,2)+' 分钟':fmt(r.timeHours,2)+' 小时';
 return `<details class="research-level-details"><summary>查看本阶段全部等级、消耗和前置</summary><p class="hint">${esc(path.englishName)} · 每一级的属性增量逐级累加为本阶段累计。绿色行属于本次所选升级区间。</p><div class="table-scroll"><table><thead><tr><th>研究等级</th><th>钢材</th><th>其他资源</th><th>基础工期</th><th>本级新增</th><th>本阶段累计</th></tr></thead><tbody>${path.rows.map(r=>`<tr class="${r.level>from&&r.level<=to?'research-selected':''}"><td>${r.level}级</td><td>${fmt(r.cost.steel,0)}</td><td>${Object.entries(r.resources).map(([name,quantity])=>`<small>${esc(name)} ${fmt(quantity,0)}</small>`).join('')}</td><td>${time(r)}${r.timeHours===null?`<small>原文：${esc(r.timeRaw)}</small>`:''}</td><td>+${fmt(r.attributeDelta,4)}${esc(attribute.unit)}</td><td>${fmt(r.attributes[0].value,4)}${esc(attribute.unit)}</td></tr>`).join('')}</tbody></table></div><h4>解锁条件</h4><p class="hint">按国服确认：图中前置科技各达到1级，即可解锁本科技并在本阶段内升到最高级；不要求前置同步升满。建筑条件另行核对。肉木煤铁只记录数量，不计价。</p></details>`;
}
