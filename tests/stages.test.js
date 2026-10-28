import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STAGES,HERO_GENERATIONS,FIRE_PROGRESS,resolveStage,progressFromStage,fireChoicesForHero,normalizeProgress} from '../src/domain/stages.js';
import {initialState,validateState,getPrice} from '../src/domain/model.js';
const {items}=JSON.parse(await readFile(new URL('../src/data/catalog.json',import.meta.url)));
const group=(heroGeneration,fireProgress)=>resolveStage({heroGeneration,fireProgress});

test('用户给定组合及更高进度复用最高价格类',()=>{
  assert.equal(group(8,'fc10'),'gen7-fc10-gen8');
  assert.equal(group(8,'fc8'),'gen7-fc10-gen8');
  assert.equal(group(10,'t12'),'gen7-fc10-gen8');
  assert.equal(group(15,'t12'),'gen7-fc10-gen8');
});
test('进度分歧边界分别归类，T11对应战争学院',()=>{
  for(const [hero,fire,expected] of [[1,'pre-crystal','pre-crystal'],[3,'fc3','fc3'],[4,'fc5','fc5'],[5,'t11','t11'],[6,'fc8','gen6-fc8'],[7,'fc8','gen7-fc8'],[7,'fc10','gen7-fc10-gen8']])assert.equal(group(hero,fire),expected);
});
test('所有可选组合稳定映射七类，禁止无效输入',()=>{
  for(const h of HERO_GENERATIONS)for(const f of FIRE_PROGRESS)assert.ok(STAGES.some(s=>s.id===group(h.id,f.id)));
  for(const p of [{heroGeneration:0,fireProgress:'fc8'},{heroGeneration:'7',fireProgress:'fc8'},{heroGeneration:7,fireProgress:'bad'}])assert.throws(()=>resolveStage(p));
  for(const s of STAGES)assert.equal(resolveStage(progressFromStage(s.id)),s.id);
});
test('备份保存实际两维进度，价格类别由系统重新推导',()=>{
  const state=initialState();state.progress={heroGeneration:10,fireProgress:'t12'};
  const restored=validateState(state,items);
  assert.deepEqual(restored.progress,{heroGeneration:10,fireProgress:'fc10'});
  assert.equal(restored.stage,'gen7-fc10-gen8');
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(restored)),items),restored);
  for(const progress of [null,[],{heroGeneration:7,fireProgress:'fc99'}])assert.throws(()=>validateState({...state,progress},items));
});
test('旧备份保持价格类并提示确认进度，旧单价保留归档且不生效',()=>{
  for(const s of STAGES){
    const legacy=initialState();delete legacy.progress;legacy.stage=s.id;legacy.overrides={[`${s.id}:charm-guide`]:999};
    const restored=validateState(legacy,items);
    assert.equal(restored.stage,s.id);assert.equal(restored.progress.needsConfirmation,true);
    assert.deepEqual(restored.overrides,legacy.overrides);
    assert.notEqual(getPrice(items.find(i=>i.id==='charm-guide'),s.id,restored.overrides,true)?.value,999);
  }
});


test('火晶选项仅保留用户指定七档，旧中间档备份正常迁移',()=>{
  assert.deepEqual(FIRE_PROGRESS.map(p=>p.id),['pre-crystal','fc3','fc5','t11','fc8','fc10','t12']);
  for(const [old,next] of Object.entries({fc1:'pre-crystal',fc2:'pre-crystal',fc4:'fc3',fc6:'fc5',fc7:'fc5',fc9:'fc8'})){
    const state=initialState();state.progress={heroGeneration:({'pre-crystal':2,fc3:3,fc5:4,fc8:7})[next],fireProgress:old};state.account.inventory.alloy=123;
    const migrated=validateState(state,items);
    assert.equal(migrated.progress.fireProgress,next);
    assert.equal(migrated.stage,group(state.progress.heroGeneration,next));
    assert.equal(migrated.account.inventory.alloy,123);
  }
});


test('只有2、3、4、5、7代提供相邻两档选择，其余自动匹配',()=>{
  const expected={1:['pre-crystal'],2:['pre-crystal','fc3'],3:['fc3','fc5'],4:['fc5','t11'],5:['t11','fc8'],6:['fc8'],7:['fc8','fc10']};
  for(const h of HERO_GENERATIONS)assert.deepEqual(fireChoicesForHero(h.id).map(f=>f.id),expected[h.id]||['fc10']);
  for(const [hero,lower,upper,lowerGroup,upperGroup] of [[2,'pre-crystal','fc3','pre-crystal','fc3'],[3,'fc3','fc5','fc3','fc5'],[4,'fc5','t11','fc5','t11'],[5,'t11','fc8','t11','gen6-fc8'],[7,'fc8','fc10','gen7-fc8','gen7-fc10-gen8']]){
    assert.equal(group(hero,lower),lowerGroup);assert.equal(group(hero,upper),upperGroup);
  }
});
test('切换英雄及导入旧组合时收敛到可用档位，T12不产生新价格',()=>{
  assert.deepEqual(normalizeProgress({heroGeneration:6,fireProgress:'pre-crystal'}),{heroGeneration:6,fireProgress:'fc8'});
  assert.deepEqual(normalizeProgress({heroGeneration:2,fireProgress:'fc10'}),{heroGeneration:2,fireProgress:'fc3'});
  assert.equal(group(10,'t12'),group(10,'fc10'));
  assert.equal(group(10,'t12'),group(8,'fc10'));
});
