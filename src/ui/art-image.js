import {validLocalArtPath} from '../domain/art.js';

// Screenshot artwork is shown through a CSS viewport; the source image stays intact.
export function artImage(entry,esc) {
  if(!entry||!validLocalArtPath(entry.localPath))return '';
  const s=entry.sprite;
  if(s&&[s.x,s.y,s.width,s.height,entry.width,entry.height].every(Number.isFinite)&&s.width>0&&s.height>0&&s.x>=0&&s.y>=0&&s.x+s.width<=entry.width&&s.y+s.height<=entry.height){
    const size=`${entry.width/s.width*100}% ${entry.height/s.height*100}%`;
    const position=`${s.x/(entry.width-s.width)*100}% ${s.y/(entry.height-s.height)*100}%`;
    return `<span class="item-sprite${s.hideQuantity?' sprite-hide-quantity':''}" role="img" aria-label="${esc(entry.name)}" style="background-image:url('${esc(entry.localPath)}');background-size:${size};background-position:${position}"></span>`;
  }
  return `<img src="${esc(entry.localPath)}" alt="${esc(entry.name)}" width="40" height="40" loading="lazy" decoding="async">`;
}
