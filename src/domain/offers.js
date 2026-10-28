import { STAGES } from './model.js';
import {isRemovedItem} from './art.js';

export const OFFER_SOURCES = {
  regular: { name: '常规礼包', url: 'https://wjgl.store/function/Zero/regular-gift-data.html', api: 'https://wjgl.store/api/gift-packs?category=regular' },
  special: { name: '特惠礼包', url: 'https://wjgl.store/function/Zero/special-gift-data.html', api: 'https://wjgl.store/api/gift-packs?category=special' },
};
export const normalizeName = text => String(text ?? '').replace(/\s/g, '');

export function resolveStage(title) {
  const text = normalizeName(title);
  if (text.startsWith('火晶三前')) return { status: 'exact', id: 'pre-crystal', reason: '按用户定义，“火晶三前”归为火晶前' };
  for (const [prefix, id] of [['火晶三进度', 'fc3'], ['火晶五进度', 'fc5'], ['战争学院进度', 't11']]) {
    if (text.startsWith(prefix)) return { status: 'exact', id, reason: '原资料明确标注进度' };
  }
  return { status: 'unresolved', id: null, reason: /阶段/.test(text) ? '各礼包的阶段需分别确认' : /火晶|战争学院/.test(text) ? '进度范围的边界需确认' : '资料未标明适用进度' };
}

const aliases = new Map();
function alias(names, itemId, factor = 1) { for (const name of names) aliases.set(normalizeName(name), { itemId, factor }); }
alias(['强化经验零件', '螺丝', '100点强化经验', '100点强化经验零件'], 'screw');
alias(['装备箱子', '英雄装备幸运箱', '英雄装备幸运宝箱'], 'equipment-box');
alias(['专精石', '专精石头', '专精能源石'], 'mastery-stone');
alias(['宝石图纸'], 'charm-design'); alias(['宝石手册'], 'charm-guide'); alias(['宝石秘典', '秘典'], 'codex');
alias(['设计图纸'], 'chief-design'); alias(['抛光液'], 'polish'); alias(['合金', '强韧合金'], 'alloy');
alias(['琥珀','月光琥珀'], 'amber'); alias(['秘银'], 'mithril'); alias(['火晶'], 'fire-crystal'); alias(['火晶微粒'], 'fire-particle');
alias(['钢材'], 'steel'); alias(['宠物口粮'], 'pet-food'); alias(['普通野性印记'], 'pet-blue'); alias(['高级野性印记'], 'pet-gold');
alias(['传说通用英雄信物', '传说英雄信物'], 'orange-shard');
for(const [name,id] of [['传说英雄装备','orange-gear'],['领主装备材料宝箱','chief-box'],['宠物突破材料自选箱','pet-box'],['行军加速器1阶','march-speed-1'],['行军加速器2阶','march-speed-2'],['2小时反侦察','anti-scout-2h'],['火晶宝箱','fire-crystal-box']])alias([name],id);
for (const [name,id] of [
  ['茉莉碎片','molly-shard'],['传说探险技能书','exploration-book'],['传说远征技能书','expedition-book'],['黄金钥匙','golden-key'],
  ['驯兽手册','pet-manual'],['活力药剂','pet-vitality'],['强化血清','pet-serum'],['神秘徽章','mystic-badge'],
  ['N-1代英雄组件自选箱','previous-hero-component'],['移民授权书','migration-ticket'],['英雄装备自选箱','equipment-choice-box'],
  ['突破材料自选箱','pet-box'],['火晶余烬','fire-ember'],['高级迁城','advanced-teleport'],['随机迁城','random-teleport'],
  ['二阶行军加速','march-speed-2'],['一阶行军加速','march-speed-1'],['出征召回','march-recall'],['两小时反侦察','anti-scout-2h'],
  ['英勇之证','heroic-proof'],['英雄组件自选箱','hero-component-choice'],['英雄战歌自选箱','hero-song-choice'],
]) alias([name],id);
alias(['一万点英雄经验', '1万点经验', '1万点英雄经验'], 'hero-xp', 10000); alias(['5000点英雄经验'], 'hero-xp', 5000);
for (const [type,id] of [['通用','speed-general'],['建造','speed-build'],['研究','speed-research'],['训练','speed-training'],['医疗','speed-healing'],['学习','speed-learning']]) {
  alias([`1小时${type}加速`,`一小时${type}加速`],id);
  alias([`5分钟${type}加速`,`五分钟${type}加速`],id,1/12);
}

export function mapMaterial(rawName, rawQuantity) {
  const mapped = aliases.get(normalizeName(rawName));
  const text = String(rawQuantity ?? '').trim();
  const parsed = /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : null;
  const numeric = parsed !== null && Number.isFinite(parsed) && parsed <= 1e12 ? parsed : null;
  const quantity = mapped && numeric !== null ? numeric * mapped.factor : null;
  return { rawName: String(rawName), rawQuantity: text, itemId: mapped?.itemId ?? null,
    quantity: quantity !== null && Number.isFinite(quantity) && quantity <= 1e12 ? quantity : null,
    conversion: mapped ? (mapped.factor === 1 ? '实际数量' : mapped.factor === 1/12 ? '5分钟换算为小时' : `${mapped.factor}点经验／份`) : '道具身份或单位待确认' };
}

export function parseCash(label) {
  const text = String(label).trim();
  const match = text.match(/^(?:[^/]+\/)?(\d+(?:\.\d+)?)$/);
  const value = match ? Number(match[1]) : null;
  return value !== null && Number.isFinite(value) && value > 0 && value <= 1e12 ? value : null;
}

