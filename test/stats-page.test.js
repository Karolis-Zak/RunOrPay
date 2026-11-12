import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {summarise,formatKm,formatPace,formatSpeed,formatDuration,validRuns} from '../dashboard/stats-model.js';

function setup(fetch, saved='') {
  const elements={};
  const document={visibilityState:'visible',addEventListener(){},querySelector(selector){return elements[selector]??={innerHTML:'',textContent:'',hidden:false,value:'',checked:true,open:true,classList:{add(){},remove(){}},addEventListener(_event,handler){this.handler=handler;}};}};
  const storage=new Map(saved?[['run-or-pay.dashboard-key.v1',saved]]:[]);
  const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  const source=readFileSync(new URL('../dashboard/stats.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
  vm.runInNewContext(source,{document,window:{RUN_OR_PAY_API_URL:'https://example.test/dashboard/runs'},localStorage,URL,Intl,Date,Number,String,Array,Math,JSON,Error,setInterval(){},fetch,summarise,formatKm,formatPace,formatSpeed,formatDuration,validRuns});
  return {elements,storage};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('both pages provide clear this-week and stats navigation',()=>{
  const home=readFileSync(new URL('../dashboard/index.html',import.meta.url),'utf8');
  const stats=readFileSync(new URL('../dashboard/stats.html',import.meta.url),'utf8');
  assert.match(home,/<a href="index\.html" aria-current="page">This week<\/a>/);
  assert.match(home,/<a href="stats\.html">Stats<\/a>/);
  assert.match(stats,/<a href="stats\.html" aria-current="page">Stats<\/a>/);
  assert.match(stats,/<a href="index\.html">This week<\/a>/);
  assert.doesNotMatch(stats,/01\s*<i>vs<\/i>\s*02/);
});

test('stats page renders valid records and does not invent best efforts',async()=>{
  const rows=[{runner:'Karolis',metres:3000,started_at:'2026-11-09T12:00:00Z',moving_time:'15:00'}];
  const {elements}=setup(async()=>({ok:true,status:200,json:async()=>({runs:rows,truncated:false})}),'key');
  await settle();
  assert.match(elements['#runner-stats'].innerHTML,/3 km/);
  assert.match(elements['#runner-stats'].innerHTML,/5:00 \/km/);
  assert.match(elements['#stats-status'].textContent,/Complete history is not verified/);
  assert.doesNotMatch(elements['#comparison'].innerHTML,/fastest mile/i);
});

test('comparison does not declare a faster runner when displayed paces are equal',async()=>{
  const rows=[{runner:'Karolis',metres:1000,started_at:'2026-11-09T12:00:00Z',moving_time:'5:00'},
    {runner:'Lorenas',metres:1001,started_at:'2026-11-09T12:00:00Z',moving_time:'5:00'}];
  const {elements}=setup(async()=>({ok:true,status:200,json:async()=>({runs:rows,truncated:false})}),'key');
  await settle();
  const paceCard=elements['#comparison'].innerHTML.match(/<article class="stats-card"><h3>Average moving pace<\/h3>.*?<\/article>/)?.[0];
  assert.ok(paceCard);
  assert.match(paceCard,/Equal at displayed precision/);
  assert.doesNotMatch(paceCard,/ahead/);
});

test('approximate moving pace is not declared a winner for short rounded runs',async()=>{
  const rows=[{runner:'Karolis',metres:30,started_at:'2026-11-09T12:00:00Z',moving_time:'41s'},
    {runner:'Lorenas',metres:40,started_at:'2026-11-09T12:00:00Z',moving_time:'23s'}];
  const {elements}=setup(async()=>({ok:true,status:200,json:async()=>({runs:rows,truncated:false})}),'key');
  await settle();
  const paceCard=elements['#comparison'].innerHTML.match(/<article class="stats-card"><h3>Average moving pace<\/h3>.*?<\/article>/)?.[0];
  assert.ok(paceCard); assert.match(paceCard,/≈/); assert.doesNotMatch(paceCard,/ahead/);
});

test('stats page rejects truncated or malformed responses rather than showing partial totals',async()=>{
  for (const body of [{runs:[],truncated:true},null,{runs:[{runner:'Unknown'}],truncated:false}]) {
    const {elements}=setup(async()=>({ok:true,status:200,json:async()=>body}),'key');
    await settle();
    assert.match(elements['#stats-status'].textContent,/incomplete/);
    assert.equal(elements['#runner-stats'].innerHTML,'');
  }
});

test('expired key is removed and user can sign in again',async()=>{
  const {elements,storage}=setup(async()=>({ok:false,status:401}),'bad-key');
  await settle();
  assert.equal(storage.size,0);
  assert.equal(elements['#connect-form'].hidden,false);
  assert.match(elements['#source-detail'].textContent,/not accepted/);
});

test('a rate-limited server is not retried early, even by the retry button',async()=>{
  let calls=0;
  const {elements}=setup(async()=>{calls++;return {ok:false,status:429,headers:{get:()=> '120'}};},'key');
  await settle();
  assert.match(elements['#stats-status'].textContent,/Too many requests/);
  elements['#retry'].handler();
  await settle();
  assert.equal(calls,1);
});

test('signing out during a request cannot restore the remembered key or results',async()=>{
  let finish;
  const {elements,storage}=setup(()=>new Promise(resolve=>{finish=resolve;}),'key');
  elements['#disconnect'].handler();
  finish({ok:true,status:200,json:async()=>({runs:[{runner:'Karolis',metres:1000,started_at:'2026-11-09T12:00:00Z',moving_time:'10:00'}],truncated:false})});
  await settle();
  assert.equal(storage.size,0);
  assert.equal(elements['#runner-stats'].innerHTML,'');
  assert.match(elements['#stats-status'].textContent,/Sign in/);
});
