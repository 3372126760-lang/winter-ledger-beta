import { filterArt, validLocalArtPath, galleryProgressArt } from '../domain/art.js';
import {artImage} from './art-image.js';

export function createArtPanel(data, {esc,fmt,getGeneration=()=>1,visibleEntries=entries=>entries}) {
  const sourceEntries=data.entries;
  const refresh=()=>{const entries=visibleEntries(galleryProgressArt(sourceEntries,getGeneration())); data={...data,entries,entryCount:entries.length,uniqueImageCount:new Set(entries.filter(e=>validLocalArtPath(e.localPath)).map(e=>e.localPath)).size,failedUrls:[]};};
  let query='',current=0;
  const size=48;
  function view() {
    refresh();
    return `<div class="page-title"><div><p class="eyebrow">ITEM ART LIBRARY</p><h1>道具图鉴</h1><p class="description">只展示当前模型道具及已录入礼包奖励所需的贴图。可按名称查找，后续按需补充。</p></div><span class="pill green">${fmt(data.uniqueImageCount-data.failedUrls.length)} 张本地图片</span></div><section class="card"><div class="section-heading"><div><h2>${fmt(data.entryCount)} 个相关道具</h2><p class="hint">贴图来源：<a href="${esc(data.sourceUrl)}" target="_blank" rel="noreferrer">${esc(data.sourceName)} ↗</a> ${(data.additionalSources||[]).map(s=>` · <a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.name)} ↗</a>`).join('')} · 快照 ${esc(data.asOf)}</p></div></div><div class="art-controls"><label>搜索道具<input id="art-query" placeholder="例如：宝石、火晶、专精能源石" value="${esc(query)}"></label></div><div class="art-result-bar"><span id="art-count"></span><span>仅收录当前需要的贴图；缺价道具仍保留待补</span></div><div id="art-grid" class="art-grid"></div><div id="art-pages" class="art-pages"></div></section>`;
  }
  function update() {
    const rows=filterArt(data.entries,query),pages=Math.max(1,Math.ceil(rows.length/size));current=Math.min(current,pages-1);
    document.querySelector('#art-count').textContent=`${fmt(rows.length)} 个结果`;
    document.querySelector('#art-grid').innerHTML=rows.slice(current*size,(current+1)*size).map(entry=>{
      const available=validLocalArtPath(entry.localPath);
      const inner=`<div class="art-card-image">${available?`${artImage(entry,esc)}${entry.representative?`<span class="art-generation">S${entry.displayGeneration}</span>`:''}`:'<span>图片待补</span>'}</div><strong>${esc(entry.name)}</strong>${entry.caption?`<small>${esc(entry.caption)}</small>`:''}`;
      return available?`<a class="art-card" href="${esc(entry.localPath)}" target="_blank" rel="noreferrer" title="查看${esc(entry.name)}原图">${inner}</a>`:`<div class="art-card">${inner}</div>`;
    }).join('')||'<p class="hint">没有找到匹配的道具。</p>';
    document.querySelector('#art-pages').innerHTML=`<button class="button quiet" id="art-prev" ${current===0?'disabled':''}>上一页</button><span>${current+1} / ${pages}</span><button class="button quiet" id="art-next" ${current===pages-1?'disabled':''}>下一页</button>`;
    document.querySelector('#art-prev').addEventListener('click',()=>{current=Math.max(0,current-1);update();});
    document.querySelector('#art-next').addEventListener('click',()=>{current=Math.min(pages-1,current+1);update();});
  }
  function bind() {
    document.querySelector('#art-query').addEventListener('input',e=>{query=e.target.value;current=0;update();});
    update();
  }
  return {view,bind};
}
