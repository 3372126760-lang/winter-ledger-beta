import {inventoryDifference,inventoryTimestamp,deleteInventorySnapshot,restoreDeletedSnapshot,clearDeletedSnapshots} from '../domain/inventory.js';

const displayTime=value=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(value));
const inputTime=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).replace(' ','T');
export function createInventoryHistoryPanel({items,esc,fmt,options,artIcon,getAccount,onSave,notify}) {
  let selected='',compare='current',confirmClear=false;
  const records=()=>[...getAccount().history].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  function view(){
    return `<section class="card inventory-history"><div class="section-heading"><h2>库存时间记录</h2><span id="history-count">${getAccount().history.length} 份记录</span></div><p class="hint">当前库存随输入自动保存；点击“保存此时库存”留下一份独立记录。可补录过去的时间，时间均为北京时间。空白表示未记录，填0表示已确认没有。</p><div class="form-grid"><label>记录时间<input id="snapshot-time" type="datetime-local" value="${inputTime()}"></label><label>备注<input id="snapshot-note" maxlength="500" placeholder="例如：王战前、购买礼包后"></label></div><button class="button primary" id="snapshot-save">保存此时库存</button><div class="form-grid history-selectors"><label>查看时间点<select id="snapshot-selected"></select></label><label>对比时间点<select id="snapshot-compare"></select></label></div><div id="snapshot-actions" class="snapshot-actions"></div><div id="snapshot-detail"></div></section>`;
  }
  function refresh(){
    const list=records();if(!list.some(s=>s.id===selected))selected=list[0]?.id||'';
    if(compare!=='current'&&!list.some(s=>s.id===compare))compare='current';
    const labels=list.map(s=>[s.id,`${displayTime(s.at)}${s.note?' · '+s.note:''}${s.accountName?' · '+s.accountName:''}`]);
    document.querySelector('#snapshot-selected').innerHTML=options(labels.length?labels:[['','暂无记录']],selected);
    document.querySelector('#snapshot-compare').innerHTML=options([['current','当前库存'],...labels],compare);
    const entry=list.find(s=>s.id===selected),target=compare==='current'?getAccount().inventory:list.find(s=>s.id===compare)?.inventory;
    document.querySelector('#history-count').textContent=`${list.length} 份记录`;
    const deleted=getAccount().deletedHistory||[];
    document.querySelector('#snapshot-actions').innerHTML=`${entry?'<button class="button danger" id="snapshot-delete">删除选中记录</button>':''}${deleted.length?`<button class="button quiet" id="snapshot-undo-delete">撤销上次删除</button><button class="button danger" id="snapshot-clear-deleted">清空已删除记录</button>${confirmClear?`<div class="clear-snapshots-confirm" role="alert"><p>将清空 ${deleted.length} 份已删除记录，清空后无法在页面中撤销。正常历史记录和当前库存不受影响。</p><button class="button danger" id="snapshot-confirm-clear">确认清空</button><button class="button quiet" id="snapshot-cancel-clear">取消</button></div>`:''}<details class="deleted-snapshots"><summary>已删除记录（${deleted.length}）</summary><p class="hint">删除仅移入这里，当前库存不受影响；刷新或导出备份后仍可恢复。</p>${[...deleted].reverse().map(s=>`<div class="deleted-snapshot-row"><span>${esc(displayTime(s.at))} · ${esc(s.note||'无备注')}</span><button class="button quiet" data-restore-deleted="${esc(s.id)}">恢复</button></div>`).join('')}</details>`:''}`;
    document.querySelector('#snapshot-delete')?.addEventListener('click',()=>{
      try{deleteInventorySnapshot(getAccount(),selected);onSave(false);refresh();notify('记录已删除，可撤销；当前库存保持不变');}catch(e){notify(e.message);}
    });
    const recover=id=>{try{restoreDeletedSnapshot(getAccount(),id);selected=id;onSave(false);refresh();notify('已恢复删除的记录');}catch(e){notify(e.message);}};
    document.querySelector('#snapshot-undo-delete')?.addEventListener('click',()=>recover(deleted[deleted.length-1].id));
    document.querySelectorAll('[data-restore-deleted]').forEach(button=>button.addEventListener('click',()=>recover(button.dataset.restoreDeleted)));
    document.querySelector('#snapshot-clear-deleted')?.addEventListener('click',()=>{confirmClear=true;refresh();});
    document.querySelector('#snapshot-cancel-clear')?.addEventListener('click',()=>{confirmClear=false;refresh();});
    document.querySelector('#snapshot-confirm-clear')?.addEventListener('click',()=>{
      const count=clearDeletedSnapshots(getAccount());confirmClear=false;onSave(false);refresh();notify(`已清空${count}份已删除记录`);
    });
    const el=document.querySelector('#snapshot-detail');
    if(!entry){el.innerHTML='<p class="hint">保存第一份记录后，可在这里回看和比较资源数量。</p>';return;}
    const rows=inventoryDifference(entry.inventory,target||{},items);
    el.innerHTML=`<p class="hint">${esc(displayTime(entry.at))} · ${esc(entry.note||'无备注')}。变化＝对比时间点数量－查看时间点数量；任一侧未记录时不计算差额。</p><button class="button quiet" id="snapshot-restore">载入这份库存作为当前库存</button><div class="table-scroll"><table><thead><tr><th>资源</th><th>查看时间点</th><th>对比时间点</th><th>变化</th></tr></thead><tbody>${rows.map(r=>`<tr><td><div class="item-with-art">${artIcon(r.item)}<span>${esc(r.item.name)}<small>${esc(r.item.unit)}</small></span></div></td><td>${r.before===null?'未记录':fmt(r.before,6)}</td><td>${r.after===null?'未记录':fmt(r.after,6)}</td><td>${r.change===null?'—':(r.change>0?'+':'')+fmt(r.change,6)}</td></tr>`).join('')}</tbody></table></div>`;
    document.querySelector('#snapshot-restore').addEventListener('click',()=>{
      const account=getAccount();if(account.history.length>=9999){notify('记录已达上限，请先导出备份整理');return;}
      if(Object.keys(account.inventory).length)account.history.push(makeSnapshot(new Date().toISOString(),'载入历史库存前自动记录'));
      account.inventory=structuredClone(entry.inventory);onSave(true);notify('已载入；原当前库存已另存为恢复前记录');
    });
  }
  function makeSnapshot(at,note){const a=getAccount();return {id:crypto.randomUUID(),at:inventoryTimestamp(at),note,accountName:a.name,inventory:structuredClone(a.inventory)};}
  function bind(){
    document.querySelector('#snapshot-save').addEventListener('click',()=>{
      const account=getAccount();
      if(account.history.length>=10000){notify('记录已达上限，请先导出备份整理');return;}
      if(!Object.keys(account.inventory).length){notify('请先录入至少一种资源的库存');return;}
      try{
        const time=document.querySelector('#snapshot-time').value;if(!time)throw new Error('请选择记录时间');
        const snapshot=makeSnapshot(time+(time.length===16?':00':'')+'+08:00',document.querySelector('#snapshot-note').value.trim());
        account.history.push(snapshot);selected=snapshot.id;onSave(true);notify('已记录该时间点库存');
      }catch(e){notify(e.message);}
    });
    document.querySelector('#snapshot-selected').addEventListener('change',e=>{selected=e.target.value;refresh();});
    document.querySelector('#snapshot-compare').addEventListener('change',e=>{compare=e.target.value;refresh();});
    refresh();
  }
  return {view,bind,refresh};
}
