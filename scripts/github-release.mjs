import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const result=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'},timeout:15000});
if(result.status!==0)throw Error('GitHub登录不可用');
const values=Object.fromEntries(result.stdout.trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
if(!values.password)throw Error('未取得GitHub登录凭据');
const headers={Authorization:'Bearer '+values.password,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'winter-ledger-release','X-GitHub-Api-Version':'2022-11-28'};
async function api(path,method='GET',body){
 const r=await fetch('https://api.github.com'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data={};}
 if(!r.ok)throw Error(`GitHub ${r.status}: ${data.message||r.statusText}`);
 return data;
}
const repo='/repos/3372126760-lang/winter-ledger-beta';
switch(process.argv[2]){
 case 'create':{
  const user=await api('/user');if(user.login!=='3372126760-lang')throw Error('当前GitHub账号不匹配');
  const r=await api('/user/repos','POST',{name:'winter-ledger-beta',description:'冬日账本 · 无尽冬日性价比模型公开内测版',private:false,has_issues:true,has_wiki:false,auto_init:false});
  const info={repository:r.html_url,clone:r.clone_url,private:r.private,owner:r.owner.login};
  await writeFile(new URL('../artifacts/github-publish.json',import.meta.url),JSON.stringify(info,null,2));console.log(JSON.stringify(info));break;
 }
 case 'pages':{
  const r=await api(repo+'/pages','POST',{build_type:'workflow'});console.log(JSON.stringify({url:r.html_url,status:r.status,buildType:r.build_type}));break;
 }
 case 'status':{
  const r=await api(repo+'/actions/runs?per_page=3');console.log(JSON.stringify(r.workflow_runs.map(v=>({id:v.id,status:v.status,conclusion:v.conclusion,url:v.html_url,head:v.head_sha}))));break;
 }
 case 'jobs':{
  const r=await api(repo+`/actions/runs/${Number(process.argv[3])}/jobs`);console.log(JSON.stringify(r.jobs.map(j=>({id:j.id,name:j.name,status:j.status,conclusion:j.conclusion,steps:j.steps.map(s=>({name:s.name,status:s.status,conclusion:s.conclusion}))}))));break;
 }
 case 'dispatch':await api(repo+'/actions/workflows/pages.yml/dispatches','POST',{ref:'main'});console.log('已启动发布');break;
 case 'site':{const r=await api(repo+'/pages');console.log(JSON.stringify({url:r.html_url,status:r.status,buildType:r.build_type}));break;}
 default:throw Error('未知发布操作');
}
