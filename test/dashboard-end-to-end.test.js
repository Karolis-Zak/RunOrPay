import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {timingSafeEqual} from 'node:crypto';
import vm from 'node:vm';
import {openDatabase} from '../src/sqlite-binding.js';
import worker from '../src/worker.js';

crypto.subtle.timingSafeEqual = (a,b) => timingSafeEqual(Buffer.from(a),Buffer.from(b));

test('recorded runs travel through the protected read route to dashboard calculations', async () => {
  const DB = openDatabase(':memory:');
  const secret='d'.repeat(32), origin='https://karolis-zak.github.io';
  const env={DB,DASHBOARD_READ_SECRET:secret,DASHBOARD_ALLOWED_ORIGIN:origin};
  const elements={};
  const document={querySelector(selector){return elements[selector] ??= {innerHTML:'',textContent:'',hidden:false,value:'',classList:{add(){},remove(){}},addEventListener(_name,handler){this.handler=handler}};}};
  class TestDate extends Date {constructor(...args){super(...(args.length ? args : ['2026-11-10T12:00:00Z']));}}
  try {
    await DB.prepare('INSERT INTO activities (runner,source_id,started_at,metres,updated_at,moving_time) VALUES (?,?,?,?,?,?)').bind('Karolis','1','2026-11-09T12:00:00Z',30,'2026-11-09T12:00:00Z','41s').run();
    await DB.prepare('INSERT INTO activities (runner,source_id,started_at,metres,updated_at,moving_time) VALUES (?,?,?,?,?,?)').bind('Lorenas','2','2026-11-09T12:00:00Z',1000,'2026-11-09T12:00:00Z','10:00').run();
    const fetch = async (url,options) => worker.fetch(new Request(url,{headers:{...options.headers,Origin:origin}}),env);
    vm.runInNewContext(readFileSync(new URL('../dashboard/app.js',import.meta.url),'utf8'),{document,window:{RUN_OR_PAY_API_URL:'https://example.test/dashboard/runs'},URL,Intl,Date:TestDate,Number,String,Array,Math,JSON,Error,AbortSignal,setInterval(){},fetch});
    document.querySelector('#access-key').value=secret;
    elements['#connect-form'].handler({preventDefault(){}});
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(elements['#source-title'].textContent,'Connected');
    assert.match(elements['#runner-cards'].innerHTML,/9\.97 KM LEFT/);
    assert.match(elements['#runner-cards'].innerHTML,/4 KM LEFT/);
    assert.match(elements['#run-rows'].innerHTML,/41s/);
    assert.match(elements['#leaderboard'].innerHTML,/Lorenas/);
  } finally {DB.close();}
});
