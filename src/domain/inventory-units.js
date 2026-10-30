// Persist base quantities so existing backups, history and reward formulas stay compatible.
export const inventoryUnit=item=>item.inventoryUnit||item.unit;
export const inventoryDisplayQuantity=(item,value)=>value===null||value===undefined?value:value/(item.inventoryScale||1);
export function inventoryStoredQuantity(item,value){
 const quantity=Number(value)*(item.inventoryScale||1);
 if(!Number.isFinite(quantity)||quantity<0||quantity>1e12)throw new Error('请输入有效的非负数量');
 if(item.unit==='小时')return quantity;
 const rounded=Math.round(quantity);
 if(Math.abs(quantity-rounded)>1e-6)throw new Error(item.inventoryScale?'最小可记录1个，即0.0001万':'请输入整数数量');
 return rounded;
}
