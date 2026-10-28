import notes from '../data/growth-notes.json' with {type:'json'};

export function growthNotes(systemId,esc){
 return notes.entries.filter(e=>e.systems.includes(systemId)).map(e=>`<section class="card growth-notes"><div class="section-heading"><h2>${esc(e.title)}</h2><span class="pill green">资料核对 ${notes.asOf}</span></div><ul>${e.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><div class="growth-source"><a href="${esc(e.url)}" target="_blank" rel="noreferrer">${esc(e.source)} ↗</a><p class="hint">${esc(e.status)}</p></div></section>`).join('');
}

export function coverageTable(data,esc){
 const gaps={'chief-gear':'套装加成、升级前置与解锁条件。','chief-gems':'材料交换与具体等级的解锁条件。','hero-gear':'精确槽位属性、强化与专精联算、专属装备路线。',research:'国服数值核验、两处工期、少量前置名称及前置连锁；发展科技完整树。',t11:'逐级属性效果与完整研究前置链。',t12:'研究前置链、部分档位工期与效果结构化。',experts:'关系突破的属性边界和技能效果结构化。',buildings:'火晶建筑完整配方、工期和战斗属性。',pets:'洗炼概率、技能、开启条件与属性生效范围。'};
 return `<section class="card"><div class="section-heading"><h2>提升规划 · 资料覆盖</h2><span class="pill">更新 ${esc(data.asOf)}</span></div><div class="table-scroll"><table><thead><tr><th>系统</th><th>可测材料路径／全部</th><th>已录入档位</th><th>仍需补齐</th></tr></thead><tbody>${data.systems.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.paths.filter(p=>p.costStatus==='available').length} / ${s.paths.length}</td><td>${s.paths.reduce((n,p)=>n+p.rows.length,0).toLocaleString('zh-CN')}</td><td class="coverage-note">${esc(gaps[s.id]||'具体解锁与前置以账号为准。')}</td></tr>`).join('')}</tbody></table></div><p class="hint">可测材料不等于完整现金成本；尚未定价的资源、未核对的属性和前置仍会在各路径提示。</p></section>`;
}
