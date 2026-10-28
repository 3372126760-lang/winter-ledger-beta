import {calculateRefinement,REFINEMENT_TIERS,tierExpectation} from '../domain/refinement.js';

export function createRefinementPanel({esc,fmt,money,getMethod,setMethod,getFirePrice,stageName,isUnlocked=()=>true}) {
  const presets=[1,14,20,34,40,54,60,74,80,94].map(n=>n+'+6');
  const firstDay=method=>/^\d+\+6$/.test(method)?method.split('+')[0]:'';
  function view(){return `<div class="page-title"><div><p class="eyebrow">FIRE CRYSTAL REFINEMENT</p><h1>火晶精炼</h1><p class="description">按每周次数、每日首抽半价与奖励概率，计算精炼火晶的期望成本。</p></div></div>
    <section class="card"><div class="section-heading"><h2>你的每周精炼方式</h2><span class="pill green">${esc(stageName())}</span></div>
    <div class="refinement-controls"><label>第一天精炼次数<div class="refinement-method-input"><input id="refinement-method" aria-label="第一天精炼次数" type="number" min="1" max="94" step="1" value="${esc(firstDay(getMethod()))}" placeholder="1—94"><span class="refinement-method-suffix" aria-label="后六天每天一次">+6</span></div></label><button class="button primary" id="refinement-calculate">计算并采用</button></div>
    <p class="hint">只需输入第一天的次数（1—94），后六天每天一次由右侧固定的“+6”表示。第一天首次同样半价，周次数连续累计。</p>
    <div class="refinement-presets">${presets.map(m=>`<button class="button quiet" data-refinement-method="${m}">${m}</button>`).join('')}</div>
    <p class="hint" id="refinement-input-status" role="status"></p><div id="refinement-results"></div></section>
    <section class="card"><div class="section-heading"><h2>1+6 至 94+6 · 完整对比</h2><span class="muted">同一火晶基础价</span></div><div class="table-scroll refinement-all-plans" id="refinement-comparison" tabindex="0" aria-label="全部94种精炼方式对比，可滚动查看"></div></section>
    <section class="card"><div class="section-heading"><h2>本次采用的普通精炼规则</h2><span class="pill">维护者截图</span></div><div class="table-scroll"><table><thead><tr><th>周累计次数</th><th>每次火晶</th><th>每次期望产量</th><th>产量与概率</th></tr></thead><tbody>${REFINEMENT_TIERS.map(t=>`<tr><td>${t.from}—${t.to}</td><td>${t.cost}</td><td>${fmt(tierExpectation(t),4)}</td><td>${t.outcomes.map(([n,p])=>`${n}个 × ${fmt(p*100,2)}%`).join('；')}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint">每日第一次仅消耗半价，产量概率不变。每周从第1次重新计档，仅计算截图覆盖的1—100次普通精炼。超级精炼未纳入。</p><p class="hint">概率原图：${[1,2,3,4,5].map(n=>`<a href="/public/evidence/refinement-probabilities-${n}.png" target="_blank" rel="noreferrer">图${n}</a>`).join(' · ')}</p></section>`;}

  function update(){
    const p=isUnlocked()?getFirePrice():null,r=calculateRefinement(getMethod(),p?.value??null);
    const price=p?`${money(p.value)}／火晶`:'当前进度缺少火晶参考价';
    document.querySelector('#refinement-results').innerHTML=`<div class="metrics refinement-metrics"><div><span>每周消耗火晶</span><strong>${fmt(r.totalFire)}</strong><small>每日半价共节省 ${fmt(r.discount)} 火晶</small></div><div><span>精炼火晶期望产量</span><strong>${fmt(r.totalOutput,4)}</strong><small>周累计精炼 ${r.weeklyCount} 次</small></div><div><span>每个需要火晶</span><strong>${fmt(r.firePerRefined,6)}</strong><small>总消耗 ÷ 期望总产量</small></div><div><span>精炼火晶参考单价</span><strong>${r.unitPrice===null?'待补价':money(r.unitPrice)}</strong><small>${esc(getMethod())} · ${price}</small></div></div>
      <p class="hint">${isUnlocked()?'此方式已用于价格表和礼包估值中的“精炼火晶”。':'当前进度未解锁精炼火晶（火晶八起开放）；仅供预览消耗与产量，不计入本进度估值。'}金额由当前进度火晶参考价折算；实际产量会波动，不保证每周取得期望数量。${!p?'可先查看火晶消耗与产量，人民币单价暂不计算。':''}</p>
      <h3 class="refinement-subtitle">逐日明细</h3><div class="table-scroll"><table><thead><tr><th>日期</th><th>精炼次数</th><th>周累计序号</th><th>首抽半价节省</th><th>消耗火晶</th><th>期望产量</th></tr></thead><tbody>${r.days.map(d=>`<tr><td>第${d.day}天</td><td>${d.count}</td><td>${d.count?`${d.first}—${d.last}`:'—'}</td><td>${fmt(d.discount)}</td><td>${fmt(d.fireCost)}</td><td>${fmt(d.expectedOutput,4)}</td></tr>`).join('')}</tbody></table></div>
      <details class="refinement-breakdown"><summary>查看按档位汇总</summary><div class="table-scroll"><table><thead><tr><th>档位</th><th>次数</th><th>其中半价次数</th><th>消耗火晶</th><th>期望产量</th></tr></thead><tbody>${r.buckets.filter(b=>b.count).map(b=>`<tr><td>${b.from}—${b.to}</td><td>${b.count}</td><td>${b.halfCount}</td><td>${fmt(b.fireCost)}</td><td>${fmt(b.expectedOutput,4)}</td></tr>`).join('')}</tbody></table></div></details>`;
    const methods=[...new Set([...Array.from({length:94},(_,i)=>`${i+1}+6`),getMethod()])];
    document.querySelector('#refinement-comparison').innerHTML=`<table><thead><tr><th>方式</th><th>消耗火晶</th><th>期望产量</th><th>火晶／精炼火晶</th><th>元／精炼火晶</th></tr></thead><tbody>${methods.map(m=>{const a=calculateRefinement(m,p?.value??null);return `<tr class="${m===getMethod()?'refinement-selected':''}"><td><button class="text-button" data-refinement-row-method="${esc(m)}" aria-label="采用精炼方式${esc(m)}">${esc(m)}${m===getMethod()?' · 当前':''}</button></td><td>${fmt(a.totalFire)}</td><td>${fmt(a.totalOutput,4)}</td><td>${fmt(a.firePerRefined,6)}</td><td>${a.unitPrice===null?'待补价':fmt(a.unitPrice,6)}</td></tr>`;}).join('')}</tbody></table>`;
    document.querySelectorAll('[data-refinement-row-method]').forEach(button=>button.addEventListener('click',()=>{
      const method=button.dataset.refinementRowMethod;
      document.querySelector('#refinement-method').value=firstDay(method);setMethod(method);
      document.querySelector('#refinement-input-status').textContent='已采用 '+method+'，价格表和礼包估值同步更新。';update();
    }));
  }
  function bind(){
    const input=document.querySelector('#refinement-method'),status=document.querySelector('#refinement-input-status');
    function adopt(){try{const n=Number(input.value);if(input.value.trim()===''||!Number.isInteger(n)||n<1||n>94)throw new Error('第一天精炼次数请输入1—94的整数');const method=n+'+6';calculateRefinement(method);setMethod(method);status.textContent='已采用 '+method+'，价格表和礼包估值同步更新。';update();}catch(e){status.textContent=e.message;}}
    document.querySelector('#refinement-calculate').addEventListener('click',adopt);
    input.addEventListener('keydown',e=>{if(e.key==='Enter')adopt();});
    document.querySelectorAll('[data-refinement-method]').forEach(button=>button.addEventListener('click',()=>{input.value=firstDay(button.dataset.refinementMethod);adopt();}));
    update();
  }
  return {view,bind};
}
