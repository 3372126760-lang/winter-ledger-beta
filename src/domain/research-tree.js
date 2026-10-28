const troopIds=['infantry','lancer','marksman'];

export function technologyTree(manifest,system,path,planning){
 if(!['research','t11','t12'].includes(system.id)||!path)return null;
 if(system.id==='research'&&path.researchTree!=='battle')return null;
 const troopId=system.id==='t11'?(planning.technologyTroop||'infantry'):system.id==='t12'?(path.id.endsWith('-shield')?'infantry':path.id.endsWith('-lancer')?'lancer':'marksman'):null;
 const nodes=manifest.nodes.filter(n=>n.systemId===system.id&&(system.id!=='t12'||n.troopId===troopId));
 const ids=new Set(nodes.map(n=>n.id));if(system.id==='t11')ids.add('t11-core');
 return {systemId:system.id,troopId,nodes,edges:manifest.edges.filter(e=>ids.has(e.from)&&ids.has(e.to)),size:manifest.sizes[system.id],selected:nodes.find(n=>n.pathId===path.id&&(system.id!=='t11'||n.troopId===troopId))};
}

export function planTechnologyNode(node,path,current,levels={}){
 if(!node||node.pathId!==path?.id||!['research','t11','t12'].includes(node.systemId))throw new Error('科技节点对应关系无效');
 if(node.systemId==='t11'&&!troopIds.includes(node.troopId))throw new Error('科技兵种无效');
 const same=current.systemId===node.systemId&&current.pathId===path.id&&(node.systemId!=='t11'||(current.technologyTroop||'infantry')===node.troopId);
 const recorded=levels[node.id];
 if(recorded!==undefined&&(!Number.isInteger(recorded)||recorded<0||recorded>node.max))throw new Error('科技等级记录无效');
 const from=recorded!==undefined&&recorded<node.max?recorded:same&&current.from<node.max?current.from:path.baseline?.level??0;
 const to=same&&current.to>from?current.to:path.rows.find(r=>r.level>from)?.level;
 if(!Number.isInteger(to)||to<=from)throw new Error('此节点没有可测算的下一档');
 return {systemId:node.systemId,pathId:path.id,from,to,pieces:1,...(node.systemId==='t11'?{technologyTroop:node.troopId}:{})};
}
