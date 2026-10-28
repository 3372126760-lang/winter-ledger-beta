export function validateResearchSettings(value){
 if(value===undefined)return {speedPercent:0,waitHours:0};
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('研究速度记录格式不符');
 const {speedPercent,waitHours}=value;
 if(![speedPercent,waitHours].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)||speedPercent>10000||waitHours>1e12)throw new Error('请填写有效的研究速度百分数和等待时间');
 return {speedPercent,waitHours};
}

export function researchDuration(baseHours,speedPercent=0,waitHours=0){
 if(baseHours===null||baseHours===undefined)return null;
 if(![baseHours,speedPercent,waitHours].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)||speedPercent>10000||baseHours>1e12||waitHours>1e12)throw new Error('请填写有效的工期、研究速度和等待时间');
 const duration=baseHours/(1+speedPercent/100);
 return {baseHours,speedPercent,duration,waitUsed:Math.min(waitHours,duration),speedupHours:Math.max(0,duration-waitHours)};
}
