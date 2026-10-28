export const STAGES = [
  ['pre-crystal', '火晶前'], ['fc3', '火三'], ['fc5', '火五'], ['t11', 'T11'],
  ['gen6-fc8', '六代火八'], ['gen7-fc8', '七代火八'], ['gen7-fc10-gen8', '七代火十／八代'],
].map(([id, name]) => ({ id, name }));

export const HERO_GENERATIONS = Array.from({length:15},(_,i)=>({id:i+1,name:`${i+1}代英雄`}));
export const FIRE_PROGRESS = [
  {id:'pre-crystal',name:'火晶前'},{id:'fc3',name:'火晶三'},
  {id:'fc5',name:'火晶五'},{id:'t11',name:'T11'},
  {id:'fc8',name:'火晶八'},{id:'fc10',name:'火晶十'},{id:'t12',name:'T12'},
];

export const migrateFireProgress = id => ({fc1:'pre-crystal',fc2:'pre-crystal',fc4:'fc3',fc6:'fc5',fc7:'fc5',fc9:'fc8'}[id]||id);

export function fireChoicesForHero(heroGeneration) {
  if (!HERO_GENERATIONS.some(g=>g.id===heroGeneration)) throw new Error('请选择有效的英雄进度');
  const ids=({1:['pre-crystal'],2:['pre-crystal','fc3'],3:['fc3','fc5'],4:['fc5','t11'],5:['t11','fc8'],6:['fc8'],7:['fc8','fc10']})[heroGeneration]||['fc10'];
  return FIRE_PROGRESS.filter(p=>ids.includes(p.id));
}

export function normalizeProgress({heroGeneration,fireProgress}) {
  const choices=fireChoicesForHero(heroGeneration),fire=migrateFireProgress(fireProgress);
  const rank=FIRE_PROGRESS.findIndex(p=>p.id===fire);
  if(rank<0) throw new Error('请选择有效的火晶进度');
  const selected=choices.filter(p=>FIRE_PROGRESS.findIndex(f=>f.id===p.id)<=rank).at(-1)||choices[0];
  return {heroGeneration,fireProgress:selected.id};
}

export function resolveStage({heroGeneration,fireProgress}) {
  ({heroGeneration,fireProgress}=normalizeProgress({heroGeneration,fireProgress}));
  if (heroGeneration>=8||fireProgress==='t12'||fireProgress==='fc10') return 'gen7-fc10-gen8';
  if (fireProgress==='t11') return 't11';
  if (fireProgress==='pre-crystal') return 'pre-crystal';
  const fire=Number(fireProgress.slice(2));
  if (fire>=8) return heroGeneration>=7?'gen7-fc8':'gen6-fc8';
  if (fire>=5) return 'fc5';
  if (fire>=3) return 'fc3';
  return 'pre-crystal';
}

// Representative choices migrate legacy groups; they do not recover actual account history.
export function progressFromStage(stage) {
  const presets={'pre-crystal':[1,'pre-crystal'],fc3:[3,'fc3'],fc5:[4,'fc5'],t11:[5,'t11'],
    'gen6-fc8':[6,'fc8'],'gen7-fc8':[7,'fc8'],'gen7-fc10-gen8':[7,'fc10']};
  if (!presets[stage]) throw new Error('未知价格大类');
  const [heroGeneration,fireProgress]=presets[stage];
  return {heroGeneration,fireProgress};
}
