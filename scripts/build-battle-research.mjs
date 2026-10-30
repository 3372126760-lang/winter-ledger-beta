import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),folder=new URL('reference/research-2026-10-28/',root);
const manifest=JSON.parse(await readFile(new URL('battle-manifest.json',folder),'utf8'));
const legacy=JSON.parse(await readFile(new URL('reference/planning-web-2026-10-26/normal-research.json',root),'utf8'));
const comparison=await readFile(new URL('wostools-research.html',folder),'utf8');
const clean=s=>s.replace(/<br\s*\/?\s*>/gi,'\u0001').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').split('\u0001').map(part=>part.replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
const number=s=>{const t=clean(s).replace(/[\s,]/g,'');if(!/^\d+(?:\.\d+)?$/.test(t))throw Error('无法解析数字：'+s);return Number(t);};
const romans={I:1,II:2,III:3,IV:4,V:5,VI:6};
// The names follow the existing Chinese game records; the troop and attribute
// identities are checked against each official table's own Bonus column.
const types=[
 ['Weapons Prep','武器特训','all','attack'],['Reprisal Tactics','稳守反击','infantry','attack'],['Precision Targeting','精准射击','marksman','attack'],['Skirmishing','迅猛突刺','lancer','attack'],
 ['Defensive Formation','防御阵型','infantry','defense'],['Picket Lines','警戒队形','marksman','defense'],['Bulwark Formations','坚守阵地','lancer','defense'],['Special Defensive Training','防御特训','all','defense'],
 ['Survival Techniques','生存特训','all','health'],['Assaut Techniques','突击特训','all','lethality'],['Regimental Expansion','编制扩展','all','capacity'],
 ['Close Combat','不懈奋战','infantry','lethality'],['Targeted Sniping','定点狙击','marksman','lethality'],['Lancer Upgrade','长矛改良','lancer','lethality'],['Shield Upgrade','盾牌改良','infantry','health'],['Marksman Armor','射手护甲','marksman','health'],['Lancer Armor','矛兵护甲','lancer','health'],
];
const troops={all:'全体部队',infantry:'盾兵',lancer:'矛兵',marksman:'射手'},metrics={attack:'攻击',defense:'防御',health:'生命',lethality:'穿透',capacity:'出征容量'};
const EnglishTroops={Troops:'all',Infantry:'infantry',Lancer:'lancer',Marksman:'marksman'},EnglishMetrics={Attack:'attack',Defense:'defense',Health:'health',Lethality:'lethality','Deployment Capacity':'capacity'};
const resourceIcons={'102':'生肉','103':'木材','104':'煤矿','105':'铁矿','106':'steel'};
const paths=[],sources=[],checks=[],issues=[];
const translate=text=>{
 let result=text.replace(/Research Cent(?:er|re)/g,'研究所');
 for(const [en,cn] of [...types,['Assault Techniques','突击特训']].sort((a,b)=>b[0].length-a[0].length))result=result.replaceAll(en,cn);
 result=result.replace(/\b(VI|IV|III|II|V|I)\b/g,m=>String(romans[m]));
 for(const [,cn] of types)result=result.replace(new RegExp(cn+' (\\d+) (\\d+)','g'),(_,tier,level)=>`${cn}${tier}（${level}级）`);
 return result.replace(/研究所 (\d+)/g,'研究所$1级').replace(/\n/g,'；');
};
for(const [en,cn,troopId,metric] of types)for(let tier=1;tier<=6;tier++){
 const roman=Object.keys(romans).find(k=>romans[k]===tier),name=`${en} ${roman}`,entry=manifest.entries.find(e=>e.name===name);if(!entry)throw Error('缺少科技：'+name);
 const html=await readFile(new URL(entry.file,folder),'utf8'),table=html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];if(!table)throw Error('无表格：'+name);
 const source='research-wiki-'+entry.file.replace('.html','');
 sources.push({id:source,title:`官方Wiki · ${cn}${tier}（${name}）`,url:entry.url,status:'2026-10-28读取逐级资源、钢材、基础耗时、前置及每级新增属性；属性累计经WoSTools等级选项交叉核对。国际服资料，国服差异待游戏截图核验。'});
 const key=`research.${troopId}.${metric}`,unit=metric==='capacity'?'人':'%',attributeName=`${troops[troopId]}${metrics[metric]}`;
 let total=0;const rows=[];
 for(const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);if(!cells.length)continue;if(cells.length!==6)throw Error('列数不符：'+name);
  const level=number(cells[0]),cost={},resources={};
  for(const line of cells[2].split(/<br\s*\/?\s*>/i)){if(!clean(line)&&!line.includes('<img'))continue;const icon=line.match(/item_icon_(\d+)\.png/)?.[1],id=resourceIcons[icon];if(!id)throw Error('资源图标未知：'+name+' '+icon);const amount=number(line);if(id==='steel')cost.steel=amount;else resources[id]=amount;}
  if(Object.keys(resources).length!==4||!cost.steel)throw Error('配方不完整：'+name+' '+level);
  const time=clean(cells[3]).match(/^(?:(\d+)d\s*)?(\d+):(\d{2}):(\d{2})$/),timeKnown=time&&Number(time[3])<60&&Number(time[4])<60;
  if(!timeKnown)issues.push({name,level,field:'time',raw:clean(cells[3]),note:'原站工期格式异常，本档时间保留未知。'});
  const bonus=clean(cells[4]),b=bonus.match(/^(Troops|Infantry|Lancer|Marksman) (Attack|Defense|Health|Lethality|Deployment Capacity):\s*([\d\s,.]+)(%)?$/);
  if(!b||EnglishTroops[b[1]]!==troopId||EnglishMetrics[b[2]]!==metric||Boolean(b[4])!==(unit==='%'))throw Error('属性不对应：'+name+' '+bonus);
  const delta=number(b[3]);total=Number((total+delta).toFixed(6));
  const rawPrerequisite=clean(cells[1]),prerequisites=translate(rawPrerequisite);
  if(/Survival Expansion/.test(rawPrerequisite))issues.push({name,level,field:'prerequisites',note:'原站写作Survival Expansion，保留原文，不擅自改成其他科技。'});
  rows.push({level,label:`${level}级`,cost,resources,timeHours:timeKnown?Number(time[1]||0)*24+Number(time[2])+Number(time[3])/60+Number(time[4])/3600:null,timeRaw:clean(cells[3]),attributes:[{key,name:attributeName,value:total,unit}],attributeDelta:delta,prerequisites,prerequisitesRaw:rawPrerequisite,powerDelta:number(cells[5]),sourceBonus:bonus,effect:`本级新增${attributeName} +${delta}${unit}；本阶段累计 +${total}${unit}。前置：${prerequisites}${!timeKnown?'；来源工期格式异常，时间待核对':''}`});
 }
 if(!rows.length||rows.some((r,i)=>r.level!==i+1))throw Error('等级不连续：'+name);
 const aliases=[name,name.replace('Assaut','Assault').replace('Defensive Formation ','Defensive Formations ').replace('Lancer Upgrade ','Lance Upgrade ')];let optionHtml;
 for(const alias of aliases){const offset=comparison.indexOf('aria-label="'+alias+' current level"');if(offset>=0){optionHtml=comparison.slice(offset,comparison.indexOf('</select>',offset));break;}}
 if(!optionHtml)throw Error('独立累计值缺失：'+name);
 const cumulative=[...optionHtml.matchAll(/<option\b[^>]*value="(\d+)"[^>]*>([\s\S]*?)<\/option>/g)].map(m=>({level:Number(m[1]),text:clean(m[2])})).filter(r=>r.level>0);
 for(const r of rows){const c=cumulative.find(c=>c.level===r.level),value=c?.text.match(/\+([\d,.]+)(%|$)/)?.[1];if(value===undefined||Math.abs(Number(value.replaceAll(',',''))-r.attributes[0].value)>1e-6)throw Error('累计值冲突：'+name+' Lv'+r.level+' official='+r.attributes[0].value+' tools='+c?.text);checks.push({name,level:r.level,cumulative:r.attributes[0].value});}
 const old=legacy.paths.find(p=>p.name===cn+tier);
 paths.push({id:old?.id||`research-battle-${entry.file.replace('.html','')}`,name:cn+tier,source,unitLabel:'项科技',maxPieces:1,researchTree:'battle',researchTier:tier,troopId,metric,englishName:name,coverage:`战斗科技第${tier}阶段，0—${rows.length}级；逐级资源、钢材、基础工期及本阶段累计属性`,prerequisiteNote:'所选区间的逐级前置见明细，尚未自动连锁升级前置；本阶段0级表示尚未研究此阶段，不表示前置阶段全部为0。',costStatus:'available',baseline:{level:0,label:'0级 · 本阶段未研究',attributes:[{key,name:attributeName,value:0,unit}]},rows});
}
const result={asOf:'2026-10-28',sources,paths,checks,issues,notes:['研究所战斗科技17条分支、I—VI共102条阶段路径；逐级材料与基础时间来自官方Wiki，459个属性累计值与WoSTools选项一致。','每级Bonus是新增值，累计后作为该阶段当前总属性；不把本阶段累计重复求和，也不与其他阶段混算。','材料含钢材以及生肉、木材、煤矿、铁矿；普通资源未统一定价，钢材金额仅是已知部分成本。','逐级前置原文与中文对照已保留；原站少量前置名称异常标注待核对，未自动补全或连锁升级。','资料为Whiteout Survival国际服官方Wiki；已沿用国服已有科技中文名，具体数值及解锁差异仍以无尽冬日游戏内为准。']};
await writeFile(new URL('battle-research.json',folder),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({paths:paths.length,rows:paths.reduce((n,p)=>n+p.rows.length,0),checked:checks.length,issues},null,2));
