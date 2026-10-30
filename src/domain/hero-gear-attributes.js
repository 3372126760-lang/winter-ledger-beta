import observations from '../data/hero-orange-attributes.json' with {type:'json'};

export function masteryLevelAt(path,sequence){
 if(sequence===undefined||sequence===null)return null;
 if(sequence===0)return 0;
 const row=path?.rows.find(r=>r.level===sequence);
 return row?.masteryLevel===undefined?null:row.masteryLevel-(row.masteryPart===5?0:1)+(row.masteryPart===5?0:row.masteryPart/5);
}

export function requiredMastery(strength){
 if(strength<101)return 0;
 return strength>=120?Math.min(15,10+Math.floor((strength-100)/20)):10;
}

export function heroGearPrerequisites(strength,mastery){
 const issues=[];
 if(strength==null){if(mastery>0)issues.push('强化等级未记录，专精前置待确认');return issues;}
 if(mastery>0&&strength<20)issues.push('橙装强化20级后才解锁专精');
 const required=requiredMastery(strength);
 if(required>0&&(mastery==null||mastery<required))issues.push(`${strength===101?'红装1级':`红装${strength-100}级`}需要专精${required}级${mastery==null?'（专精未记录）':''}`);
 return issues;
}

export function heroGearAttribute(strengthPath,masteryPath,profile,mode='levels'){
 const current=profile.levels||{},selected=profile[mode]||{};
 const strength=selected[strengthPath.id]??(mode==='planned'?current[strengthPath.id]:undefined);
 const sequence=selected[masteryPath.id]??(mode==='planned'?current[masteryPath.id]:undefined);
 // Below orange 20, specialization is mechanically unavailable, so its zero is known.
 const mastery=sequence===undefined&&strength<20?0:masteryLevelAt(masteryPath,sequence);
 const issues=heroGearPrerequisites(strength,mastery);
 const known=Number.isInteger(strength)&&strength>=0&&strength<=200&&mastery!==null;
 const base=known?(strength>100?strength/2:observations.rows.find(r=>r.level===strength)?.value):null;
 const value=base==null||issues.length?null:Number((base*(1+mastery*.1)).toFixed(4));
 const troop=strengthPath.heroGearSlot.troop,slot=strengthPath.heroGearSlot.slot;
 return {key:troop+'.'+(['goggles','boots'].includes(slot)?'lethality':'health'),value,base:base??null,mastery,issues,estimated:false,reason:issues.join('；')||(!known?(strength==null?'强化等级未记录':'专精等级未记录，请明确填写0级'):'')};
}

export function heroGearPairs(data){
 const paths=data.systems.find(s=>s.id==='hero-gear')?.paths||[];
 return paths.filter(p=>p.heroGearSlot?.kind==='strength').map(strength=>({strength,mastery:paths.find(p=>p.heroGearSlot?.kind==='mastery'&&p.heroGearSlot.troop===strength.heroGearSlot.troop&&p.heroGearSlot.slot===strength.heroGearSlot.slot)})).filter(pair=>pair.mastery);
}
