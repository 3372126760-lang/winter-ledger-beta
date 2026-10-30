export function expertRelationAt(expert,stage){
 if(!Number.isInteger(stage)||stage<0||stage>expert.milestones.length)return null;
 return stage?expert.milestones[stage-1].relation:'萍水相逢';
}

export function expertTalentAt(talent,level){
 if(level===undefined||level===null)return null;
 return talent.levels.filter(row=>row.level<=level).at(-1)||null;
}

export function expertPathsForSelection(system,path){
 if(system.id!=='experts'||!path)return system.paths;
 const name=path.name.split(' · ')[0];
 return system.paths.filter(p=>p.name.startsWith(name+' · '));
}
