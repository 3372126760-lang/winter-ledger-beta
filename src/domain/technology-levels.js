import manifest from '../data/research-trees.json' with {type:'json'};
const maxima=new Map(manifest.nodes.map(n=>[n.id,n.max]));

export function validateTechnologyLevels(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('科技等级记录格式不符');
 return Object.fromEntries(Object.entries(value).map(([id,level])=>{
  if(!maxima.has(id)||!Number.isInteger(level)||level<0||level>maxima.get(id))throw new Error('科技等级超出该节点支持的范围');
  return [id,level];
 }));
}

export function setTechnologyLevel(input,id,level){
 if(!maxima.has(id))throw new Error('科技节点不存在');
 const next=validateTechnologyLevels(input);
 if(level===null)delete next[id];else next[id]=level;
 return validateTechnologyLevels(next);
}
