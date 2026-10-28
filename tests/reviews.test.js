import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createReview,effectiveSection,reviewStatus,reviewStatistics,reviewRecords,validateReviews,sectionStageIds} from '../src/domain/reviews.js';
import {buildGiftDraft} from '../src/domain/offers.js';
import {initialState,validateState} from '../src/domain/model.js';
const data=JSON.parse(await readFile(new URL('../src/data/offers.json',import.meta.url),'utf8'));
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url),'utf8'));
const pack=data.packs.find(p=>p.name==='工匠宝库宝石装备');
const section=pack.sections[0];
const input={stages:['pre-crystal','fc3'],rewardMode:'fixed',note:'测试依据：仅验证记录机制，不作游戏结论。'};
const now='2026-10-24T14:00:00.000Z';
const record=()=>createReview(pack,section,input,now);

test('校对分段独立，同名一阶段不会同步到其他礼包或分段',()=>{
  const reviews={[section.id]:record()};
  assert.deepEqual(sectionStageIds(effectiveSection(pack,section,reviews)),input.stages);
  assert.equal(effectiveSection(pack,pack.sections[1],reviews).stage.id,null);
  const other=data.packs.find(p=>p.name==='宝石匠人');
  assert.equal(effectiveSection(other,other.sections[0],reviews).stage.id,null);
  assert.equal(section.stage.id,null);
});
test('已确认多进度进入草稿校验，未确认进度不能使用这份校对',()=>{
  const resolved=effectiveSection(pack,section,{[section.id]:record()});
  assert.doesNotThrow(()=>buildGiftDraft(pack,resolved,resolved.rows[0],'pre-crystal','fixed',[0,1]));
  assert.doesNotThrow(()=>buildGiftDraft(pack,resolved,resolved.rows[0],'fc3','fixed',[0,1]));
  assert.throws(()=>buildGiftDraft(pack,resolved,resolved.rows[0],'fc5','fixed',[0,1]));
  assert.throws(()=>buildGiftDraft(pack,resolved,resolved.rows[0],'fc3','choice',[0]));
});
test('只修订奖励规则时原始进度不被覆盖，也不强行归入火晶前',()=>{
  const r=createReview(pack,section,{stages:[],rewardMode:'choice',note:'仅确认选择关系'},now);
  const effective=effectiveSection(pack,section,{[section.id]:r});
  assert.equal(effective.stage.id,null);assert.equal(effective.rewardRule,'choice');
});
test('来源数量变化后校对暂停，不使用旧进度和旧奖励规则',()=>{
  const reviews={[section.id]:record()},changed=structuredClone(pack);
  changed.sections[0].rows[0].materials[0].rawQuantity='31';
  const e=effectiveSection(changed,changed.sections[0],reviews);
  assert.equal(e.review.status,'stale');assert.equal(e.stage.id,null);assert.equal(e.rewardRule,'unverified');
  assert.equal(reviewStatus(pack,section,reviews).status,'active');
});
test('分段重新排序或同礼包另一分段改变时同样需要重新核对',()=>{
  const reviews={[section.id]:record()},changed=structuredClone(pack);
  changed.sections.reverse();assert.equal(reviewStatus(changed,changed.sections.find(s=>s.id===section.id),reviews).status,'stale');
  const siblingChanged=structuredClone(pack);siblingChanged.sections[1].title+='（更新）';
  assert.equal(reviewStatus(siblingChanged,siblingChanged.sections[0],reviews).status,'stale');
});
test('仅内部材料映射更新不会把未变动的原始资料误判为来源变化',()=>{
  const reviews={[section.id]:record()},changed=structuredClone(pack);
  changed.sections[0].rows[0].materials[0].conversion='新的内部说明';
  assert.equal(reviewStatus(changed,changed.sections[0],reviews).status,'active');
});
test('重核保存后刷新依据，恢复原始不修改来源',()=>{
  const changed=structuredClone(pack);changed.sections[0].rows[0].materials[0].rawQuantity='32';
  const fresh=createReview(changed,changed.sections[0],input,now);
  assert.equal(reviewStatus(changed,changed.sections[0],{[section.id]:fresh}).status,'active');
  assert.equal(effectiveSection(changed,changed.sections[0],{}).stage.id,null);
  assert.equal(section.rows[0].materials[0].rawQuantity,'30');
});
test('统计区分生效、来源变化与来源丢失，不把过期校对计作完成',()=>{
  const reviews={[section.id]:record()};
  assert.equal(reviewStatistics(data,reviews).unresolvedSections,data.audit.unresolvedSections-1);
  const missing={...reviews,'special-99999-s0':record()};
  assert.equal(reviewStatistics(data,missing).active,1);assert.equal(reviewStatistics(data,missing).stale,1);
  assert.equal(reviewRecords(data,missing).find(r=>r.id==='special-99999-s0').status,'missing');
});
test('备份保留校对；不包含校对字段的旧备份自动迁移为空记录',()=>{
  const state=initialState();state.offerReviews={[section.id]:record()};
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(state)),items),state);
  delete state.offerReviews;assert.deepEqual(validateState(state,items).offerReviews,{});
});
test('空依据、无进度无规则、重复进度和非法字段拒绝保存',()=>{
  for(const change of [x=>x.note=' ',x=>x.stages=['unknown'],x=>x.stages=['fc3','fc3'],x=>x.updatedAt='no-date',x=>x.basis='',x=>x.rewardMode='all']){
    const r=record();change(r);assert.throws(()=>validateReviews({[section.id]:r}));
  }
  assert.throws(()=>createReview(pack,section,{stages:[],rewardMode:'',note:'只有备注'},now),/至少确认/);
  assert.throws(()=>createReview(pack,section,{...input,note:''},now),/填写确认依据/);
  assert.throws(()=>validateReviews({'__invalid__':record()}));
});
