import {setTechnologyLevel} from './technology-levels.js';
export function applyTechnologyQuickEdit(node,levels,targets,kind,raw){
 if(!node||!['current','target'].includes(kind))throw new Error('科技填写位置无效');
 const value=String(raw).trim()===''?null:Number(raw);
 if(value!==null&&(!Number.isInteger(value)||value<0||value>node.max))throw new Error(`请输入0—${node.max}之间的整数等级`);
 if(kind==='target'&&value!==null&&(value<1||(levels[node.id]!==undefined&&value<=levels[node.id])))throw new Error('目标等级需高于当前等级；留空可清除目标');
 return kind==='current'?{levels:setTechnologyLevel(levels,node.id,value),targets:{...targets}}:{levels:{...levels},targets:setTechnologyLevel(targets,node.id,value)};
}
