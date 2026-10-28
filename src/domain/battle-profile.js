export function validateBattleProfile(v={}){
 const clean=o=>Object.fromEntries(Object.entries(o||{}).map(([k,n])=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e12)throw Error('属性记录无效');return [k,n];}));
 return {base:clean(v.base),levels:clean(v.levels),planned:clean(v.planned)};
}
