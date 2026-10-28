import heroArt from '../data/hero-gear-art.json' with {type:'json'};
import {validateBattleProfile} from '../domain/battle-profile.js';
export const GROWTH_SYSTEMS=['hero-gear','experts','buildings','pets'];
export function growthRecordsView(data,systemId,state,esc,{mode='planning'}={}){
 const currentOnly=mode==='current',fields=currentOnly?['levels']:['levels','planned'];
 const system=data.systems.find(s=>s.id===systemId),p=validateBattleProfile(state.battleProfile);
 if(!system||!GROWTH_SYSTEMS.includes(systemId))return '';
 const field=(path,type)=>{const value=p[type][path.id],rows=[...(path.baseline?[path.baseline]:[]),...path.rows],known=rows.some(r=>r.level===value);return `<label>${type==='levels'?'当前':'计划'}<select data-growth-record="${type}" data-growth-path="${esc(path.id)}" data-growth-system="${systemId}"><option value="">${type==='levels'?'未记录':'未设置'}</option>${value!==undefined&&!known?`<option value="${value}" selected>${value}级（原记录，档位待核对）</option>`:''}${rows.map(r=>`<option value="${r.level}" ${r.level===value?'selected':''}>${esc(r.label||r.level+'级')}</option>`).join('')}</select></label>`;};
 if(systemId==='hero-gear'){
  return `<section class="card growth-records hero-gear-board"><h2>英雄装备 · ${currentOnly?'当前等级':'当前与计划'}</h2><p class="hint">盾、矛、射各四件，共12件。每件强化与专精分别保存；橙装1—100级，红装1—100级。</p>${[['infantry','盾兵'],['lancer','矛兵'],['marksman','射手']].map(([troop,name])=>`<section class="hero-troop-group"><h3>${name}装备 · 4件</h3><div class="hero-piece-grid">${['goggles','gloves','belt','boots'].map(slot=>{
   const strength=system.paths.find(x=>x.heroGearSlot?.troop===troop&&x.heroGearSlot.slot===slot&&x.heroGearSlot.kind==='strength'),mastery=system.paths.find(x=>x.heroGearSlot?.troop===troop&&x.heroGearSlot.slot===slot&&x.heroGearSlot.kind==='mastery');
   if(!strength||!mastery)return '';
   const label={goggles:'护目镜',gloves:'手套',belt:'腰带',boots:'战靴'}[slot];
   const entry=heroArt[troop+'-'+slot],level=p.levels[strength.id],master=p.levels[mastery.id],red=level>100,enhance=red?level-100:level,badgeColor=!red?'normal':enhance>=100?'red':enhance>=80?'orange':enhance>=60?'purple':enhance>=40?'blue':'green';
   
   const icon=`<span class="hero-game-icon hero-clean-icon ${red?'is-red':'is-orange'}" role="img" aria-label="${esc(entry.name)}${level===undefined?'':`，${red?'红装':'橙装'}${enhance}级`}${master===undefined?'':`，专精${master}级`}"><canvas class="hero-original-art" width="116" height="116" data-original-gear="${troop}-${slot}" data-original-red="${red}" aria-hidden="true"></canvas>${level===undefined?'':`<b class="hero-enhance-badge badge-${badgeColor}">+${enhance}</b>`}${master===undefined?'':`<b class="hero-mastery-badge">${master}级</b>`}</span>`;
   return `<article class="hero-piece"><div class="hero-piece-heading">${icon}<div><h4>${name} · ${esc(entry.name)}</h4><small>${['goggles','boots'].includes(slot)?'兵种穿透':'兵种生命'}</small></div></div>${[[strength,'强化等级'],[mastery,'专精等级']].map(([path,title])=>`<div class="hero-track"><strong>${title}</strong><div class="chief-inline-levels ${currentOnly?'hero-current-only':''}">${fields.map(type=>field(path,type)).join('')}</div></div>`).join('')}</article>`;
  }).join('')}</div></section>`).join('')}<p class="hint">装备使用游戏原图，保留原始造型；红装仅替换与边缘连通的橙色底面。等级角标独立显示。右上强化、右下专精；未记录时不显示角标。专精子阶段消耗待核对，当前按整级计算。</p></section>`;
 }
 return `<section class="card growth-records"><h2>${esc(system.name)} · ${currentOnly?'当前等级':'当前与计划'}</h2><p class="hint">${currentOnly?'这里仅记录当前等级，计划目标在提升规划中填写。':'当前等级与账号同步；计划目标单独保存。'}缺资料的档位不估算消耗。</p><div class="inventory-grid">${system.paths.filter(path=>!path.heroGearTemplate||p.levels[path.id]!==undefined||p.planned[path.id]!==undefined).map(path=>`<article><h3>${esc(path.name)}</h3>${path.heroGearSlot?`<p class="hint">${['goggles','boots'].includes(path.heroGearSlot.slot)?'对应兵种穿透部位':'对应兵种生命部位'} · ${path.heroGearSlot.kind==='strength'?'橙装1—100／红装1—100':'专精等级独立记录'}</p>`:''}<div class="chief-inline-levels" ${currentOnly?'style="grid-template-columns:1fr"':''}>${fields.map(type=>field(path,type)).join('')}</div></article>`).join('')}${systemId==='experts'?`<article><h3>加雷斯专家等级（独立记录）</h3><p class="hint">旧记录保留；对应等级效果待补，不自动计入收益。</p>${fields.map(type=>`<label>${type==='levels'?'当前':'计划'}<input type="number" min="0" step="1" data-growth-record="${type}" data-growth-path="gareth" data-growth-system="experts" value="${p[type].gareth??''}"></label>`).join('')}</article>`:''}</div></section>`;
}
export function bindGrowthRecords({getState,onSave,onSelect,onRefresh}){
 paintOriginalGear();
 document.querySelectorAll('[data-growth-record]').forEach(e=>e.addEventListener('change',()=>{
  const profile=validateBattleProfile(getState().battleProfile),group=profile[e.dataset.growthRecord],id=e.dataset.growthPath;
  if(e.value==='')delete group[id];else group[id]=Number(e.value);
  onSave(validateBattleProfile(profile));
  if(onSelect&&id!=='gareth')onSelect(e.dataset.growthSystem,id,profile);else onRefresh?.();
 }));
}

