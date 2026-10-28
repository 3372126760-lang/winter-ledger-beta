import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersistence} from '../src/domain/persistence.js';
import {publicText,publicData,normalizeBasePath} from '../scripts/build-public.mjs';
test('公开库存只写当前浏览器，不连接本机或共享库存接口',async()=>{
 const memory=new Map(),statuses=[];let requests=0;const state={account:{inventory:{screw:15},history:[]}};
 const p=createPersistence({getState:()=>state,validate:v=>v,storageKey:'beta',storage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},onStatus:s=>statuses.push(s),mode:'browser',fetcher:()=>{requests++;throw Error('不应请求');}});
 assert.equal(await p.load(),null);p.save();await p.flush();assert.equal(requests,0);
 assert.equal(JSON.parse(memory.get('beta')).account.inventory.screw,15);assert.match(statuses.at(-1),/已自动保存在此浏览器/);
});
test('公开库存保存失败时提示导出，不显示已保存',async()=>{
 let status;const p=createPersistence({getState:()=>({}),validate:v=>v,storageKey:'beta',storage:{setItem:()=>{throw Error('quota');}},onStatus:s=>status=s,mode:'browser'});
 await p.load();p.save();assert.match(status,/保存失败.*导出备份/);
});
test('GitHub子目录内数据、CSS和动态贴图正确定位，外部网址不改写',()=>{
 const source=`fetch('/src/data/catalog.json');const image='/public/assets/x.png';const external='https://wosgift.com/public/x';`;
 assert.equal(publicText(source,'/winter-ledger/'),`fetch('/winter-ledger/src/data/catalog.json');const image='/winter-ledger/public/assets/x.png';const external='https://wosgift.com/public/x';`);
 assert.equal(normalizeBasePath('/winter-ledger/'),'/winter-ledger/');assert.throws(()=>normalizeBasePath('/../storage/'));
});
test('发布数据移除本机素材路径，保留公开出处与奖励',()=>{
 assert.deepEqual(publicData({sourceFile:'F:/素材.png',sourceUrl:'https://wosgift.com/',entries:[{name:'宝箱',localFile:'C:/图片.png',count:2}]}),{sourceUrl:'https://wosgift.com/',entries:[{name:'宝箱',count:2}]});
});
