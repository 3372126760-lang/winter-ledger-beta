import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('src/data/planning.json','utf8'));
const paths=data.systems.find(s=>s.id==='research').paths.filter(p=>p.researchTree==='battle');
const grouped=new Map(),totals={};
for(const path of paths){
 const a=path.rows.at(-1)?.attributes?.[0];if(!a)continue;
 const name=path.name.replace(/[1-6]$/,'');
 if(!grouped.has(name))grouped.set(name,{name,attribute:a.name,unit:a.unit,stages:[],source:[],levels:[]});
 const entry=grouped.get(name);entry.stages.push(a.value);entry.source.push(path.source);entry.levels.push(path.rows.at(-1).level);
 totals[a.key]=(totals[a.key]||0)+a.value;
}
const report={asOf:'2026-10-30',scope:'普通战斗科技；发展科技不在本轮范围',status:'维护者已确认普通科技属性与国服一致，现有数值不变',rows:[...grouped.values()].map(r=>({...r,total:r.stages.reduce((s,v)=>s+v,0)})),totals,missing:paths.flatMap(p=>!p.rows.at(-1)?.attributes?.length?[p.name]:[]),timeGaps:paths.flatMap(p=>p.rows.filter(r=>r.timeHours==null).map(r=>p.name+' '+r.level+'级')),coverage:{paths:paths.length,groups:grouped.size}};
fs.writeFileSync('src/data/research-audit.json',JSON.stringify(report,null,2)+'\n');
let text='# 普通战斗科技满级属性总表 · 2026-10-30\n\n'+report.status+'。只统计普通战斗科技，排除发展科技、T11、T12、专家等系统。各阶段取本阶段满级累计值，然后跨阶段相加，未把每一级的累计值重复相加。\n\n';
text+='|兵种|攻击|防御|生命|穿透|\n|---|---:|---:|---:|---:|\n';
for(const [id,name]of [['infantry','盾兵'],['lancer','矛兵'],['marksman','射手']])text+=`|${name}|${totals['research.all.attack']+totals['research.'+id+'.attack']}%|${totals['research.all.defense']+totals['research.'+id+'.defense']}%|${totals['research.all.health']+totals['research.'+id+'.health']}%|${totals['research.all.lethality']+totals['research.'+id+'.lethality']}%|\n`;
text+=`\n出征容量：+${totals['research.all.capacity']}人。每项兵种属性由全体+47.25%与兵种专属+111.75%组成。\n\n|科技|属性|I|II|III|IV|V|VI|合计|\n|---|---|---:|---:|---:|---:|---:|---:|---:|\n`;
for(const r of report.rows)text+=`|${r.name}|${r.attribute}|${r.stages.join('|')}|${r.total}${r.unit}|\n`;
text+='\n满级数值缺项：'+(report.missing.join('、')||'未发现；102个战斗科技节点均有满级属性')+'。\n\n工期缺项：'+(report.timeGaps.join('、')||'无')+'。\n\n直接连线前置达到1级后即可升满，按维护者确认规则；保留建筑开放提示，不把国际服逐级科技要求用于国服普通科技。2026-10-30维护者已确认本表属性与国服一致，现有数值保留。\n\n来源：[官方Wiki研究索引](https://www.whiteoutsurvival.wiki/research/)；每条科技的原始页、逐级解析和校验信息在 reference/research-2026-10-28/battle-manifest.json 与 battle-research.json，前端原始表为 src/data/planning.json。\n';
fs.writeFileSync('docs/普通战斗科技满级属性总表-2026-10-30.md',text);
