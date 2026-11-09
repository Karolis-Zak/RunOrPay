import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function setup() {
  const elements = {};
  let tick;
  const document = {querySelector(selector) {return elements[selector] ??= {innerHTML:'',textContent:'',hidden:false,value:'',classList:{add(){},remove(){}},addEventListener(_name,handler){this.handler=handler}};}};
  let clock = '2026-11-15T23:59:00Z';
  class TestDate extends Date { constructor(...args) {super(...(args.length ? args : [clock]));} static now() {return Date.parse(clock);} }
  vm.runInNewContext(readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8'),{document,Intl,Date:TestDate,Number,String,Array,Math,JSON,Error,setInterval(fn){tick=fn;}});
  const upload = text => elements['#data-file'].handler({target:{files:[{size:text.length,text:async()=>text}],value:'file'}});
  return {elements,upload,tick,advance(value){clock=value;}};
}

test('dashboard never invents totals and clears old values after an invalid snapshot', async () => {
  const {elements,upload} = setup();
  assert.match(elements['#runner-cards'].innerHTML,/AWAITING DATA/);
  await upload(JSON.stringify([{runner:'Karolis',started_at:'2026-11-09T12:00:00Z',metres:30}]));
  assert.match(elements['#runner-cards'].innerHTML,/9\.97 KM LEFT/);
  await upload('not JSON');
  assert.match(elements['#runner-cards'].innerHTML,/AWAITING DATA/);
  assert.doesNotMatch(elements['#runner-cards'].innerHTML,/9\.97 KM LEFT/);
});

test('open dashboard recalculates the London week after Monday rollover', async () => {
  const {elements,upload,tick,advance} = setup();
  await upload(JSON.stringify([{runner:'Karolis',started_at:'2026-11-09T12:00:00Z',metres:30}]));
  assert.match(elements['#runner-cards'].innerHTML,/9\.97 KM LEFT/);
  advance('2026-11-16T00:01:00Z');
  tick();
  assert.doesNotMatch(elements['#runner-cards'].innerHTML,/9\.97 KM LEFT/);
  assert.match(elements['#runner-cards'].innerHTML,/10 KM LEFT/);
});

test('leaderboard sums recorded distance across weeks while weekly progress stays separate', async () => {
  const {elements,upload} = setup();
  await upload(JSON.stringify([{runner:'Karolis',started_at:'2026-11-09T12:00:00Z',metres:70},{runner:'Karolis',started_at:'2026-11-02T12:00:00Z',metres:2000},{runner:'Lorenas',started_at:'2026-11-09T12:00:00Z',metres:100}]));
  assert.match(elements['#runner-cards'].innerHTML,/0\.7% COMPLETE/);
  assert.match(elements['#leaderboard'].innerHTML,/2\.07<small> km/);
  assert.ok(elements['#leaderboard'].innerHTML.indexOf('Karolis') < elements['#leaderboard'].innerHTML.indexOf('Lorenas'));
  assert.doesNotMatch(elements['#run-rows'].innerHTML,/table-arrow/);
});

test('live connection sends the access key in a header and hides totals when data is truncated', async () => {
  const elements = {}, calls = [];
  const document = {querySelector(selector) {return elements[selector] ??= {innerHTML:'',textContent:'',hidden:false,value:'',classList:{add(){},remove(){}},addEventListener(_name,handler){this.handler=handler}};}};
  const response = {ok:true,status:200,json:async()=>({runs:[{runner:'Karolis',started_at:'2026-11-09T12:00:00Z',metres:30}],truncated:true})};
  vm.runInNewContext(readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8'),{document,window:{RUN_OR_PAY_API_URL:'https://example.test/dashboard/runs'},URL,Intl,Date,Number,String,Array,Math,JSON,Error,AbortSignal,setInterval(){},fetch:async(url,options)=>{calls.push({url,options});return response;}});
  document.querySelector('#access-key').value='private-test-key';
  elements['#connect-form'].handler({preventDefault(){}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls[0].url,'https://example.test/dashboard/runs');
  assert.equal(calls[0].options.headers.Authorization,'Bearer private-test-key');
  assert.equal(calls[0].options.redirect,'error');
  assert.equal(elements['#access-key'].value,'');
  assert.equal(elements['#source-title'].textContent,'Connection unavailable');
  assert.match(elements['#runner-cards'].innerHTML,/AWAITING DATA/);
});

test('a successful sign-in can be remembered, restored and signed out on this browser', async () => {
  const storage = new Map();
  const localStorage = {getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  let accepted = false;
  const build = () => {
    const elements = {};
    const document = {querySelector(selector) {return elements[selector] ??= {innerHTML:'',textContent:'',hidden:false,value:'',checked:true,classList:{add(){},remove(){}},addEventListener(_name,handler){this.handler=handler}};}};
    const fetch = async () => accepted ? {ok:true,status:200,json:async()=>({runs:[],truncated:false})} : {ok:false,status:401};
    vm.runInNewContext(readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8'),{document,window:{RUN_OR_PAY_API_URL:'https://example.test/dashboard/runs',localStorage},URL,Intl,Date,Number,String,Array,Math,JSON,Error,AbortSignal,setInterval(){},fetch});
    return {elements,document};
  };
  const settle = () => new Promise(resolve=>setImmediate(resolve));
  const first=build();
  first.document.querySelector('#access-key').value='incorrect';
  first.elements['#connect-form'].handler({preventDefault(){}});
  await settle();
  assert.equal(storage.size,0);
  accepted=true;
  first.document.querySelector('#access-key').value='correct-key';
  first.elements['#connect-form'].handler({preventDefault(){}});
  await settle();
  assert.equal(storage.get('run-or-pay.dashboard-key.v1'),'correct-key');
  const reopened=build();
  await settle();
  assert.equal(reopened.elements['#source-title'].textContent,'Connected');
  reopened.elements['#disconnect'].handler();
  assert.equal(storage.size,0);
  assert.equal(reopened.elements['#source-title'].textContent,'Live data not connected');
});

test('signing out during a request does not restore access when that request finishes', async () => {
  const elements={}, storage=new Map(); let finish;
  const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  const document={querySelector(selector){return elements[selector]??={innerHTML:'',textContent:'',hidden:false,value:'',checked:true,classList:{add(){},remove(){}},addEventListener(_name,handler){this.handler=handler}};}};
  const fetch=()=>new Promise(resolve=>{finish=resolve;});
  vm.runInNewContext(readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8'),{document,window:{RUN_OR_PAY_API_URL:'https://example.test/dashboard/runs',localStorage},URL,Intl,Date,Number,String,Array,Math,JSON,Error,AbortSignal,setInterval(){},fetch});
  document.querySelector('#access-key').value='key';
  elements['#connect-form'].handler({preventDefault(){}});
  elements['#disconnect'].handler();
  finish({ok:true,status:200,json:async()=>({runs:[],truncated:false})});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(storage.size,0);
  assert.equal(elements['#source-title'].textContent,'Live data not connected');
});
