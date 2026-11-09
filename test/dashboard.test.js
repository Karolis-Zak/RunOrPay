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