export function normalizePacks(category, raw) {
  if (!OFFER_SOURCES[category] || !Array.isArray(raw?.packs)) throw new Error('礼包来源格式不符');
  return raw.packs.map(pack => {
    if (!Number.isInteger(pack.id) || typeof pack.name !== 'string' || !Array.isArray(pack.sections)) throw new Error('礼包条目缺少身份或内容');
    const id = `${category}-${pack.id}`;
    return { id, category, rawName: pack.name, name: normalizeName(pack.name), note: String(pack.note || ''), source: category,
      sections: pack.sections.map((section, index) => {
        if (!Array.isArray(section.columns) || !Array.isArray(section.rows)) throw new Error('礼包分段格式不符');
        const sectionId = `${id}-s${index}`;
        return { id: sectionId, title: String(section.title || '未标明阶段'), stage: resolveStage(section.title),
          columns: section.columns.map(String), rewardRule: 'unverified',
          rows: section.rows.map((row, rowIndex) => {
            if (!Array.isArray(row) || row.length !== section.columns.length + 1) throw new Error('礼包奖励列数与数量不符');
            return { id: `${sectionId}-r${rowIndex}`, tierLabel: String(row[0]), cash: parseCash(row[0]),
              materials: section.columns.map((name, i) => mapMaterial(name, row[i+1])) };
          }) };
      }) };
  });
}

function contentSignature(pack) {
  return JSON.stringify(pack.sections.map(section => ({ title: normalizeName(section.title), rows: section.rows.map(row => ({ cash: row.cash,
    materials: row.materials.map(m => [m.itemId || normalizeName(m.rawName), m.quantity ?? m.rawQuantity]) })) })));
}

export function auditOffers(packs) {
  const names = new Map(), findings = [], unresolvedMaterials = new Map();
  let unresolvedSections = 0;
  for (const pack of packs) {
    const group = names.get(pack.name) || []; group.push(pack); names.set(pack.name,group);
    const sectionGroups = new Map();
    for (const section of pack.sections) {
      if (section.stage.status !== 'exact') unresolvedSections++;
      const same = sectionGroups.get(section.title) || []; same.push(section); sectionGroups.set(section.title,same);
      for (const row of section.rows) for (const material of row.materials) {
        if (!material.itemId || material.quantity === null) unresolvedMaterials.set(material.rawName, (unresolvedMaterials.get(material.rawName) || 0) + 1);
      }
    }
    for (const [title, sections] of sectionGroups) if (sections.length > 1) {
      findings.push({ kind: 'section-ambiguity', packIds: [pack.id], title: `${pack.name}：${title}重复`,
        detail: `有${sections.length}组同名分段，保留全部内容，待确认其适用条件。` });
    }
  }
  for (const [name, group] of names) if (group.length > 1) {
    const different = new Set(group.map(contentSignature)).size > 1;
    findings.push({ kind: different ? 'name-conflict' : 'duplicate', packIds: group.map(p=>p.id), title: `${name}：同名${group.length}条`,
      detail: different ? '名称一致但奖励内容不同，未自动合并。' : '奖励内容一致，保留来源条目，标记为疑似重复。' });
  }
  return { findings, unresolvedSections, unresolvedMaterials: Array.from(unresolvedMaterials, ([name, count])=>({name,count})) };
}

export function buildGiftDraft(pack, section, row, stage, mode, selected) {
  if (!STAGES.some(s=>s.id===stage)) throw new Error('请先选择本次采用的王国进度');
  if (section.stage.status === 'exact' && section.stage.id !== stage) throw new Error('本次采用的进度与原始资料明确标注的进度不符');
  if (section.stage.status === 'reviewed' && !section.stage.ids.includes(stage)) throw new Error('本次进度不在已保存的适用进度中，请先修改校对记录');
  if (!['fixed','choice'].includes(mode)) throw new Error('请先确认奖励是同时获得，还是自选后获得');
  if (['fixed','choice'].includes(section.rewardRule) && section.rewardRule !== mode) throw new Error('奖励获取方式与已保存校对不同，请先修改校对记录');
  if (!Number.isFinite(row.cash) || row.cash <= 0) throw new Error('这个档位的现金价格需要确认');
  if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length || selected.some(i=>!Number.isInteger(i)||i<0||i>=row.materials.length)) throw new Error('请选择本次实际获得的材料');
  if (mode === 'fixed' && selected.length !== row.materials.length) throw new Error('同时获得模式需要保留全部材料');
  const contents = selected.map(i=>row.materials[i]).filter(m=>!isRemovedItem(m));
  if (contents.some(m=>!m.itemId || !Number.isFinite(m.quantity) || m.quantity < 0 || m.quantity > 1e12 || (!m.itemId.startsWith('speed-') && !Number.isInteger(m.quantity)))) throw new Error('所选材料的名称、单位或数量尚未对齐，请先手工录入');
  const merged = new Map();
  for (const m of contents) merged.set(m.itemId,(merged.get(m.itemId)||0)+m.quantity);
  if (![...merged.values()].some(n=>n>0)) throw new Error('没有可导入的正数量材料');
  return { name: `${pack.name} · ${section.title}`, cash: row.cash, allowQuotes: false,
    lines: Array.from(merged,([itemId,quantity])=>({itemId,quantity})),
    origin: { packId:pack.id, packName:pack.name, sectionTitle:section.title, tierLabel:row.tierLabel, mode, sourceId:pack.source } };
}
