import notes from '../data/growth-notes.json' with {type:'json'};

export function growthNotes(systemId,esc){
 return notes.entries.filter(e=>e.systems.includes(systemId)).map(e=>`<section class="card growth-notes"><div class="section-heading"><h2>${esc(e.title)}</h2><span class="pill green">资料核对 ${notes.asOf}</span></div><ul>${e.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><div class="growth-source"><a href="${esc(e.url)}" target="_blank" rel="noreferrer">${esc(e.source)} ↗</a><p class="hint">${esc(e.status)}</p></div></section>`).join('');
}

export function coverageTable(data,esc){
 const gaps={'chief-gear':'套装推算档位待更多实机核对，未自动优化材料兑换。','chief-gems':'兑换规则已录入，未自动执行兑换。','hero-gear':'12件橙装共用曲线，红装基础按维护者公式；赋能额外属性与专属装备路线待补。',research:'普通战斗科技满级属性已由维护者确认国服一致；两处工期待补。发展科技不在本轮范围。',t11:'逐级属性效果与完整研究前置链。',t12:'研究前置链、部分档位工期及非数值效果；百分比已按100＝1%换算。',experts:'关系突破的属性边界和技能效果结构化。',buildings:'火晶建筑完整配方、工期和战斗属性。',pets:'洗炼采用用户蓝石粗估，金石按蓝石×8，不考虑概率；宠物技能未并入升级属性。'};
 return `<section class="card"><div class="section-heading"><h2>提升规划 · 资料覆盖</h2><span class="pill">更新 ${esc(data.asOf)}</span></div><div class="table-scroll"><table><thead><tr><th>系统</th><th>可测材料路径／全部</th><th>已录入档位</th><th>仍需补齐</th></tr></thead><tbody>${data.systems.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.paths.filter(p=>p.costStatus==='available').length} / ${s.paths.length}</td><td>${s.paths.reduce((n,p)=>n+p.rows.length,0).toLocaleString('zh-CN')}</td><td class="coverage-note">${esc(gaps[s.id]||'具体解锁与前置以账号为准。')}</td></tr>`).join('')}</tbody></table></div><p class="hint">可测材料不等于完整现金成本；尚未定价的资源、未核对的属性和前置仍会在各路径提示。</p></section>`;
}