const originalSheets=new Map();
async function paintOriginalGear(){
 for(const canvas of document.querySelectorAll('[data-original-gear]')){
  const tile=heroArt[canvas.dataset.originalGear];if(!tile)continue;
  const url='/public/assets/hero-gear/game-hero-'+tile.file+'.png';
  if(!originalSheets.has(url))originalSheets.set(url,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;}));
  try{
   const image=await originalSheets.get(url);if(!canvas.isConnected)continue;
   const work=document.createElement('canvas');work.width=work.height=tile.size;
   const ctx=work.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,tile.x,tile.y,tile.size,tile.size,0,0,tile.size,tile.size);
   if(canvas.dataset.originalRed==='true'){
    const pixels=ctx.getImageData(0,0,tile.size,tile.size),a=pixels.data,n=tile.size,seen=new Uint8Array(n*n),queue=[];
    const orange=i=>{const k=i*4,r=a[k],g=a[k+1],b=a[k+2];return r>130&&r>g*1.045&&g>b*1.08;};
    const push=i=>{if(!seen[i]&&orange(i)){seen[i]=1;queue.push(i);}};
    for(let edge=0;edge<4;edge++)for(let i=0;i<n;i++){push(edge*n+i);push((n-1-edge)*n+i);push(i*n+edge);push(i*n+n-1-edge);}
    // Flood only the warm tile background connected to its boundary; enclosed
    // equipment pixels, dark outlines and the blue troop emblem stay original.
    for(let head=0;head<queue.length;head++){
     const i=queue[head],x=i%n,y=Math.floor(i/n),k=i*4;
     const light=(a[k]+a[k+1]+a[k+2])/765;
     a[k]=Math.min(255,Math.round(162+light*100));a[k+1]=Math.round(15+light*139);a[k+2]=Math.round(22+light*137);
     if(x)push(i-1);if(x<n-1)push(i+1);if(y)push(i-n);if(y<n-1)push(i+n);
    }
    ctx.putImageData(pixels,0,0);
   }
   const out=canvas.getContext('2d');out.clearRect(0,0,116,116);out.imageSmoothingEnabled=true;out.drawImage(work,0,0,116,116);
  }catch{canvas.setAttribute('aria-label','贴图加载失败');}
 }
}
