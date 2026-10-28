import {isRemovedItem} from './art.js';

export function validateInventory(input,items) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('库存格式无效');
  const result={};
  for(const [id,quantity] of Object.entries(input)){
    if(isRemovedItem(id))continue;
    const item=items.find(i=>i.id===id);
    if(!item||!Number.isFinite(quantity)||quantity<0||quantity>1e12||(item.unit!=='小时'&&!Number.isInteger(quantity)))throw new Error('库存数量无效');
    result[id]=quantity;
  }
  return result;
}
export function validateInventoryHistory(input,items) {
  if(input===undefined)return [];
  if(!Array.isArray(input)||input.length>10000)throw new Error('库存记录最多保存10000份');
  const ids=new Set();
  return input.map(s=>{
    if(!s||typeof s.id!=='string'||!s.id||s.id.length>100||ids.has(s.id)||typeof s.at!=='string'||!Number.isFinite(Date.parse(s.at))||!s.at.endsWith('Z')||typeof s.note!=='string'||s.note.length>500||typeof s.accountName!=='string'||s.accountName.length>200)throw new Error('库存记录格式无效');
    ids.add(s.id);
    return {id:s.id,at:new Date(s.at).toISOString(),note:s.note,accountName:s.accountName,inventory:validateInventory(s.inventory,items)};
  });
}
export function inventoryDifference(previous,current,items) {
  return items.filter(i=>Object.hasOwn(previous,i.id)||Object.hasOwn(current,i.id)).map(item=>{
    const before=previous[item.id]??null,after=current[item.id]??null;
    return {item,before,after,change:before===null||after===null?null:after-before};
  });
}
export function inventoryTimestamp(value=new Date()) {
  const d=new Date(value);
  if(!Number.isFinite(d.getTime()))throw new Error('请选择有效记录时间');
  return d.toISOString();
}
export function deleteInventorySnapshot(account,id) {
  const index=account.history.findIndex(s=>s.id===id);
  if(index<0)throw new Error('没有找到这份记录');
  account.deletedHistory??=[];
  if(account.deletedHistory.length>=10000)throw new Error('已删除记录达到上限，请先导出备份整理');
  account.deletedHistory.push(account.history.splice(index,1)[0]);
}
export function restoreDeletedSnapshot(account,id) {
  const index=(account.deletedHistory||[]).findIndex(s=>s.id===id);
  if(index<0)throw new Error('没有找到已删除记录');
  if(account.history.length>=10000)throw new Error('库存记录达到上限，请先整理后恢复');
  if(account.history.some(s=>s.id===id))throw new Error('该记录已经存在');
  account.history.push(account.deletedHistory.splice(index,1)[0]);
}
export function clearDeletedSnapshots(account) {
  const count=(account.deletedHistory||[]).length;
  account.deletedHistory=[];
  return count;
}
