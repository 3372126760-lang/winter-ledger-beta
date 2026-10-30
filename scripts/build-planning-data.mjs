import {splitExpertAdvancements} from '../src/domain/expert-advancement.js';
import {normalizeT12Attributes} from '../src/domain/t12-attributes.js';
import {stageMastery} from '../src/domain/hero-mastery.js';
import {addChiefAttributeSteps} from '../src/domain/chief-attributes.js';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const load=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const raw=await load('reference/planning-web-2026-10-26/extracted.json');
const chief=await load('reference/planning-web-2026-10-26/lord-equipment-gem.json');
const base='https://wjgl.store/function/';
const sources=[
 {id:'planning-chief',title:'冬日工具箱 · 领主装备与宝石',url:base+'lord-equipment-gem-calculator.html',status:'2026-10-26读取公开接口/api/lord-equipment-gem；按原计算器逐档累计材料，属性保留单件/单颗口径。'},
 {id:'planning-hero',title:'冬日工具箱 · 英雄装备',url:base+'hero-equipment-calculator.html',status:'2026-10-26读取网页公式；消耗按目标级求和，属性公式近似且缺槽位区分，不作为精确跨系统属性比较。'},
 {id:'planning-t11',title:'冬日工具箱 · T11科技',url:base+'T11Calculator.html',status:'2026-10-26读取88条逐级材料、时间记录；未列科技属性及完整前置。'},
 {id:'planning-t12',title:'冬日工具箱 · T12科技',url:base+'T12Calculator.html',status:'2026-10-26读取1572条逐级材料记录与效果原文。维护者2026-10-30确认：各兵种顶部六项无需加速，记0小时；其余未确认工期保留待核对。'},
 {id:'planning-experts',title:'冬日工具箱 · 专家等级与技能',url:base+'expert-calculator.html',status:'2026-10-26读取expert-calculator-data.js静态数据；来源自身有技能待补说明，等级与关系突破属性边界未完全一致。'},
 {id:'planning-building',title:'冬日工具箱 · 1—30建筑',url:base+'building-upgrade-calculator.html',status:'2026-10-26读取7类建筑资源、建造时间、前置原文；表内实力字段未确认总量/增量，未用于收益计算。'},
 {id:'planning-fire-building',title:'冬日工具箱 · 火晶建筑',url:base+'Architecture10.html',status:'2026-10-26读取8类建筑各50档火晶与精炼火晶材料；没有完整普通资源、时间与战斗属性。'},
 {id:'planning-pets',title:'冬日工具箱 · 宠物养成资料',url:base+'pet-data-query.html',status:'2026-10-26读取7组宠物10级检查点资料；表头未说明消耗是单阶段还是累计，不擅自相减或求和。'},
 {id:'planning-item-crosscheck',title:'WosGift · 英雄装备机制核对',url:'https://wosgift.com/zh-cn/hero-gear/',status:'核对强化经验、专精与组件机制；紫装150/蓝装60经验；不提供完整结构化强化表。'},
 {id:'planning-building-crosscheck',title:'WosGift · 建筑资料库',url:'https://wosgift.com/zh-cn/buildings/',status:'对照可用建筑范围与战力/前置字段；未将未展开内容补写到本地。'}
];
const n=value=>Number(value)||0;
const clean=obj=>Object.fromEntries(Object.entries(obj).filter(([,v])=>Number.isFinite(v)&&v>0));
const attr=(key,name,value,unit='%')=>({key,name,value,unit});
const row=(level,label,cost={},extras={})=>({level,label,cost:clean(cost),resources:{},timeHours:null,attributes:[],...extras});
const baseline=(level=0,label='未提升',attributes=[])=>({level,label,attributes});
const path=(id,name,source,rows,extras={})=>({id,name,source,unitLabel:'项',maxPieces:1,coverage:'已列等级',prerequisiteNote:'账号解锁、完整前置与限购仍需按游戏内确认。',costStatus:'available',rows,baseline:baseline(),...extras});
const system=(id,name,description,paths,notes=[])=>({id,name,description,notes,paths});
const chiefAttr=(v,capacity=0,power=0)=>[attr('chief.attack','对应兵种攻击力',v),attr('chief.defense','对应兵种防御力',v),attr('chief.capacity','通用出征容量',capacity,'人'),attr('chief.power','单件装备实力',power,'点')];
const chiefPath=path('chief-equipment','单件领主装备','planning-chief',chief.equipment.map(r=>row(r.seq,r.name,{'alloy':r.alloy,'polish':r.polish,'chief-design':r.plan,'amber':r.amber},{attributes:chiefAttr(r.attr*100,r.march||0,r.power||0),effect:r.march?`单件出征容量加成：${r.march}；维护者图鉴已核对神话2星、2阶3星、5阶、6阶样本。`:''})),{unitLabel:'件',maxPieces:6,baseline:baseline(0,'未制作',chiefAttr(0)),coverage:`${chief.equipment.length}个品质/星级/分段档位；逐档消耗`,prerequisiteNote:'需按实际装备部位确定兵种；套装在六部位汇总与计划面板中另算，单件表不含套装；其他升级前置待核对。'});
const gemAttr=v=>[attr('chief-gem.health','对应兵种生命',v),attr('chief-gem.lethality','对应兵种穿透',v)];
const gemPath=path('chief-gem','单颗领主宝石','planning-chief',chief.gems.map(g=>row(g.lv,g.label,{'charm-guide':g.manual,'charm-design':g.blueprint,'codex':g.codex},{attributes:gemAttr(g.attr*100)})),{unitLabel:'颗',maxPieces:18,baseline:baseline(0,'未镶嵌',gemAttr(0)),coverage:`${chief.gems.length}个等级/分段档位，保留原名称`,prerequisiteNote:'同一颗宝石的等级材料；每颗同时增加对应兵种生命和穿透。16级后分段序号不是宝石等级数。'});
function heroXpAt(lv){
 if(lv<1||lv>200)return 0;
 if(lv<=29)return 5*lv+5;if(lv<=39)return 10*lv-140;if(lv<=59)return 20*lv-530;
 if(lv<=69)return 680+(lv-60)*30;if(lv<=79)return 990+(lv-70)*40;if(lv<=99)return 1400+(lv-80)*50;
 if(lv===100)return 2400;if([101,120,140,160,180,200].includes(lv))return 0;
 if(lv<=119)return 2500+(lv-102)*50;if(lv<=139)return 3500+(lv-121)*50;
 if(lv<=159)return 4450+(lv-141)*50;if(lv<=179)return 5500+(lv-161)*100;return 7500+(lv-181)*100;
}
function heroMithrilAt(lv){return ({120:10,140:20,160:30,180:40,200:50})[lv]||0;}
function heroOrangeAt(lv){return ({101:2,120:3,140:5,160:5,180:10,200:10})[lv]||0;}
const heroStrength=path('hero-strength','传说/神话装备强化','planning-hero',Array.from({length:200},(_,i)=>{const lv=i+1;return row(lv,`强化 ${lv} 级`,{'screw':heroXpAt(lv)/100,'mithril':heroMithrilAt(lv),'orange-gear':heroOrangeAt(lv)},{effect:'强化经验按每100点折为1个强化经验零件；可能出现不足1个的等价消耗，实际投料请按游戏内道具处理。'});}),{unitLabel:'件',maxPieces:12,baseline:baseline(1,'强化 1 级'),coverage:'强化1—200级；材料等价数',prerequisiteNote:'本表以传说/神话路线计算；品质、装备槽位、专精乘区及强化上限前置需另行校验。'});
const heroMastery=path('hero-mastery','传说装备专精锻造','planning-hero',Array.from({length:20},(_,i)=>row(i+1,`专精 ${i+1} 级`,{'mastery-stone':(i+1)*10,'orange-gear':i+1>=11?i+1-10:0},{effect:`原网页近似公式中的专精倍率为${(1+(i+1)*.1).toFixed(1)}倍；未与具体槽位属性联算。`})),{unitLabel:'件',maxPieces:12,coverage:'专精1—20级',prerequisiteNote:'传说品质、熔炉20及装备强化20级等前置需游戏内核对；专精与强化材料分开测算。'});
const groupBy=(rows,key)=>{const out=new Map();for(const r of rows){const k=key(r);if(!out.has(k))out.set(k,[]);out.get(k).push(r);}return out;};
const resources=r=>clean({'生肉':n(r.meat??r.food),'木材':n(r.wood),'煤矿':n(r.coal),'铁矿':n(r.iron)});
const t11Paths=[...groupBy(raw.t11Data,r=>r.name)].map(([name,rows],i)=>path(`t11-${i+1}`,name,'planning-t11',rows.map(r=>row(r.level,`${name} ${r.level}级`,{'fire-particle':n(r.particle),'steel':n(r.steel)},{resources:resources(r),timeHours:n(r.days)*24})),{coverage:`${rows.length}个已列等级；未附战斗属性`,prerequisiteNote:'T11战争学院科技；兵种归属与前置树未由名称推断。'}));
const t12Paths=[...groupBy(raw.t12Data,r=>`${r.troop}|${r.groupId}`)].map(([key,rows])=>path(`t12-${rows[0].groupId}-${key.includes('盾兵')?'shield':key.includes('矛兵')?'lancer':'marksman'}`,`${rows[0].troop} · ${rows[0].name}`,'planning-t12',rows.map(r=>row(r.level,`${r.name} ${r.level}级`,{'steel':n(r.steel),'refined-fire-crystal':n(r.refinedCrystal),'fire-particle':n(r.microCrystal)},{resources:resources(r),timeHours:r.seconds>0?r.seconds/3600:null,effect:r.desc||'属性效果待补'})),{coverage:`${rows.length}个已列等级；效果按原文展示`,prerequisiteNote:'T12实际开放和每条前置需单独确认；价格大类合并不等于已解锁T12。部分0秒记录时间待补。'}));
const expertPaths=[];
for(const expert of raw['window.ExpertCalculatorData'].experts){
 if(expert.hasExpertLevelData){
  const marks=new Map((expert.relationMilestones||[]).map(m=>[m.afterLevel,m]));
  expertPaths.push(path(`expert-${expert.id}-relation`,`${expert.name} · 等级与关系`,'planning-experts',expert.levels.map(r=>{const m=marks.get(r.level);return row(r.level,`${r.level}级${m?' · '+m.relation:''}`,{'affection':n(r.favor),'expert-mark':n(m?.mark)},{effect:`等级表：${expert.statLabel} ${(n(r.stat)*100).toFixed(4)}%${m?`；本级关系突破表另列 ${(n(m.stat)*100).toFixed(4)}%，印记${m.mark}个。`:''}`});}),{coverage:`${expert.levels.length}级及关系印记；突破前后属性边界待核对`,prerequisiteNote:'三代开放专家；关系突破按来源afterLevel记入该档；等级属性和突破表不是同一个数值，不用于精确属性排序。'}));
 }
 for(const [i,skill] of (expert.skills||[]).entries()){
  if(skill.type==='talent'||!skill.levels?.length)continue;
  expertPaths.push(path(`expert-${expert.id}-skill-${i+1}`,`${expert.name} · ${skill.name}`,'planning-experts',skill.levels.map(r=>row(r.level,`${r.level}级`,{'knowledge':n(r.books)},{resources:clean({'专家技能经验':n(r.xp)}),effect:[r.description,r.requirement?`前置：${r.requirement}`:''].filter(Boolean).join('；')})),{baseline:baseline(skill.levels[0].level,`${skill.levels[0].level}级`),coverage:`${skill.levels.length}级技能，按原文字段保留`,prerequisiteNote:'技能关系/技能总等级前置看效果原文；经验独立列出，尚无统一现金估值；非战斗技能不当作战斗属性收益。'}));
 }
}
function parseResource(v){if(typeof v==='number')return v;const s=String(v||'').replace(/,/g,'').trim();if(!s)return 0;const m=s.match(/^([\d.]+)(万|亿)?$/);if(!m)throw new Error('未识别资源数值：'+s);return Number(m[1])*(m[2]==='万'?10000:m[2]==='亿'?100000000:1);}
function parseTime(v){const s=String(v||'').trim();if(!s)return null;const m=s.match(/^(?:(\d+)天\s*)?(\d+):(\d+):(\d+)$/);return m?(Number(m[1]||0)*24+Number(m[2])+Number(m[3])/60+Number(m[4])/3600):null;}
const buildingPaths=Object.entries(raw.BUILDING_DATA).map(([name,rows])=>path(`building-${name}`,`${name} · 1—30级`,'planning-building',rows.map(r=>row(r.level,`${r.level}级`,{},{resources:{'生肉':parseResource(r.food),'木材':parseResource(r.wood),'煤矿':parseResource(r.coal),'铁矿':parseResource(r.iron)},timeHours:parseTime(r.time),effect:r.requirement?`前置：${r.requirement}`:'原资料未列本级前置'})),{baseline:baseline(rows[0].level,`${rows[0].level}级`),coverage:`${rows.length}个已列等级；资源与时间`,prerequisiteNote:'未接入前置自动连锁升级；源实力字段含义未核实，不当作总战力或战斗属性。'}));
const fireNames={furnace:'熔炉',embassy:'使馆',infirmary:'军医所',command:'指挥部',shield:'盾兵营',lancer:'矛兵营',marksman:'射手营',academy:'战争学院'};
function fireLabel(level){if(level===30)return '30级';const cn=['零','一','二','三','四','五','六','七','八','九','十'];const completed=Math.floor((level-30)/5),part=(level-30)%5;return part?(completed?`火晶${cn[completed]}—${part}段`:`30级—${part}段`):`火晶${cn[completed]}`;}
for(const [key,name] of Object.entries(fireNames)){
 const rows=raw.fireData.filter(r=>r[key]&&r[key].some(v=>v>0));
 if(!rows.length)continue;
 const first=rows[0].level;
 buildingPaths.push(path(`fire-building-${key}`,`${name} · 火晶建筑`,'planning-fire-building',rows.map(r=>row(r.level,fireLabel(r.level),{'fire-crystal':r[key][0],'refined-fire-crystal':r[key][1]},{effect:'仅列火晶及精炼火晶材料；普通资源、工期、战斗属性与前置链尚未补齐。'})),{baseline:baseline(first-1,fireLabel(first-1)),coverage:`${rows.length}个有消耗的分段；仅火晶材料`,costStatus:'unverified',prerequisiteNote:'火晶建筑配方仅含已列两种火晶材料，不能当完整升级成本；战争学院首次收录前的消耗不可反推。'}));
}
const petPaths=[];
for(const [index,group] of raw.PET_GROUPS.entries())for(const pet of group.pets){
 petPaths.push(path(`pet-${index+1}-${pet}`,`${pet} · 升级/突破检查点`,'planning-pets',group.rows.map(r=>row(r.level,`${r.level}级`,{'pet-food':n(r.feed),'pet-manual':n(r.book),'pet-vitality':n(r.potion),'pet-serum':n(r.serum)},{effect:`原表等级属性：${r.stat||'待补'}；洗炼属性：${r.refine||'待补'}。材料为原检查点数值，累计/本阶段含义尚未确认。`})),{costMode:'checkpoint',baseline:baseline(group.rows[0].level,`${group.rows[0].level}级`),costStatus:'unverified',coverage:'仅每10级检查点；材料累计/增量待确认',prerequisiteNote:'同组宠物共用养成表；不把洗炼随机属性与升级属性相加；成长/突破的逐级配方尚未补全。'}));
}
// The second source provides every level. All ten-level food blocks and
// breakthrough counts were matched to the independent toolbox snapshot.
const petResearch=await load('reference/research-2026-10-27/pets-verified.json');
for(const pet of petResearch.pets){
 if(!pet.checks.length||pet.checks.some(c=>!c.consistent))throw new Error('宠物交叉核对未通过：'+pet.name);
 const sourceId='planning-pet-'+pet.localFile.replace('.html','');
 sources.push({id:sourceId,title:`WosGift · ${pet.name}逐级养成表`,url:pet.url,status:`2026-10-27读取${pet.rows.length}级；${pet.checks.length}个十级口粮区间和突破材料与冬日工具箱一致。逐级口粮和突破分开记录；属性仅保留原文。`});
 let seq=1;const rows=[];
 for(const r of pet.rows){
  if(r.level===1)continue;
  const hasBreak=r.breakthrough.some(n=>n>0);
  rows.push(row(++seq,`${r.level}级${hasBreak?' · 突破前':''}`,{'pet-food':r.food},{petLevel:r.level,phase:hasBreak?'before-breakthrough':'level',effect:`原表部队攻击/防御：${r.effect}。若有斜线，保留突破前后原文；不计入跨系统属性排序。`}));
  if(hasBreak)rows.push(row(++seq,`${r.level}级 · 已突破`,{'pet-manual':r.breakthrough[0]||0,'pet-vitality':r.breakthrough[1]||0,'pet-serum':r.breakthrough[2]||0},{petLevel:r.level,phase:'after-breakthrough',effect:`原表部队攻击/防御：${r.effect}。本档为突破后；保留原文，不合并洗炼属性。`}));
 }
 const old=petPaths.findIndex(p=>p.name.startsWith(pet.modelName+' ·'));
 if(old<0)throw new Error('宠物路径对应失败：'+pet.name);
 petPaths[old]=path('pet-detailed-'+pet.localFile.replace('.html',''),`${pet.name} · 逐级升级与突破`,sourceId,rows,{baseline:baseline(1,'1级'),coverage:`1—${pet.rows.length}级；每级口粮与突破前后均可选择，${pet.checks.length}个十级节点已交叉核对`,prerequisiteNote:'当前和目标请按是否已突破分别选择；突破不额外重复计入口粮。洗炼、技能、开启条件与普通资源未并入此路径。'});
}
let normal={paths:[]};
try{normal=await load('reference/planning-web-2026-10-26/normal-research.json');if(normal.source)sources.push(normal.source);}catch(e){if(e.code!=='ENOENT')throw e;}
const battle=await load('reference/research-2026-10-28/battle-research.json');
sources.push(...battle.sources,{id:'research-attribute-crosscheck',title:'WoSTools · 研究所升级计算器（属性累计核对）',url:'https://wostools.net/research-upgrades-calculator',status:'2026-10-28读取公开页面等级选项；459个累计属性值与官方Wiki每级增量之和一致。'});
const retainedGrowth=normal.paths.filter(p=>!battle.paths.some(b=>b.id===p.id)).map(p=>({...p,researchTree:'growth',researchTier:Number(p.name.match(/\d+$/)?.[0])}));
normal={...normal,paths:[...battle.paths.sort((a,b)=>a.researchTier-b.researchTier),...retainedGrowth],notes:[...battle.notes,'此前六条发展科技部分资料继续保留；发展科技完整树尚未收录。']};
const systems=[
 system('chief-gear','领主装备','品质、星级与分段升级；材料和对应部位属性。',[chiefPath],['属性按单件展示，不把不同兵种/属性直接相加。','维护者图鉴样本已确认装备实力、出征容量为单件当前累计值；套装加成在部位汇总中另计，单件属性表不含套装。']),
 system('chief-gems','领主宝石','宝石等级与16级后的分段材料。',[gemPath],['16级以后的序号仅用于路径定位，界面显示原始等级/分段标签。','每颗同时提供对应兵种的生命与穿透；维护者确认16级两项各100%。当前按盾、矛、射分别汇总。']),
 system('hero-gear','英雄装备','强化、专精锻造及传说到神话路线。',[heroStrength,heroMastery],['强化经验按100点等价1零件；等价金额不是实际道具投料整数方案。','强化/专精相互乘算、槽位差异及专属组件路线尚未联算，属性暂不精确排序。']),
 system('research','普通科技','研究所战斗科技1—6阶段；逐级材料、属性、基础时间与前置。',normal.paths||[],normal.notes||[]),
 system('t11','T11科技','战争学院各科技的火晶微粒、钢材、资源和工期。',t11Paths,['原网页没有逐级属性效果与完整前置，因此可测材料，暂不能计算每元属性收益。','研究工期显示原始耗时，不自动视作必须购买等量加速。']),
 system('t12','T12科技','按盾、矛、射兵种分列科技，展示材料与效果原文。',t12Paths,['描述可能同时包含固定值、比例、容量等不同效果；本版保留原文，不强行归一。','维护者确认顶部五项装备与兵种解锁无工期，材料照常计算；其余未确认工期不推断为0。']),
 system('experts','专家','等级好感度、关系印记和独立技能路线。',expertPaths,['等级效果与关系突破表的属性边界有差异，暂不进行精确属性收益排序。','技能含非战斗收益；只展示原文，不把活动积分、生产加成当作战斗属性。']),
 system('buildings','建筑等级','普通1—30级与火晶建筑分段材料。',buildingPaths,['普通资源暂无模型单价，完整现金成本会明确待补。','火晶建筑资料不含完整普通资源、时间和兵种属性，材料列表仅作已知部分。']),
 system('pets','宠物','14种宠物逐级口粮与突破材料，突破前后独立选择。',petPaths,['逐级口粮与每十级突破材料分开；117个十级区间与工具箱交叉核对一致。','宠物技能、洗炼概率、保留槽位与预期洗炼成本尚待补充；等级属性仅保留来源原文。'])
];
for(const s of systems)for(const p of s.paths){
 p.rows.sort((a,b)=>a.level-b.level);
 if(new Set(p.rows.map(r=>r.level)).size!==p.rows.length)throw new Error('路径等级重复：'+p.id);
 for(const r of p.rows)for(const v of Object.values(r.cost))if(!Number.isFinite(v)||v<0)throw new Error('无效材料：'+p.id);
}
addChiefAttributeSteps(chiefPath);addChiefAttributeSteps(gemPath);
for(const s of systems)if(s.id==='hero-gear')s.paths=s.paths.map(stageMastery);
systems.splice(0,systems.length,...systems.filter(s=>s.id!=='buildings'));
for(const s of systems)if(s.id==='t12')s.paths=s.paths.map(normalizeT12Attributes);
const output={asOf:'2026-10-28',schemaVersion:1,sources,systems};
splitExpertAdvancements(output,JSON.parse(await readFile(new URL('src/data/expert-board.json',root),'utf8')));
await writeFile(new URL('src/data/planning.json',root),JSON.stringify(output,null,2)+'\n');
let md='# 提升规划资料清单\n\n2026-10-28更新。原始资料在F盘reference/planning-web-2026-10-26；宠物逐级网页和交叉核对在reference/research-2026-10-27；研究所战斗科技在reference/research-2026-10-28。只提取静态表格，不执行来源网页脚本，C盘仅查阅。\n\n';
md+='材料按逐级消耗求和；宠物口粮按级别计入、突破材料另列，117个十级区间与工具箱一致。缺完整配方的火晶建筑仅作已知材料查阅。所有金额由当前进度单价实时估值，不是最便宜礼包组合。未录入属性、时间、前置或普通资源价格的，明确保留缺项。\n\n| 系统 | 路径数 | 档位条数 | 主要限制 |\n|---|---:|---:|---|\n';
for(const s of systems)md+=`| ${s.name} | ${s.paths.length} | ${s.paths.reduce((sum,p)=>sum+p.rows.length,0)} | ${s.notes.join('；')} |\n`;
md+='\n## 来源\n\n';for(const s of sources)md+=`- [${s.title}](${s.url})：${s.status}\n`;
await writeFile(new URL('docs/提升规划资料清单-2026-10-26.md',root),md);
console.log(JSON.stringify(systems.map(s=>({id:s.id,paths:s.paths.length,rows:s.paths.reduce((sum,p)=>sum+p.rows.length,0)})),null,2));
