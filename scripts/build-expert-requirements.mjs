import {readFile,writeFile} from 'node:fs/promises';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [upstream,board]=await Promise.all([read('reference/expert-requirements-2026-10-29/experts.json'),read('src/data/expert-board.json')]);
const source='https://github.com/chiefpansancolt/whiteout-survival-data/blob/main/data/chief/experts.json';
const result={asOf:'2026-10-29',source,status:'国际服社区整理；国服具体关系进阶与技能条件待实机逐项核对',experts:{}};
const advancement={asOf:'2026-10-29',source,experts:{}};
const relationNames=['泛泛之交Ⅰ','泛泛之交Ⅱ','泛泛之交Ⅲ','志趣相投Ⅰ','志趣相投Ⅱ','志趣相投Ⅲ','推心置腹Ⅰ','推心置腹Ⅱ','推心置腹Ⅲ','莫逆于心'];
let doc='# 专家技能解锁与升级条件\n\n2026-10-29整理，覆盖11位专家44项技能。来源：'+source+'。国际服社区参考，不等于国服实机全部核实。\n\n好感度等级需配合对应关系进阶；技能总等级指同一专家四项技能在升级前的等级之和，包含待升级技能的原等级，不含天赋、研究和其他专家。目标等级有材料测算不等于已满足前置，不自动连锁升级其他技能。\n';
for(const expert of board.experts){
 const original=upstream.find(e=>e.id===expert.slug);
 if(!original||original.skills.length!==expert.skills.length)throw new Error('专家技能映射缺失：'+expert.name);
 advancement.experts[expert.id]=original.affinityLevels.filter(r=>r.advancementCost!==undefined).map(r=>({afterLevel:r.level,mark:r.advancementCost,relation:relationNames[r.level/10-1]}));
 const skills=expert.skills.map((skill,i)=>{
  const row=original.skills[i];
  return {pathId:skill.pathId,name:skill.name,englishName:row.name,maxLevel:row.maxLevel,unlockAffinityLevel:row.unlockAffinityLevel,affinityRequirements:row.affinityRequirements||[],totalSkillRequirements:row.totalSkillRequirements||[]};
 });
 result.experts[expert.id]={name:expert.name,levelPath:expert.levelPath,skills};
 doc+='\n## '+expert.name+'\n\n| 技能 | 初次解锁 | 后续好感度门槛（技能级→好感度级） | 技能总等级门槛（技能级→升级前总级） |\n|---|---|---|---|\n';
 for(const skill of skills){
  doc+='| '+skill.name+' | '+(skill.unlockAffinityLevel===1?'结识后':skill.unlockAffinityLevel+'级')+' | '+(skill.affinityRequirements.filter(x=>x.level>1).map(x=>x.level+'→'+x.affinityLevel).join('、')||'—')+' | '+(skill.totalSkillRequirements.map(x=>x.level+'→'+x.totalSkillLevel).join('、')||'—')+' |\n';
 }
}
await writeFile(new URL('../src/data/expert-requirements.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
await writeFile(new URL('../src/data/expert-advancement-reference.json',import.meta.url),JSON.stringify(advancement,null,2)+'\n');
await writeFile(new URL('../docs/专家技能解锁与升级条件-2026-10-29.md',import.meta.url),doc);
console.log('已整理11位专家44项技能，原路径ID保持不变。');
