import test from 'node:test'; import assert from 'node:assert/strict';
import { filterRows, toCSV, validateTask, hasProviderKey, turnaroundRisk, defectRisk, workloadSummary } from '../domain/featurePack.js';
test('search/filter preserves false/0/empty',()=>{ assert.equal(filterRows([{title:'A',status:'pending',n:0,ok:false},{title:'B',status:'done',n:1}],{q:'a',status:'pending'}).length,1); assert.equal(filterRows([{title:'x'}],{q:'missing'}).length,0); });
test('CSV/JSON export preserves falsy',()=>{ const csv=toCSV([{a:0,b:false,c:''}]); assert.match(csv,/0/); assert.match(csv,/false/); assert.equal(JSON.parse(JSON.stringify({a:0,b:false})).b,false); });
test('task validation',()=>{ assert.match(validateTask({}),/title/); assert.equal(validateTask({title:'x'}),null); });
test('AI fallback labelled aiGenerated:false',()=>{ const r=turnaroundRisk([{due_date:'2000-01-01',status:'pending'}]); assert.equal(r.aiGenerated,false); assert.equal(r.overdue,1); assert.ok(r.sections.length>=2); assert.equal(hasProviderKey({}),false); });
