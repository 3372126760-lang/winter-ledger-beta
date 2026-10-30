import requirements from '../data/expert-requirements.json' with {type:'json'};

export function expertSkillRequirementAt(skill,level){
 if(!Number.isInteger(level)||level<1||level>skill.maxLevel)return null;
 return {
  affinityLevel:Math.max(skill.unlockAffinityLevel,...skill.affinityRequirements.filter(r=>r.level<=level).map(r=>r.affinityLevel)),
  totalSkillLevel:Math.max(0,...skill.totalSkillRequirements.filter(r=>r.level<=level).map(r=>r.totalSkillLevel))
 };
}

export function expertSkillRequirementsView(expert,skill,profile,currentOnly,esc){
 const record=requirements.experts[expert.id],rule=record?.skills.find(s=>s.pathId===skill.pathId);
 if(!rule)return '<p class="hint">技能解锁条件待补。</p>';
 const current=profile.levels[skill.pathId],target=profile.planned[skill.pathId];
 const requested=!currentOnly&&Number.isInteger(target)&&target>0&&target<=rule.maxLevel?target:Number.isInteger(current)&&current>=0?Math.min(current+1,rule.maxLevel):1;
 const at=expertSkillRequirementAt(rule,requested);
 const known=record.skills.map(s=>profile.levels[s.pathId]);
 const advancement=profile.levels[`expert-${expert.id}-advancement`];
 const total=known.every(n=>Number.isInteger(n)&&n>=0)?known.reduce((a,b)=>a+b,0):null;
 const describe=r=>[r.affinityLevel===1?'结识专家':`好感度${r.affinityLevel}级并完成对应关系进阶`,...(r.totalSkillLevel?[`升级前四项技能总等级≥${r.totalSkillLevel}`]:[])].join('；');
 const rows=[...new Set([1,...rule.affinityRequirements.map(r=>r.level),...rule.totalSkillRequirements.map(r=>r.level)])].sort((a,b)=>a-b);
 return `<div class="expert-requirements"><p><b>解锁：</b>${rule.unlockAffinityLevel===1?'结识后':`好感度${rule.unlockAffinityLevel}级 · 对应关系进阶`}</p><p><b>${!currentOnly&&target>0?'目标':'查看'}${requested}级前置：</b>${esc(describe(at))}</p><details><summary>全部升级门槛 · 参考</summary><p class="hint">门槛从对应技能等级起持续生效。技能总等级包含本技能升级前等级，不含天赋及其他专家。</p><table><thead><tr><th>技能等级起</th><th>前置条件</th></tr></thead><tbody>${rows.map(n=>`<tr><td>${n}级</td><td>${esc(describe(expertSkillRequirementAt(rule,n)))}</td></tr>`).join('')}</tbody></table><p class="hint">当前记录：好感度${profile.levels[record.levelPath]??'未记录'}；已完成关系进阶${advancement===undefined?'未记录':advancement+'次'}；四项技能总等级${total??'记录不全'}。已填0级代表未解锁。</p><a href="${requirements.source}" target="_blank" rel="noreferrer">前置资料来源 ↗</a><p class="hint">${requirements.status}</p></details></div>`;
}

export function expertResearchReferenceView(expert,esc){
 const examples={
  '凯西':{url:'https://wosheroes.com/experts/kathy/',text:'凯西社区研究表：3条研究路径，每条200次、每次10印记，合计6000印记；每20次列一个属性节点。'},
  '加雷斯':{url:'https://wosheroes.com/experts/gareth/',text:'加雷斯社区研究表：两套研究树，共6条路径、1200次研究。第一套每次10印记，第二套每次20印记，合计18000印记。'}
 };
 const sample=examples[expert.id];
 return `<section class="expert-research-reference"><h3>专家研究 · 资料覆盖</h3><p>好感度达到100级，并解锁“莫逆于心”阶段后开放，消耗专家印记提升技艺等级。</p><a href="https://wjdrgl.wjdr.cn/faq/faq/" target="_blank" rel="noreferrer">国服官方解锁说明 ↗</a><p>${sample?esc(sample.text):'该专家的研究逐级消耗与各属性节点尚未完整核对。'}</p>${sample?`<a href="${sample.url}" target="_blank" rel="noreferrer">查看研究表（国际服社区参考） ↗</a>`:''}${expert.id==='加雷斯'?`<p>玩家录像已核对：9:54画面单次研究消耗10印记；10:27画面单次消耗20印记，该页100→101次时矛兵穿透力由5%→5.05%。目前仅确认这些画面，不推算整棵树。</p><a href="https://www.youtube.com/watch?v=mhT-vKoTjJQ&t=627s" target="_blank" rel="noreferrer">查看玩家研究录像 · 10:27 ↗</a>`:''}<p class="hint">当前仅展示资料，不录入研究等级，也不将参考印记或研究属性计入规划与战斗合计。</p></section>`;
}
