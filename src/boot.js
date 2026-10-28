import {PUBLIC_BETA} from './runtime.js';
const root=document.querySelector('#app');
const slow=setTimeout(()=>{
 const hint=document.querySelector('#boot-hint');
 if(hint)hint.textContent=PUBLIC_BETA?'资料还在载入，请检查网络后重试。':'资料还在载入。如长时间没有变化，请确认本地服务正在运行。';
},6000);
try{await import('./app.js');}
catch(error){
 console.error('启动未完成',error);
 root.innerHTML=`<div class="boot-screen"><span class="boot-mark">冬</span><h1>暂时没有载入成功</h1><p>${PUBLIC_BETA?'请检查网络连接，再点重新载入。':'请先双击项目文件夹里的“启动冬日账本”，再点重新载入。'}</p><p>已保存的库存仍保留在此浏览器。</p><button class="button primary" id="boot-retry">重新载入</button></div>`;
 document.querySelector('#boot-retry').addEventListener('click',()=>location.reload());
}finally{clearTimeout(slow);}
