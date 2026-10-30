import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createArtResolver, filterArt, MODEL_ART_NAMES, validLocalArtPath, selectNeededArt, galleryArt, galleryProgressArt } from '../src/domain/art.js';

const data=JSON.parse(await readFile(new URL('../src/data/item-art.json',import.meta.url)));
const catalog=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const resolve=createArtResolver(data.entries,catalog.items);

test('红框新增五项不再进入展示，组件箱按实际英雄代数切换且未知原图不冒用七代',()=>{
  const active=galleryArt(catalog.items);
  for(const id of ['molly-shard','previous-hero-component','equipment-choice-box','rare-gear','epic-gear'])assert.equal(active.some(i=>i.id===id),false);
  let generation=1;
  const dynamic=createArtResolver(data.entries,catalog.items,()=>generation);
  const paths=new Set();
  for(generation=1;generation<=7;generation++){
    const art=dynamic('hero-component-choice');paths.add(art.localPath);
    assert.equal(art.heroGeneration,generation);assert.equal(art.representative,false);
  }
  assert.equal(paths.size,7);
  for(generation=8;generation<=15;generation++){
    const art=dynamic('hero-component-choice');
    assert.equal(art.displayGeneration,generation);assert.equal(art.representative,generation>=12);
    if(generation<=10)assert.ok(art.sprite);
    else if(generation===11)assert.match(art.caption,/11代专武箱/);
    else assert.match(art.caption,/盾兵专武代用图/);
    assert.equal(paths.has(art.localPath),false);
    assert.equal(galleryProgressArt(data.entries,generation).filter(e=>e.modelItemId==='hero-component-choice').length,1);
  }
});

test('全部贴图均已保存，文件内容与清单一致',async()=>{
  assert.equal(data.entries.length,data.entryCount);
  assert.equal(new Set(data.entries.map(e=>e.localPath)).size,data.uniqueImageCount);
  assert.deepEqual(data.failedUrls,[]);
  const unique=new Map(data.entries.map(e=>[e.localPath,e]));
  for(const [path,entry] of unique){
    assert.ok(validLocalArtPath(path));
    const bytes=await readFile(new URL('..'+path,import.meta.url));
    assert.equal(bytes.length,entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
    assert.ok(entry.width>0&&entry.height>0);
  }
});
test('明确别名均有对应贴图，数量单位不影响图标身份',()=>{
  for(const [id,names] of Object.entries(MODEL_ART_NAMES)){
    assert.ok(resolve(id),id);
    assert.ok(names.includes(resolve(id).name),id);
  }
  assert.equal(resolve('100点强化经验零件').name,'强化经验零件');
  assert.equal(resolve('equipment-box').name,'英雄装备幸运宝箱');
  assert.equal(resolve('chief-box').name,'领主装备材料宝箱');
});
test('同名异图及不明确箱子不自动匹配',()=>{
  const ambiguous=createArtResolver([{name:'同名道具',localPath:data.entries[0].localPath},{name:'同名道具',localPath:data.entries[1].localPath}],[]);
  assert.equal(ambiguous('同名道具'),null);
  assert.equal(resolve('equipment-choice-box'),null);
  assert.equal(resolve('不存在的材料'),null);

});
test('只使用本地贴图地址',()=>{
  for(const path of ['https://example.com/a.webp','javascript:alert(1)','/public/assets/items/../secret.webp'])assert.equal(validLocalArtPath(path),false);
  assert.equal(createArtResolver([{name:'test',localPath:'https://example.com/a.webp'}],[])('test'),null);
});
test('图鉴按名称与分类筛选，保留同名条目',()=>{
  const gems=filterArt(data.entries,'宝石');
  assert.ok(gems.length>0);
  assert.ok(gems.every(e=>(e.name+e.category).includes('宝石')));
  const category=data.entries[0].category;
  assert.ok(filterArt(data.entries,'',category).every(e=>e.category===category));
  assert.equal(filterArt(data.entries,'生命萌芽').length,data.entries.filter(e=>e.name==='生命萌芽').length);
});


test('当前图鉴仅收录模型及已录入礼包奖励需要的贴图',async()=>{
  const expert=JSON.parse(await readFile(new URL('../src/data/expert-packs.json',import.meta.url)));
  const extras=expert.packs.flatMap(p=>p.primaryRewards.map(r=>r.name).filter(Boolean));
  const selected=selectNeededArt(data.entries,catalog.items,extras);
  assert.equal(selected.length,data.entries.length);
  assert.equal(new Set(selected.map(e=>e.name+'|'+e.localPath)).size,selected.length);
  for(const name of ['梦幻铃铛','雪铲'])assert.equal(data.entries.some(e=>e.name===name),false);
  for(const name of ['征服之帆','炙热之心','英雄装备幸运宝箱'])assert.ok(data.entries.some(e=>e.name===name));
});
