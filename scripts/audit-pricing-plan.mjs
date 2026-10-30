import {readFile,writeFile} from 'node:fs/promises';
import {getPrice} from '../src/domain/model.js';
import {STAGES,progressFromStage} from '../src/domain/stages.js';
import {galleryArt} from '../src/domain/art.js';
import {itemAvailability} from '../src/domain/availability.js';
const root=new URL('../',import.meta.url),catalog=JSON.parse(await readFile(new URL('src/data/catalog.json',root))),items=catalog.items;
const regular='https://wjgl.store/function/Zero/regular-gift-data.html';
const special='https://wjgl.store/function/Zero/special-gift-data.html';
const groups=STAGES.map(stage=>{
  const progress=progressFromStage(stage.id),statuses={reference:[],channel:[],missing:[],locked:[],choice:[]};
  for(const item of galleryArt(items)){
    const availability=itemAvailability(item,stage.id,progress),price=getPrice(item,stage.id,{},true,items,new Set(),{progress});
    const status=!availability.available?'locked':item.valuation?.type==='choice'?'choice':price?price.kind:'missing';
    statuses[status].push({id:item.id,name:item.name,reason:availability.reason,price:price?.value,unit:item.unit,scale:item.priceScale});
  }
  return {...stage,progress,statuses};
});
const candidates=[
  ['零件／幸运箱','武备自选；常规英雄装备礼包','常规30元：零件10＋幸运箱4','混合礼包无独售证据时，按已获准的后续进度比例分摊；火晶前已采用火五比例'],
  ['专精能源石','武备自选；常规专精锻造','30元10个','火晶前已用常规；火三渠道与后续进度数量另核对'],
  ['宝石图纸／手册','匠心自选、工匠宝库宝石；常规宝石图纸/宝石匠人礼包','图纸30元10；手册礼包30元：手册18＋图纸6','图纸先定价，再反推手册；工匠宝库“一阶段”仍按礼包单独确认'],
  ['宝石秘典','常规宝石匠人超值包','30元：手册7＋图纸7＋秘典2','已按维护者要求全进度扣除当前手册/图纸价格后÷2动态计算'],
  ['抛光液／合金／设计图纸','工匠宝库领主；常规领主装备工具包/领主装备强化','工具包30元：抛光液15＋合金1500；强化30元：图纸20＋抛光液9＋合金900','先分摊抛光液/合金，再反推图纸；合金单价单位100个'],
  ['月光琥珀','设计图纸兑换；常规月光琥珀','30元5个','常规直接价与10图纸兑换价比较；兑换是否已解锁待核对'],
  ['秘银','常规装备赋能','30元1个','直接对应，无需从混合礼包反推'],
  ['宠物箱／手册／活力／血清','宠物自选礼包；常规驯兽手册/宠物活力/宠物血清礼包','30元：手册35，或活力10，或血清5','对应每箱6元；后续已有更优宠物自选价时保留其进度价，材料随箱价÷7/÷2/÷1'],
  ['高级野性印记','宠物自选礼包；常规野性印记礼包','30元2个高级印记','后续进度宠物自选礼包奖励数量需逐段核对'],
  ['普通野性印记','宠物自选礼包；待找独售或明确兑换比例','维护者确认1高级印记＝8普通印记','已按当前进度高级印记价格÷8动态估值'],
  ['宠物口粮','宠物自选礼包；常规宠物口粮礼包','30元6000','价格表按10000个；后续宠物礼包档位另核对'],
  ['统一小时加速','奇货自选、部队训练/城镇崛起；常规飞速成长/城镇建设/部队训练/科技研究','飞速成长30元共30小时（10小时＋240×5分钟），另有黄金钥匙；建设等30元共10小时','火晶前采用飞速成长1元/小时且不扣钥匙；火三已用城镇崛起0.743802元/小时'],
  ['火晶','奇货自选；常规火晶礼包','30元：火晶15＋通用加速8小时','火晶三起；先确认该进度加速价，再从30元扣除加速反推火晶'],
  ['火晶微粒／钢材','火晶兑换、奇货自选；常规火晶微粒/钢材礼包','微粒礼包30元：微粒30＋钢材10000；钢材礼包30元40000','微粒T11起；可先定钢材，再反推微粒；不要把T11材料算作火晶前实际可获取'],
  ['通用专家印记','常规专家印记礼包','维护者截图：30元8个，附带钻石等不抵扣','三代起；全进度已按常规礼包使用3.75元/个'],
  ['专家好感度','常规专家赠礼套装','维护者截图：30元8×1000＋8×100＝8800好感度','三代起；全进度已按常规礼包使用30÷8800×10000元/万点'],
  ['学识之书','常规专家技能礼包','维护者截图：30元500本＋8小时加速','三代起；全进度采用常规礼包，动态扣当前进度加速价；缺统一参考价时暂用常规1元/小时'],
  ['神秘徽章／英雄组件箱','常规神秘徽章礼包；维护者指定组件箱价格','30元2500徽章；30元5组件箱','已按维护者指定统一为0.012元/徽章、6元/箱'],
  ['传说通用英雄信物','奇货等英雄信物礼包；待补具体进度独立档','维护者指定全进度沿用2.5元/个','全进度统一价格已接入'],
  ['钻石','宠物等礼包附赠换算；待明确统一计价口径','维护者确认1普通印记＝500钻石','每万钻石按20个当前进度普通印记估值；不重复抵扣礼包附赠'],
  ['传说通用装饰物组件','万象杂货铺；晨曦岛建筑礼包','维护者：最低68元/建筑，1建筑按10组件计','已由维护者指定全进度6.8元/个'],
  ['各类宝箱／橙装／精炼火晶','依赖材料折算，不另指定独立礼包','固定箱按内容；随机箱按概率；战歌箱按选择；精炼按周安排','精炼火晶八起；橙装保持幸运箱原价，再按100箱保底反推'],
];
let md='# 各进度礼包与缺价整理（待核对草案）\n\n日期：2026-10-26。火晶前及解锁规则已接入；专家、橙碎、海岛橙碎及指定比例已统一；火三明确礼包已接入，条件分摊项目仍待核对。\n\n';
md+='## 解锁口径\n\n火晶/火晶宝箱：火晶三起；火晶微粒：T11起；精炼火晶：火晶八起；专家材料/学习加速：三代起。相同火三价格类内，二代无专家、三代有专家；按实际英雄进度判断。其他系统的更细开放条件未由本次规则推断。\n\n';
md+='## 覆盖概况\n\n未解锁不算缺价；战歌箱待选择不算固定缺价。条目数含多种小时加速，不能当成独立材料系统数。\n\n| 价格进度 | 参考价条目 | 渠道折算待确认 | 尚未接入单价 | 未解锁 | 待自选 |\n|---|---:|---:|---:|---:|---:|\n';
for(const g of groups)md+=`| ${g.name} | ${g.statuses.reference.length} | ${g.statuses.channel.length} | ${g.statuses.missing.length} | ${g.statuses.locked.length} | ${g.statuses.choice.length} |\n`;
md+='\n## 各阶段待补项\n\n';
for(const g of groups){md+=`### ${g.name}\n\n缺价：${g.statuses.missing.map(i=>i.name).join('、')||'无固定缺价'}。\n\n`;if(g.statuses.channel.length)md+=`已有渠道报价、尚非统一基准：${g.statuses.channel.map(i=>i.name).join('、')}。\n\n`;}
md+='## 道具—候选礼包对应\n\n| 道具组 | 可核对的礼包/渠道 | 当前已知常规30元奖励 | 建议计算口径与待确认点 |\n|---|---|---|---|\n';
for(const row of candidates)md+='| '+row.join(' | ')+' |\n';
md+='\n## 需要优先核对的价格分歧\n\n1. 专家已按维护者确认，全进度采用三款常规礼包；七代火八学识旧价12元已修正为51.104元/1000本。火三学识按城镇崛起加速价扣除，约48.099174元/1000本。\n2. 橙碎全进度2.5元/个、海岛橙碎全进度6.8元/个，已按维护者统一；旧6元已归档。\n3. 火三礼包已接入：城镇崛起加速0.743802元/小时；萌宠定制30元12箱及其他明确自选项。火三加速已采用城镇崛起参考价，专家学识随之更新；火晶采用奇货直接价，不采用能源净分摊价。\n4. 钢材与战争学院的具体解锁关系本次未额外假定，火晶前/火三/火五先列待确认，不直接套用T11获取规则。\n\n';
md+=`## 来源与证据边界\n\n- [冬日工具箱·常规礼包](${regular})，公开接口 https://wjgl.store/api/gift-packs?category=regular ，2026-10-26读取29款。没有找到零件、幸运箱、抛光液或合金的独立常规主奖励档，不能证明游戏内绝对不存在。\n- [冬日工具箱·特惠礼包](${special})：分段进度需逐包核对，不把“一阶段”统一当火晶前。\n- 维护者专家常规礼包截图：public/evidence/expert-regular-packs-2026-10-25.png。\n- 原估值表来源标签与本地对照：docs/price-source-audit-2026-10-25.md。\n- 官方抛光液说明 https://wjdrgl.wjdr.cn/items/polishing-solution/ 仅说明用途和礼包来源，没有独售档位数量。\n\n火晶前混合材料使用获准的火五相对价格比例，价格备注明确标识“比例估算”；不是独售事实。\n`;
await writeFile(new URL('docs/进度礼包对应草案-2026-10-26.md',root),md,'utf8');
await writeFile(new URL('docs/进度礼包对应草案-2026-10-26.json',root),JSON.stringify({asOf:'2026-10-26',groups,candidates},null,2),'utf8');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const table=(heads,rows)=>`<div class="scroll"><table><thead><tr>${heads.map(s=>`<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(s=>`<td>${esc(s)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>各进度礼包对应草案 · 冬日账本</title><style>body{margin:0;background:#f5f7f1;color:#193f38;font:15px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1250px;margin:auto;padding:35px 24px}h1{font-size:30px}h2{margin-top:32px}a{color:#1d6956}.note{padding:18px;background:#e4eddb;border-radius:10px}.scroll{overflow:auto;background:white;border:1px solid #dde5d8;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:14px;text-align:left;border-bottom:1px solid #e7ebdf;vertical-align:top}th{background:#e8efdf;white-space:nowrap}td{min-width:70px}p{color:#60776b}small{color:#738377}</style><main><a href="/">← 返回模型</a><h1>各进度礼包对应草案</h1><p>2026-10-26 · 供维护者核对来源；已同步维护者规则及火三明确礼包</p><div class="note">火晶三：火晶；T11：火晶微粒；火晶八：精炼火晶；三代英雄：专家。未解锁与缺价分开统计。火晶前已按常规礼包补价，混合礼包按获准的火五比例分摊。</div><h2>各进度缺价情况</h2>${table(['进度','参考价','渠道价待确认','缺价','未解锁','待自选'],groups.map(g=>[g.name,g.statuses.reference.length,g.statuses.channel.length,g.statuses.missing.length,g.statuses.locked.length,g.statuses.choice.length]))}<h2>优先核对</h2><p>专家全进度已采用常规礼包；学识动态扣除当前进度8小时加速，七代火八旧价12元已修正为51.104元/千本。橙碎全进度2.5元/个、海岛橙碎全进度6.8元/个；1金印记＝8蓝印记，1蓝印记＝500钻石；秘典按常规混合礼包扣当前材料价。火三已接入萌宠定制等明确礼包。</p><h2>缺价明细</h2>${table(['进度','缺价条目'],groups.map(g=>[g.name,g.statuses.missing.map(i=>i.name).join('、')||'无固定缺价（战歌箱需选择奖励）']))}<h2>道具对应哪些礼包</h2>${table(['道具组','候选礼包/渠道','已知常规30元档','计算口径/待确认'],candidates)}<h2>资料链接</h2><p><a href="${regular}" target="_blank">常规礼包</a> · <a href="${special}" target="_blank">特惠礼包</a> · <a href="/public/evidence/expert-regular-packs-2026-10-25.png" target="_blank">专家礼包截图</a> · <a href="/docs/进度礼包对应草案-2026-10-26.md">完整文字版</a></p><small>公开常规接口29款未收录独售不代表游戏内绝对不存在。更多开放条件、礼包数量及附赠分摊口径待维护者逐项确认。</small></main></html>`;
await writeFile(new URL('docs/进度礼包对应草案-2026-10-26.html',root),html,'utf8');
console.log(JSON.stringify(groups.map(g=>({stage:g.name,missing:g.statuses.missing.length,channel:g.statuses.channel.length})),null,2));
