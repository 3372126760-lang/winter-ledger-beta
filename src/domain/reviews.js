import { STAGES } from './stages.js';

// The entire raw pack is part of the basis: index-based section IDs alone
// cannot safely retain a review after the provider reorders its sections.
export function reviewBasis(pack) {
  return JSON.stringify([pack.id,pack.rawName,pack.note,pack.sections.map(s=>[
    s.title,s.columns,s.rows.map(r=>[r.tierLabel,...r.materials.map(m=>[m.rawName,m.rawQuantity])]),
  ])]);
}

export function validateReviews(value = {}) {
  const fail=()=>{throw new Error('礼包校对记录格式不符，请检查进度、规则和依据');};
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length>1000) fail();
  return Object.fromEntries(Object.entries(value).map(([id,record])=>{
    if (!/^(regular|special)-\d+-s\d+$/.test(id) || !record || !Array.isArray(record.stages)
      || new Set(record.stages).size!==record.stages.length || record.stages.some(s=>!STAGES.some(x=>x.id===s))
      || !['','fixed','choice'].includes(record.rewardMode) || (!record.stages.length&&!record.rewardMode)
      || typeof record.note!=='string' || !record.note.trim() || record.note.length>2000
      || typeof record.basis!=='string' || !record.basis || record.basis.length>120000
      || typeof record.updatedAt!=='string' || record.updatedAt.length>40 || !Number.isFinite(Date.parse(record.updatedAt))) fail();
    return [id,{stages:[...record.stages],rewardMode:record.rewardMode,note:record.note.trim(),basis:record.basis,updatedAt:record.updatedAt}];
  }));
}

export function createReview(pack, section, input, now = new Date().toISOString()) {
  if (!pack.sections.some(s=>s.id===section.id)) throw new Error('礼包分段不属于当前资料');
  if (typeof input?.note !== 'string' || !input.note.trim()) throw new Error('请填写确认依据或新资料说明');
  if (!input.stages?.length && !input.rewardMode) throw new Error('请至少确认适用进度或奖励获取方式');
  return validateReviews({[section.id]:{stages:input.stages,rewardMode:input.rewardMode,note:input.note,basis:reviewBasis(pack),updatedAt:now}})[section.id];
}

export function reviewStatus(pack, section, reviews = {}) {
  const record=reviews[section.id];
  if (!record) return {status:'none',record:null};
  return {status:record.basis===reviewBasis(pack)?'active':'stale',record};
}

export function effectiveSection(pack, section, reviews = {}) {
  const review=reviewStatus(pack,section,reviews);
  if (review.status!=='active') return {...section,review};
  const r=review.record;
  return {...section,review,
    stage:r.stages.length?{status:'reviewed',id:r.stages.length===1?r.stages[0]:null,ids:[...r.stages],reason:'采用个人校对记录；原始进度标注保留'}:section.stage,
    rewardRule:r.rewardMode||section.rewardRule};
}

export function sectionStageIds(section) {
  return section.stage.ids || (section.stage.id?[section.stage.id]:[]);
}

export function reviewRecords(data, reviews = {}) {
  return Object.entries(reviews).map(([id,record])=>{
    const pack=data.packs.find(p=>p.sections.some(s=>s.id===id));
    const section=pack?.sections.find(s=>s.id===id);
    return {id,record,pack,section,status:section?reviewStatus(pack,section,reviews).status:'missing'};
  }).sort((a,b)=>Date.parse(b.record.updatedAt)-Date.parse(a.record.updatedAt));
}

export function reviewStatistics(data, reviews = {}) {
  const records=reviewRecords(data,reviews);
  return {active:records.filter(r=>r.status==='active').length,stale:records.filter(r=>r.status!=='active').length,
    unresolvedSections:data.packs.reduce((n,p)=>n+p.sections.filter(s=>!sectionStageIds(effectiveSection(p,s,reviews)).length).length,0)};
}
