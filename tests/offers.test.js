import {progressFromStage} from '../src/domain/stages.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveStage,mapMaterial,parseCash,normalizePacks,auditOffers,buildGiftDraft} from '../src/domain/offers.js';
import {initialState,validateState} from '../src/domain/model.js';
const data=JSON.parse(await readFile(new URL('../src/data/offers.json',import.meta.url),'utf8'));
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url),'utf8'));
const pack=(name)=>data.packs.find(p=>p.name===name);

test('火晶三前采用用户定义，一阶段和范围阶段不自动归档',()=>{
  assert.equal(resolveStage('火晶三前选加速').id,'pre-crystal');
  assert.equal(resolveStage('战争学院进度').id,'t11');
  for(const title of ['一阶段','第一阶段固定奖励','火晶三-火晶五','火晶五-战争学院期间','战争学院之后进度','礼包内容'])assert.equal(resolveStage(title).id,null);
});
test('材料单位统一：5分钟换小时、经验份数换点数、合金保留实际个数',()=>{
  assert.equal(mapMaterial('5分钟通用加速','156').quantity,13);
  assert.equal(mapMaterial('一万点英雄经验','36').quantity,360000);
  assert.equal(mapMaterial('合金','3000').quantity,3000);
});
test('自选箱不冒充幸运箱，不明确单位和非数字奖励保留未对齐',()=>{
  assert.equal(mapMaterial('英雄装备自选箱','6').itemId,'equipment-choice-box');
  assert.notEqual(mapMaterial('英雄装备自选箱','6').itemId,mapMaterial('英雄装备幸运箱','6').itemId);
  assert.equal(mapMaterial('建筑加速','24').itemId,null);
  assert.equal(mapMaterial('火晶','/').quantity,null);
  assert.equal(mapMaterial('火晶','').quantity,null);
  assert.equal(mapMaterial('火晶','9'.repeat(400)).quantity,null);
  assert.equal(mapMaterial('一万点英雄经验','1000000000000').quantity,null);
});
test('每日档位只提取末尾明确价格，模糊文案不当成价格',()=>{
  assert.equal(parseCash('第一天/30'),30);assert.equal(parseCash('648'),648);
  for(const v of ['免费','0','30-68','约30元','NaN','9'.repeat(400)])assert.equal(parseCash(v),null);
});
test('分段保留原始身份，列数错误停止整理而非静默漏掉材料',()=>{
  const raw={packs:[{id:1,name:'测\n试',sections:[{title:'一阶段',columns:['合金'],rows:[['30','3000']]}]}]};
  const [p]=normalizePacks('regular',raw);assert.equal(p.name,'测试');assert.equal(p.rawName,'测\n试');assert.equal(p.sections[0].stage.id,null);
  raw.packs[0].sections[0].rows[0].push('多余');assert.throws(()=>normalizePacks('regular',raw));
});
test('同时获得模式合并两种通用加速，不遗漏5分钟奖励',()=>{
  const p=pack('部队训练'),s=p.sections.find(s=>s.title==='火晶三前'),r=s.rows[0];
  const draft=buildGiftDraft(p,s,r,'pre-crystal','fixed',[0,1]);
  assert.equal(draft.lines.length,1);assert.equal(draft.lines[0].itemId,'speed-general');
  assert.ok(Math.abs(draft.lines[0].quantity-(18+200/12))<1e-10);assert.equal(draft.cash,30);
});
test('自选模式只填入勾选项目，不把所有自选奖励相加',()=>{
  const p=pack('武备自选'),s=p.sections[0],r=s.rows[0];
  const draft=buildGiftDraft(p,s,r,'fc3','choice',[2]);
  assert.deepEqual(draft.lines,[{itemId:'mastery-stone',quantity:12}]);assert.equal(draft.allowQuotes,false);
});
test('未确认进度、获取方式、未对齐内容及同时获得遗漏项阻止填入',()=>{
  const p=pack('部队训练'),s=p.sections[0],r=s.rows[0];
  assert.throws(()=>buildGiftDraft(p,s,r,'','fixed',[0,1]));
  assert.throws(()=>buildGiftDraft(p,s,r,'fc5','fixed',[0,1]));
  assert.throws(()=>buildGiftDraft(p,s,r,'pre-crystal','',[0,1]));
  assert.throws(()=>buildGiftDraft(p,s,r,'pre-crystal','fixed',[0]));
  const q=pack('奇货自选');assert.throws(()=>buildGiftDraft(q,q.sections[0],q.sections[0].rows[0],'pre-crystal','choice',[0]));
});
test('同名礼包的语义重复与内容冲突分别保留',()=>{
  const audit=auditOffers(data.packs);
  assert.ok(audit.findings.some(f=>f.kind==='name-conflict'&&f.title.startsWith('城镇建设礼包')));
  assert.ok(audit.findings.some(f=>f.kind==='duplicate'&&f.title.startsWith('英雄经验礼包')));
  assert.ok(audit.findings.some(f=>f.kind==='section-ambiguity'&&f.title.includes('神秘藏宝室')));
});
test('资料生成的草稿来源可备份往返，旧备份兼容',()=>{
  const p=pack('部队训练'),s=p.sections[0];const state=initialState();state.stage='pre-crystal';state.progress=progressFromStage(state.stage);
  state.gift=buildGiftDraft(p,s,s.rows[0],state.stage,'fixed',[0,1]);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(state)),items),state);
  assert.doesNotThrow(()=>validateState(initialState(),items));
  state.gift.origin.sourceId='unknown';assert.throws(()=>validateState(state,items));
});
test('全部自动映射的材料都存在于道具库，来源身份唯一，原始数量留存',()=>{
  assert.equal(new Set(data.packs.map(p=>p.id)).size,data.packs.length);
  const ids=new Set(items.map(i=>i.id));
  for(const p of data.packs)for(const s of p.sections)for(const r of s.rows)for(const m of r.materials){
    assert.equal(typeof m.rawQuantity,'string');if(m.itemId)assert.ok(ids.has(m.itemId));
    if(m.quantity!==null)assert.ok(Number.isFinite(m.quantity)&&m.quantity>=0);
  }
});
