export function createPersistence({getState,validate,storageKey,storage,onStatus,fetcher=fetch,mode='disk'}) {
  let revision=null,enabled=false,conflict=false,timer,queue=Promise.resolve(),needsInitialSave=false;
  let message='正在检查F盘存档';
  const status=text=>{message=text;onStatus(text);};
  async function flush(){
    if(!enabled||conflict)return;
    const snapshot=structuredClone(getState());
    queue=queue.catch(()=>{}).then(async()=>{
      if(conflict)return;
      status('正在保存到F盘…');
      const response=await fetcher('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,state:snapshot})});
      const result=await response.json();
      if(!response.ok){if(response.status===409)conflict=true;throw new Error(result.error||'F盘保存失败');}
      revision=result.revision;
      status('已自动保存到F盘 · '+new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(result.savedAt)));
    }).catch(e=>status(e.message+'；请导出备份保留本页数据'));
    return queue;
  }
  function save(){
    try{storage.setItem(storageKey,JSON.stringify(getState()));storage.setItem(storageKey+':savedAt',String(Date.now()));}
    catch{status(mode==='browser'?'浏览器保存失败，请立即导出备份保留本页数据':'浏览器空间不足，继续尝试保存到F盘');if(mode==='browser')return;}
    if(mode==='browser'){status('已自动保存在此浏览器 · 建议定期导出备份');return;}
    clearTimeout(timer);timer=setTimeout(flush,500);
    if(enabled&&!conflict)status('等待保存到F盘…');
  }
  async function load(){
    if(mode==='browser'){status('库存与等级仅保存在此浏览器 · 可导入或导出备份');return null;}
    try{
      const response=await fetcher('/api/state',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('F盘自动存档未连接');
      const record=await response.json();enabled=true;
      let localTime=0;
      try{const local=storage.getItem(storageKey);if(local){validate(JSON.parse(local));localTime=Number(storage.getItem(storageKey+':savedAt')||0);}}catch{}
      if(record){
        const state=validate(record.state);revision=record.revision;
        if(Date.parse(record.savedAt)>=localTime){
          try{storage.setItem(storageKey,JSON.stringify(state));storage.setItem(storageKey+':savedAt',String(Date.parse(record.savedAt)));}catch{}
          status('已载入F盘存档');return state;
        }
      }
      needsInitialSave=true;
      status('已启用F盘自动存档');return null;
    }catch(e){status(e.message+'；目前仅保存在当前浏览器，请导出备份');return null;}
  }
  return {load,save,flush,get message(){return message;},get needsInitialSave(){return needsInitialSave;}};
}
