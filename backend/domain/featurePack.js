
function hasProviderKey(env=process.env){return Boolean(env.OPENROUTER_API_KEY||env.OPENAI_API_KEY);}
function esc(v){if(v===null||v===undefined)return '';const s=String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function toCSV(rows,columns){const cols=columns&&columns.length?columns:Object.keys(rows[0]||{});return [cols.join(','),...rows.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n')+(rows.length?'\n':'');}
function filterRows(rows,{q='',status,priority,...rest}={}){const needle=String(q||'').toLowerCase();return rows.filter(r=>{if(needle&&!Object.values(r).some(v=>v!==null&&v!==undefined&&String(v).toLowerCase().includes(needle)))return false;if(status!==undefined&&status!==''&&String(r.status??'')!==String(status))return false;if(priority!==undefined&&priority!==''&&String(r.priority??'')!==String(priority))return false;for(const[k,v]of Object.entries(rest)){if(v!==undefined&&v!==''&&String(r[k]??'')!==String(v))return false;}return true;});}
function validateTask(b={}){if(!b.title||!String(b.title).trim())return 'title is required';if(b.status&&!['pending','in_progress','completed','cancelled'].includes(b.status))return 'invalid status';return null;}
function section(label,value){return {label,value:value===undefined?null:value};}

function turnaroundRisk(rows=[]){const overdue=rows.filter(r=>r.due_date&&new Date(r.due_date)<new Date()&&r.status!=='completed').length;return {aiGenerated:false,provider:'deterministic-fallback',feature:'turnaround-risk',sections:[section('Total cases',rows.length),section('Overdue cases',overdue),section('Summary',overdue>0?overdue+' case(s) past due date':'No overdue cases')],overdue,total:rows.length};}
function defectRisk(rows=[]){const byType={};rows.forEach(r=>{const k=r.restoration_type||'unknown';byType[k]=(byType[k]||0)+1;});return {aiGenerated:false,provider:'deterministic-fallback',feature:'defect-risk',sections:[section('Total cases',rows.length),section('Restoration types',byType),section('Summary','Counts by restoration type; 0 means none recorded')],byType,total:rows.length};}
function workloadSummary(rows=[]){const open=rows.filter(r=>r.status!=='completed'&&r.status!=='shipped').length;return {aiGenerated:false,provider:'deterministic-fallback',feature:'workload-summary',sections:[section('Total cases',rows.length),section('Open cases',open),section('Summary',open+' open case(s)')],open,total:rows.length};}

export {hasProviderKey,toCSV,filterRows,validateTask,section,turnaroundRisk,defectRisk,workloadSummary};
