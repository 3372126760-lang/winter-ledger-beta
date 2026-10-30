import fs from 'node:fs';
const file='src/data/catalog.json',catalog=JSON.parse(fs.readFileSync(file,'utf8'));
const source='owner-reward-boxes-2026-10-30';
if(!catalog.sources.some(s=>s.id===source))catalog.sources.push({id:source,title:'维护者游戏截图 · 周卡、动员与专家宝箱',url:'',status:'2026-10-30：17张截图，完整录入奖励与概率；按截图与维护者说明记录获取方式。'});
const reward=(itemId,quantity,percent)=>({itemId,quantity,probability:percent/100});
const boxes=[
 ['fire-weekly-chest','火晶周卡宝箱','火晶','火晶周卡每日登录奖励。',[[100,.4],[60,.8],[40,1.6],[20,2.5],[10,8.5],[5,86.2]].map(([q,p])=>reward('fire-crystal',q,p))],
 ['mobilization-supply-chest','动员补给箱','宝箱','联盟总动员达到个人最大积分目标后，每增加200点个人积分，可额外获得1箱。',[reward('orange-shard',1,3),reward('equipment-box',1,4),reward('diamond',1000,6),reward('screw',1,10),reward('speed-general',2*5/60,37),reward('diamond',100,40)]],
 ['seekers-chest','探寻者宝箱','宝箱','艾格尼丝天赋技能：累计采集一定时间可获得。',[reward('fire-crystal',10,1),reward('fire-crystal',1,20),reward('diamond',1000,2),reward('diamond',10,20),reward('screw',1,3),reward('screw',.1,20),reward('speed-general',1,4),reward('speed-general',5/60,30)]],
 ['arena-star-chest','角斗之星宝箱','宝箱','霍尔格天赋技能：每次挑战竞技场有概率获得。',[reward('orange-shard',1,4),reward('mastery-stone',1,6),reward('screw',1,8),reward('screw',.1*2,20),reward('speed-general',1,10),reward('speed-general',5/60,52)]],
 ['ironbark-chest','铁枝宝箱','宝箱','加雷斯一技能：每训练100名士兵可获得。',[reward('fire-crystal',100,.1),reward('troop-defense-boost-2-12h',1,.25),reward('troop-health-boost-2-12h',1,.25),reward('fire-crystal',5,4.4),reward('speed-general',1,10),reward('speed-training',6*5/60,35),reward('speed-healing',6*5/60,50)]],
 ['kingdom-light-chest','王国之光宝箱','宝箱','贾斯特斯天赋技能及三、四技能：探险挂机、雪原游历、发起集结和获胜时有概率获得；具体触发条件以技能等级说明为准。',[reward('speed-learning',8,.7),reward('expert-sail',2,1.8),reward('expert-mark',1,3.5),reward('knowledge',100,5),reward('speed-learning',1,11),reward('speed-learning',5*5/60,30),reward('expert-compass',6,48)]],
 ['elite-guard-chest','精英护卫宝箱','宝箱','罗妮“迅猛反击”升到6级后，雪原商路活动中额外护送不可被掠夺的宝箱。',[reward('diamond',1000,14.2),reward('fire-crystal',5,14.3),reward('orange-shard',1,14.3),reward('chief-design',2,14.3),reward('charm-design',2,14.3),reward('charm-guide',2,14.3),reward('mastery-stone',1,14.3)]],
];
for(const [id,name,category,acquisition,outcomes]of boxes){
 const item={id,name,unit:'个',priceScale:1,category,prices:{},acquisition,valuation:{type:'random',source,outcomes,note:'依据维护者游戏截图，随机获得一项奖励；按概率加权计算每箱期望。10点强化经验零件按0.1个100点零件折算，加速统一换算为小时。'},unlock:id==='fire-weekly-chest'?{fireProgress:'fc3'}:undefined};
 const index=catalog.items.findIndex(i=>i.id===id);if(index<0)catalog.items.push(item);else catalog.items[index]=item;
}
for(const [id,name]of [['troop-defense-boost-2-12h','部队防御力提升2阶（12小时）'],['troop-health-boost-2-12h','部队生命提升2阶（12小时）']]){
 if(!catalog.items.some(i=>i.id===id))catalog.items.push({id,name,unit:'个',priceScale:1,category:'增益',inventoryHidden:true,prices:{},identityNote:'截图已确认奖励身份与概率，价值缺少依据，暂不计完整箱价。'});
}
for(const i of catalog.items)if(['steel','diamond'].includes(i.id)){i.inventoryScale=10000;i.inventoryUnit='万';}
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
