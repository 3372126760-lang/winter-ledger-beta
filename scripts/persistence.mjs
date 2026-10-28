import {readFile,mkdir,writeFile,rename,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

export function createStore(directory,validate) {
  const file=join(directory,'state.json');let queue=Promise.resolve();
  const read=async()=>{
    try{return JSON.parse(await readFile(file,'utf8'));}
    catch(e){if(e.code==='ENOENT')return null;throw new Error('磁盘记录无法读取，请保留文件并检查备份');}
  };
  const save=(state,revision)=>{
    const work=queue.then(async()=>{
      const previous=await read();
      if((previous?.revision??null)!==revision){const e=new Error('另一窗口已有更新，请导出本页备份后刷新核对');e.status=409;throw e;}
      const next={revision:randomUUID(),savedAt:new Date().toISOString(),state:validate(state)};
      await mkdir(directory,{recursive:true});
      if(previous)await copyFile(file,join(directory,'state.previous.json'));
      const temporary=join(directory,`state-${next.revision}.tmp`);
      await writeFile(temporary,JSON.stringify(next,null,2),'utf8');
      await rename(temporary,file);
      return next;
    });
    queue=work.catch(()=>{});return work;
  };
  return {read,save};
}
