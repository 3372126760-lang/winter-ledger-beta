import {BASE_PATH} from '../runtime.js';
export const MODEL_ART_NAMES = {
  screw: ['强化经验零件'], 'orange-shard': ['传说通用英雄信物'],
  'equipment-box': ['英雄装备幸运宝箱'], 'mastery-stone': ['专精能源石'],
  codex: ['宝石秘典'], alloy: ['强韧合金'], 'chief-design': ['设计图纸'],
  'chief-box': ['领主装备材料宝箱'], amber: ['月光琥珀'],
  'pet-gold': ['高级野性印记'], 'pet-blue': ['普通野性印记'],
  'pet-box': ['宠物突破材料自选箱'],
  'march-speed-1': ['行军加速器1阶'], 'march-speed-2': ['行军加速器2阶'],
  'anti-scout-2h': ['2小时反侦察'],
};
const RAW_ART_NAMES = {
  '100点强化经验零件': '强化经验零件', '100点强化经验': '强化经验零件',
  '英雄装备幸运箱': '英雄装备幸运宝箱', '专精石头': '专精能源石',
  '合金': '强韧合金', '宝石材料随机宝箱': '领主宝石材料随机宝箱',
};
export const normalizeArtName = value => String(value ?? '').normalize('NFKC').replace(/\s/g,'').toLowerCase();
// Owner-selected gallery scope; source records remain available to historical packs.
const excludedGalleryNames = new Set([
  '征途补给', '英雄经验', '传说探险技能书', '传说远征技能书', '黄金钥匙',
  '火晶余烬', '高级迁城', '随机迁城', '行军加速器2阶', '行军加速器1阶',
  '出征召回', '2小时反侦察', '英勇之证',
  '茉莉碎片', 'N-1代英雄组件自选箱', '英雄装备自选箱', '稀有英雄装备', '史诗英雄装备',
  '移民授权书',
].map(normalizeArtName));
const removedItemIds = new Set(['journey','hero-xp','exploration-book','expedition-book','golden-key','fire-ember','advanced-teleport','random-teleport','march-speed-2','march-speed-1','march-recall','anti-scout-2h','heroic-proof','molly-shard','previous-hero-component','equipment-choice-box','rare-gear','epic-gear']);
export const isRemovedItem = item => (typeof item==='string'?item:item?.itemId||item?.id)==='migration-ticket'||removedItemIds.has(typeof item==='string'?item:item?.itemId||item?.id)||excludedGalleryNames.has(normalizeArtName(item?.name||item?.rawName||item));
export const galleryArt = entries => entries.filter(entry=>!isRemovedItem(entry));
export const validLocalArtPath = path => typeof path==='string' && path.startsWith(BASE_PATH) && /^public\/assets\/items\/[a-f0-9]{24}\.(webp|png|jpg|jpeg|gif|avif)$/.test(path.slice(BASE_PATH.length));

export function progressArt(entries, generation=1) {
  const exact=entries.find(e=>e.modelItemId==='hero-component-choice'&&e.heroGeneration===generation);
  const entry=exact||entries.find(e=>e.modelItemId==='hero-component-choice'&&e.heroGeneration===0);
  return entry?{...entry,name:`第${generation}代英雄组件自选箱`,displayGeneration:generation,representative:entry.representative??!exact,caption:entry.caption||(!exact?'通用代用图 · 原图待补':'')}:null;
}
export function galleryProgressArt(entries,generation=1) {
  const current=progressArt(entries,generation);
  return [...galleryArt(entries).filter(e=>e.modelItemId!=='hero-component-choice'),...(current?[current]:[])];
}
export function createArtResolver(entries, items, getGeneration=()=>1) {
  const byName=new Map();
  for (const entry of entries) {
    if (!validLocalArtPath(entry.localPath)) continue;
    const name=normalizeArtName(entry.name), list=byName.get(name)||[];
    list.push(entry);byName.set(name,list);
  }
  const find = name => {
    const list=byName.get(normalizeArtName(name))||[];
    return new Set(list.map(e=>e.localPath)).size===1?list[0]:null;
  };
  return input => {
    const item=typeof input==='object'?input:items.find(i=>i.id===input||[i.name,...(i.aliases||[])].some(n=>normalizeArtName(n)===normalizeArtName(input)));
    if (item) {
      if(item.id==='hero-component-choice'||item.artGeneration)return progressArt(entries,item.artGeneration||getGeneration());
      for (const name of (item.artName?[item.artName]:MODEL_ART_NAMES[item.id]||[item.name])) { const found=find(name);if(found)return found; }
      return null;
    }
    return find(RAW_ART_NAMES[input]||input);
  };
}

export function filterArt(entries, query='', category='all') {
  const text=normalizeArtName(query);
  return entries.filter(entry=>(category==='all'||entry.category===category)&&normalizeArtName(entry.name).includes(text));
}

export function selectNeededArt(entries,items,extraNames=[]) {
  const resolve=createArtResolver(entries,items),selected=new Map();
  for(const input of [...items,...extraNames]){
    if(input?.id==='hero-component-choice'){
      for(const entry of entries.filter(e=>e.modelItemId===input.id))selected.set(entry.name+'|'+entry.localPath,entry);
    }
    const entry=resolve(input);
    if(entry)selected.set(entry.name+'|'+entry.localPath,entry);
  }
  return [...selected.values()];
}
