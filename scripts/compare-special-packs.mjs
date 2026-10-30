import {readFile,writeFile} from 'node:fs/promises';
import {normalizePacks,auditOffers} from '../src/domain/offers.js';
import {getPrice} from '../src/domain/model.js';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root)));
const raw=await read('docs/特惠礼包最新来源-2026-10-26.json'),local=await read('src/data/offers.json'),{items}=await read('src/data/catalog.json');
const fresh=normalizePacks('special',raw),changes=[];
for(const p of fresh){
 const old=local.packs.find(x=>x.id===p.id);
 if(!old){changes.push([p.name,'新增礼包','','']);continue;}
 for(const s of p.sections){
  const before=old.sections.find(x=>x.id===s.id);
  if(!before){changes.push([p.name,s.title,'新增分段','']);continue;}
  if(JSON.stringify(s.columns)!==JSON.stringify(before.columns)||s.title!==before.title)changes.push([p.name,s.title,'分段名称／列名变化',before.title]);
  for(let n=0;n<s.rows.length;n++){
   const r=s.rows[n],b=before.rows[n];if(!b){changes.push([p.name,s.title,'新增档位',r.tierLabel]);continue;}
   if(r.tierLabel!==b.tierLabel)changes.push([p.name,s.title,'现金档位变化',`${b.tierLabel} → ${r.tierLabel}`]);
   r.materials.forEach((m,i)=>{if(m.rawQuantity!==b.materials[i]?.rawQuantity)changes.push([p.name,s.title,`${r.cash}元 · ${m.rawName}`,`模型 ${b.materials[i]?.rawQuantity} / 网页 ${m.rawQuantity}`]);});
  }
  if(before.rows.length>s.rows.length)changes.push([p.name,s.title,'网页档位减少',`${before.rows.length} → ${s.rows.length}`]);
 }
 for(const s of old.sections)if(!p.sections.some(x=>x.id===s.id))changes.push([p.name,s.title,'网页移除分段','']);
}
for(const p of local.packs.filter(p=>p.category==='special'))if(!fresh.some(x=>x.id===p.id))changes.push([p.name,'网页移除礼包','','']);
const fmt=n=>n==null?'缺价':Number(n.toFixed(6)).toString();
const price=(id,s)=>getPrice(items.find(i=>i.id===id),s,{},false,items)?.value;
const comparisons=[];
function add(stage,id,pack,quantity,candidate,note){const i=items.find(i=>i.id===id),current=price(id,stage);comparisons.push([({fc3:"火三",fc5:"火五",t11:"T11"})[stage]||stage,i.name,pack,quantity,fmt(current),fmt(candidate),`${i.priceScale===1?'':i.priceScale} ${i.unit}`,current!=null&&Math.abs(current-candidate)<1e-6?'已与网页折算一致；保留表列计价单位和混合分摊口径。':note]);}
add('fc3','screw','武备自选','30元18个',30/18,'一致');
add('fc3','pet-box','萌宠定制','30元12箱',2.5,'一致');
add('fc3','pet-blue','萌宠定制','30元36蓝',30/36,'模型1.25元来自维护者1金＝8蓝；网页直接价更低。保留维护者比例，不自动覆盖。');
add('fc3','fire-crystal','火晶能源','30火晶＋16小时',(30-16*price('speed-legacy','fc3'))/30,'净分摊价0.603306；模型采用奇货直接价0.833333。现金仍30元，不能混用两种口径。');
for(const [id,qty] of [['screw',30],['equipment-box',18],['mastery-stone',18]])add('fc5',id,'武备自选',`30元选${qty}个`,30/qty,'零件一致；箱子/专精模型旧价低于本页直接价，需补其他礼包或扣赠品依据，不能仅凭本页判错。');
for(const [id,qty] of [['charm-design',57],['charm-guide',51]])add('fc5',id,'匠心自选',`30元选${qty}个`,30/qty,'模型旧价更低，本页该单项不直接支持；工匠宝库宝石另有更优候选但阶段待确认。');
add('fc5','polish','工匠宝库·妙艺','30元180抛光液＋18000合金',30/360,'沿用1抛光液＝100合金估值比例。已按网页数量及原分摊比例接入。');
add('fc5','alloy','工匠宝库·妙艺','同上',30/360,'单位为100合金；同样的比例分摊候选。');
add('fc5','chief-design','工匠宝库·巧思','30元42图纸＋12箱',(30-12*(8*30/360))/54,'按箱含1图纸＋4抛光液＋400合金、上述妙艺比例，已按网页数量接入。混合分摊，不是图纸独售。');
add('fc5','fire-crystal','奇货自选','30元48火晶',30/48,'本页火五—战争学院进度：直接价0.625，比模型0.833333低约25%；适用范围保留原标签。');
add('fc5','steel','奇货自选','30元75000钢材',4,'维护者最新指定火三、火五采用常规钢材礼包7.5元/万；网页奇货4元/万仅保留渠道对照，不覆盖指定常规口径。');
add('fc5','pet-box','萌宠定制','30元15箱',2,'一致');
add('fc5','pet-gold','萌宠定制','30元6金',5,'一致');
add('fc5','pet-food','萌宠定制','30元12900口粮',30/12900*10000,'模型23.259259与直接折算23.255814差约0.0148%，可能是原表舍入或输入差异。');
add('fc5','speed-legacy','科技风暴／城镇崛起','30元46小时',30/46,'模型0.648148低于本页0.652174；差约0.62%，需核原始附赠扣除口径。');
for(const [id,qty] of [['screw',42],['equipment-box',24],['mastery-stone',24]])add('t11',id,'武备自选',`30元选${qty}个`,30/qty,id==='screw'?'模型0.715741与直接折算0.714286差约0.20%。':'一致');
add('t11','fire-crystal','奇货自选','战争学院之后：30元66火晶',30/66,'模型0.453704与直接折算0.454545略有差异；“学院之后”是否含当前T11需按阶段边界核对。');
const audit=auditOffers(fresh);
const inventory=raw.packs.map(p=>[p.name.replace(/\s/g,''),p.sections.length,p.sections.reduce((n,s)=>n+s.rows.length,0),p.sections.map(s=>s.title).join('；'),p.sections.map(s=>`${s.title}：${s.rows[0].map((v,n)=>n===0?`${v}元`:`${s.columns[n-1]}×${v}`).join('，')}`).join('；')]);
const notices=[
 ['工匠宝库·火三精工','维护者最新指示以网页为准：17/34/68/170/340箱已接入；原截图10/20/40/100/200箱留档，停止覆盖。'],
 ['工匠宝库·火五精工','网页20图纸＋20箱，与火三精工此前错误形态相似，但没有火五精工截图，不能据此认定也错；仅列核对。'],
 ['一阶段不等于火晶前','工匠宝库宝石、领主装备强化优惠、宝石匠人、最强领主、专属装备强化等须逐包映射；不将“三阶段”误作火三。'],
 ['后续进度支持不足','本页多数只到火五、T11或笼统“战争学院之后”，没有明确拆六代火八、七代火八、七代火十。模型这些进度的旧表低价不能仅用本页验证。'],
 ['神秘藏宝室','4组固定与终极奖励都重复标“第一阶段”；第一组固定购买档为30＋68＋30＋30＋68＝226元，不能把终极奖励旁30元当独立售价；领取条件仍待确认。另有两列同名幸运箱。'],
 ['名称映射缺口','网页“箱子”“领主装备材料箱”“建筑加速”等仍有未映射名称；价格表已可计价不代表礼包资料导入已经对齐，含糊箱子仍需逐包确认。'],
 ['不再使用的道具','冰原旅者、冰原征服者、英勇之证等含已移除物品；保留来源记录，不重新加入模型道具、库存或价格。'],
 ['火晶前常规规则','网页存在火晶前特惠，但维护者指定火晶前按常规，因此不直接用这些特惠覆盖当前火晶前价格。'],
 ['比例优先','蓝印记、钻石按维护者比例动态估值；萌宠直接蓝印记数量可能折出更低价，作为比较提示，不覆盖指定比例。'],
];
const table=(h,rs)=>'| '+h.join(' | ')+' |\n|'+h.map(()=>'---').join('|')+'|\n'+rs.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n';
let md='# 特惠礼包与当前模型逐项比对\n\n2026-10-26重新读取20款特惠礼包。领主装备按最新指示采用网页数据，覆盖旧截图修正；明确进度冲突项也已采用网页30元档；指定比例继续保留。\n\n';
md+=`来源分段${fresh.reduce((n,p)=>n+p.sections.length,0)}组，档位${fresh.reduce((n,p)=>n+p.sections.reduce((a,s)=>a+s.rows.length,0),0)}条。网页原始奖励与本地差异${changes.length}处。\n\n`;
md+='## 网页与已保存礼包的数量差异\n\n'+table(['礼包','分段','档位／材料','差异'],changes);
md+='\n## 当前价格与本页折算比较\n\n单项自选按完整选择该项计算；不相加不同选项。混合礼包分摊显式注明。后续旧价低于本页不代表错误，只表示本页不能直接佐证。\n\n'+table(['进度','道具','礼包','30元档','模型现价','网页候选折算','计价单位','结论'],comparisons);
md+='\n## 数据与适用条件\n\n'+table(['主题','核对结果'],notices);
md+='\n## 全部20款礼包覆盖清单\n\n'+table(['礼包','分段数','档位数','原进度标签','首档奖励（仅原文记录，非全部同时获得）'],inventory);
md+='\n## 来源\n\n- https://wjgl.store/function/Zero/special-gift-data.html\n- https://wjgl.store/api/gift-packs?category=special\n- 当日接口快照：特惠礼包最新来源-2026-10-26.json\n- 本地对照：src/data/offers.json、src/data/catalog.json；维护者修正：src/data/offer-corrections.json。\n';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ht=(h,rs)=>`<div class="scroll"><table><thead><tr>${h.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rs.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>特惠礼包与模型比对 · 冬日账本</title><style>body{background:#f5f7f1;color:#193f38;margin:0;font:15px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1450px;margin:auto;padding:30px 24px}h1{font-size:30px}h2{margin-top:30px}.note{background:#e4eddb;padding:18px;border-radius:10px}.scroll{overflow:auto;background:white;border:1px solid #dde5d8;border-radius:10px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:12px;border-bottom:1px solid #e7ebdf;text-align:left;vertical-align:top}th{background:#e8efdf;white-space:nowrap}td{min-width:65px}a{color:#1d6956}p{color:#60776b}</style><main><a href="/">← 返回模型</a><h1>特惠礼包与当前模型比对</h1><p>2026-10-26重新读取 · 全部20款 · 领主装备已按最新指示采用网页；明确进度冲突项已按网页30元档更新</p><div class="note">原始数量发现${changes.length}处差异：已按最新指示，领主装备采用网页数据，截图覆盖已停用。另发现火五更优候选、旧价来源不足及阶段映射缺口，见下表。</div><h2>网页与本地礼包数量差异</h2>${ht(['礼包','分段','档位／材料','差异'],changes.length?changes:[['全部20款','原始奖励数量','一致','领主装备已按网页更新']])}<h2>价格对照</h2><p>网页直接价与混合分摊价分开注明；模型旧价更低不等于错误，可能来自其他渠道。自选只算所选项。</p>${ht(['进度','道具','礼包','奖励','模型现价','网页折算','单位','判断'],comparisons)}<h2>阶段、比例与奖励条件</h2>${ht(['主题','核对结果'],notices)}<h2>全部20款覆盖清单</h2>${ht(['礼包','分段','档位','原进度标记','首档原奖励（非全部同时获得）'],inventory)}<p><a href="https://wjgl.store/function/Zero/special-gift-data.html" target="_blank">特惠原网页</a> · <a href="/docs/特惠礼包与模型比对-2026-10-26.md">完整文字版</a> · <a href="/docs/特惠礼包最新来源-2026-10-26.json">最新来源快照</a> · <a href="/public/evidence/fc3-chief-precision-2026-10-26.png">火三精工修正截图</a></p></main></html>`;
for(const [ext,content] of [['md',md],['html',html],['json',JSON.stringify({asOf:'2026-10-26',changes,comparisons,notices,inventory,audit},null,2)]])await writeFile(new URL(`docs/特惠礼包与模型比对-2026-10-26.${ext}`,root),content);
console.log(JSON.stringify({packs:fresh.length,sections:fresh.reduce((n,p)=>n+p.sections.length,0),rows:fresh.reduce((n,p)=>n+p.sections.reduce((a,s)=>a+s.rows.length,0),0),changes,priceComparisons:comparisons.length},null,2));
