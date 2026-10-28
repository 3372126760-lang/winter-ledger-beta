import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAccountProgressPanel} from '../src/ui/account-progress.js';
import {createPlanningPanel} from '../src/ui/planning.js';
import {createChiefLoadoutPanel} from '../src/ui/chief-loadout.js';
import {initialState} from '../src/domain/model.js';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8').then(JSON.parse);
const [data,art,catalog]=await Promise.all(['src/data/planning.json','src/data/chief-art.json','src/data/catalog.json'].map(read));
const esc=value=>String(value??'').replaceAll('"','&quot;');
const options=(rows,value)=>rows.map(([id,name])=>`<option value="${id}" ${id===value?'selected':''}>${name}</option>`).join('');
// These tests render UI without a browser. Interactions are checked separately in
// the isolated browser fixture, which does not connect to the user's state API.
globalThis.window={addEventListener(){}};
function context(state){return {esc,options,fmt:String,money:String,pill:String,artIcon:()=>'',itemOf:id=>catalog.items.find(i=>i.id===id),getState:()=>state,onRefresh(){},notify:assert.fail};}

test('当前等级浏览独立于规划：三类科技和兵种切换保留原目标、库存和已有满级记录',()=>{
 const state=initialState();state.items=catalog.items;
 state.planning={systemId:'t11',pathId:'t11-1',from:2,to:6,pieces:1,technologyTroop:'marksman'};
 state.account.technologyLevels={'battle-1-0':3,'t11-lancer-0':4};state.account.inventory.screw=777;
 const before=structuredClone(state),panel=createAccountProgressPanel(data,art,context(state));
 for(const selection of [{systemId:'research',nodeId:'battle-1-0'},{systemId:'t11',nodeId:'t11-lancer-0'},{systemId:'t12'},{systemId:'chief-gems'}]){
  panel.open(selection);const html=panel.view();
  assert.ok(html.includes('账号当前等级'));assert.ok(!html.includes('id="planning-to"'));
  assert.deepEqual(state,before);
 }
 panel.open({systemId:'research',nodeId:'battle-1-0'});
 assert.match(panel.view(),/现有 3级 · 已满级/);
 panel.open({systemId:'t11',nodeId:'t11-lancer-0'});
 assert.match(panel.view(),/现有 4级/);
});

test('装备宝石规划页可独立编辑24处当前与目标等级',()=>{
 const state=initialState();state.account.chiefLoadout.helmet={gear:2,gems:[1,0,null]};
 const before=structuredClone(state),shared=context(state);
 const current=createChiefLoadoutPanel(data,art,{...shared,mode:'current'}).view('chief-gear');
 const plan=createChiefLoadoutPanel(data,art,{...shared,mode:'planning'}).view('chief-gear');
 assert.equal((current.match(/data-chief-level=/g)||[]).length,24);
 assert.ok(current.includes('批量填写当前等级'));assert.ok(!current.includes('id="chief-open-current"'));
 assert.equal((plan.match(/data-chief-level=/g)||[]).length,24);assert.equal((plan.match(/data-chief-target=/g)||[]).length,24);assert.ok(!plan.includes('批量填写当前等级'));
 assert.ok(!plan.includes('id="chief-open-current"'));assert.ok(plan.includes('chief-inline-levels'));
 assert.deepEqual(state,before);
});

test('科技消耗读取账号实际起点；未记录不伪装成零级，目标不回写现状',()=>{
 const state=initialState();state.items=catalog.items;
 state.planning={systemId:'research',pathId:'research-battle-weapons-prep-i',from:0,to:3,pieces:1};
 const panel=createPlanningPanel(data,art,context(state));
 assert.ok(panel.view().includes('当前等级未记录，请先填写账号现状'));
 assert.ok(!panel.view().includes('id="planning-to"'));
 state.account.technologyLevels['battle-1-0']=1;
 const before=structuredClone(state),html=panel.view();
 assert.ok(!html.includes('id="planning-from"'));
 assert.ok(!html.includes('id="planning-path"'));
 assert.ok(html.includes('当前 1级 → 计划 3级'));
 assert.ok(html.includes('当前 1/3'));assert.ok(html.includes('计划 3/3'));
 assert.ok(!html.includes('data-chief-level='));assert.deepEqual(state,before);
 state.technologyTargets={'battle-1-0':1};assert.ok(panel.view().includes('原计划目标已达成'));assert.equal(state.account.technologyLevels['battle-1-0'],1);
});
