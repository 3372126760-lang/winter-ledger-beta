import {expertBoardView,bindExpertBoard} from './expert-board.js';
import {heroGearAttribute,heroGearPairs} from '../domain/hero-gear-attributes.js';
import {petBoardView,bindPetBoard} from './pet-board.js';
import heroArt from '../data/hero-gear-art.json' with {type:'json'};
import {validateBattleProfile} from '../domain/battle-profile.js';
export const GROWTH_SYSTEMS=['hero-gear','experts','pets'];
export function growthRecordsView(data,systemId,state,esc,{mode='planning',petSection='both',selectedPathId=state.planning?.pathId}={}){
 const currentOnly=mode==='current',fields=currentOnly?['levels']:['levels','planned'];
 const system=data.systems.find(s=>s.id===systemId),p=validateBattleProfile(state.battleProfile);
 if(!system||!GROWTH_SYSTEMS.includes(systemId))return '';
 const field=(path,type)=>{const value=p[type][path.id],rows=[...(path.baseline?[path.baseline]:[]),...path.rows].filter(r=>type!=='planned'||p.levels[path.id]===undefined||r.level>p.levels[path.id]),known=rows.some(r=>r.level===value);return `<label>${type==='levels'?'当前':'计划'}<select data-growth-record="${type}" data-growth-path="${esc(path.id)}" data-growth-system="${systemId}"><option value="">${type==='levels'?'未记录':'未设置'}</option>${value!==undefined&&!known?`<option value="${value}" selected>${value}级（原记录，档位待核对）</option>`:''}${rows.map(r=>`<option value="${r.level}" ${r.level===value?'selected':''}>${esc(r.label||r.level+'级')}</option>`).join('')}</select></label>`;};
 if(systemId==='pets')return petBoardView(system,p,esc,{currentOnly,field,section:petSection,inventory:state.account?.inventory||{}});
 if(systemId==='experts')return expertBoardView(system,p,esc,{currentOnly,field,selectedPathId});
 if(systemId==='hero-gear'){
  return `<section class="card growth-records hero-gear-board"><h2>英雄装备 · ${currentOnly?'当前等级':'当前与计划'}</h2><p class="hint">盾、矛、射各四件，共12件。每件强化与专精分别保存；橙装0—100级，红装1—100级。12件橙装采用相同基础曲线；橙装属性＝基础属性×（1＋专精等级×10%）。红装基础属性＝等效装备等级×（10＋专精等级）÷20，红1—100级按等效101—200级。</p>${[['infantry','盾兵'],['lancer','矛兵'],['marksman','射手']].map(([troop,name])=>`<section class="hero-troop-group"><h3>${name}装备 · 4件</h3><div class="hero-piece-grid">${['goggles','gloves','belt','boots'].map(slot=>{
   const strength=system.paths.find(x=>x.heroGearSlot?.troop===troop&&x.heroGearSlot.slot===slot&&x.heroGearSlot.kind==='strength'),mastery=system.paths.find(x=>x.heroGearSlot?.troop===troop&&x.heroGearSlot.slot===slot&&x.heroGearSlot.kind==='mastery');
   if(!strength||!mastery)return '';
   const label={goggles:'护目镜',gloves:'手套',belt:'腰带',boots:'战靴'}[slot];
   const entry=heroArt[troop+'-'+slot],level=p.levels[strength.id],masterRow=mastery.rows.find(r=>r.level===p.levels[mastery.id]),master=masterRow?(masterRow.masteryPart===5?String(masterRow.masteryLevel):`${masterRow.masteryLevel-1}·${masterRow.masteryPart}/5`):p.levels[mastery.id],red=level>100,enhance=red?level-100:level,badgeColor=!red?'normal':enhance>=100?'red':enhance>=80?'orange':enhance>=60?'purple':enhance>=40?'blue':'green';
   
   const currentEffect=heroGearAttribute(strength,mastery,p),targetEffect=heroGearAttribute(strength,mastery,p,'planned');
   const effectLabel=result=>result.value===null?result.reason:result.value+'%'+(result.estimated?'（估算）':'');
   const effectView=`<div class="hero-attribute-summary"><span>当前${['goggles','boots'].includes(slot)?'穿透力':'生命'}：<strong>${esc(effectLabel(currentEffect))}</strong></span>${currentOnly?'':`<span>计划：<strong>${esc(effectLabel(targetEffect))}</strong>${currentEffect.value!==null&&targetEffect.value!==null?' · 增加 '+Number((targetEffect.value-currentEffect.value).toFixed(4))+' 个百分点':''}</span>`}</div>`;
   const icon=`<span class="hero-game-icon hero-clean-icon ${red?'is-red':'is-orange'}" role="img" aria-label="${esc(entry.name)}${level===undefined?'':`，${red?'红装':'橙装'}${enhance}级`}${master===undefined?'':`，专精${master}级`}"><canvas class="hero-original-art" width="116" height="116" data-original-gear="${troop}-${slot}" data-original-red="${red}" aria-hidden="true"></canvas>${level===undefined?'':`<b class="hero-enhance-badge badge-${badgeColor}">+${enhance}</b>`}${master===undefined?'':`<b class="hero-mastery-badge">${master}级</b>`}</span>`;
   return `<article class="hero-piece"><div class="hero-piece-heading">${icon}<div><h4>${name} · ${esc(entry.name)}</h4><small>${['goggles','boots'].includes(slot)?'兵种穿透':'兵种生命'}</small></div></div>${[[strength,'强化等级'],[mastery,'专精等级']].map(([path,title])=>`<div class="hero-track"><strong>${title}</strong><div class="chief-inline-levels ${currentOnly?'hero-current-only':''}">${fields.map(type=>field(path,type)).join('')}</div></div>`).join('')}${effectView}</article>`;
  }).join('')}</div></section>`).join('')}<p class="hint">橙20级解锁专精；橙100且专精10可升红1。红20／40／60／80／100赋能分别要求专精11／12／13／14／15。射手战靴基础属性来自用户录像，35级19.66%由用户补充实机确认；12件橙装同曲线由维护者确认；红装按维护者公式计算基础属性。赋能额外属性侧重与数值需另行核对，不混入基础值。升4级起分五段；属性增量及专精石均分，14—20级橙装分段按推测计算、待核对。</p></section>`;
 }
 return '';
}
export function bindGrowthRecords({getState,onSave,onSelect,onRefresh,data}){
 bindPetBoard({getState,onSave,onSelect,onRefresh});
 bindExpertBoard({getState,onSelect,onRefresh});
 paintOriginalGear();
 document.querySelectorAll('[data-growth-record]').forEach(e=>e.addEventListener('change',()=>{
  const profile=validateBattleProfile(getState().battleProfile),group=profile[e.dataset.growthRecord],id=e.dataset.growthPath;
  if(e.value==='')delete group[id];else group[id]=Number(e.value);
  if(data&&e.dataset.growthSystem==='hero-gear'&&e.dataset.growthRecord==='planned'&&e.value!==''){
   const pair=heroGearPairs(data).find(p=>p.strength.id===id||p.mastery.id===id);
   if(pair){const issues=heroGearAttribute(pair.strength,pair.mastery,profile,'planned').issues;
    if(issues.length){e.setCustomValidity(issues.join('；')+'。请先填写或设置对应的强化／专精等级。');e.reportValidity();e.value=getState().battleProfile?.planned?.[id]??'';return;}
   }
  }
  e.setCustomValidity('');
  Object.assign(profile,validateBattleProfile(profile));
  onSave(profile);
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
