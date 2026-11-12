import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timingSafeEqual} from 'node:crypto';
import {openDatabase} from '../src/sqlite-binding.js';
import worker from '../src/worker.js';
import {summarise,formatPace} from '../dashboard/stats-model.js';

crypto.subtle.timingSafeEqual=(a,b)=>timingSafeEqual(Buffer.from(a),Buffer.from(b));

test('real protected dashboard response provides recorded stats for both runners',async()=>{
  const DB=openDatabase(':memory:'); const secret='d'.repeat(32), origin='https://karolis-zak.github.io';
  try {
    const insert='INSERT INTO activities (runner,source_id,started_at,metres,updated_at,moving_time) VALUES (?,?,?,?,?,?)';
    await DB.prepare(insert).bind('Karolis','1','2026-11-09T12:00:00Z',3000,'2026-11-09T12:00:00Z','15:00').run();
    await DB.prepare(insert).bind('Lorenas','2','2026-11-10T12:00:00Z',1000,'2026-11-10T12:00:00Z',null).run();
    const response=await worker.fetch(new Request('http://localhost/dashboard/runs',{headers:{Origin:origin,Authorization:`Bearer ${secret}`}}),{DB,DASHBOARD_READ_SECRET:secret,DASHBOARD_ALLOWED_ORIGIN:origin});
    assert.equal(response.status,200); const body=await response.json(); assert.equal(body.truncated,false);
    const [karolis,lorenas]=summarise(body.runs);
    assert.equal(karolis.metres,3000); assert.equal(formatPace(karolis.secondsPerKm),'5:00 /km');
    assert.equal(lorenas.metres,1000); assert.equal(lorenas.secondsPerKm,null);
  } finally {DB.close();}
});

test('API flags more than 2000 activities so partial stats cannot be presented as complete',async()=>{
  const DB=openDatabase(':memory:'); const secret='d'.repeat(32), origin='https://karolis-zak.github.io';
  try {
    const insert='INSERT INTO activities (runner,source_id,started_at,metres,updated_at) VALUES (?,?,?,?,?)';
    for(let i=0;i<2001;i++) await DB.prepare(insert).bind('Karolis',String(i),'2026-11-09T12:00:00Z',1000,'2026-11-09T12:00:00Z').run();
    const response=await worker.fetch(new Request('http://localhost/dashboard/runs',{headers:{Origin:origin,Authorization:`Bearer ${secret}`}}),{DB,DASHBOARD_READ_SECRET:secret,DASHBOARD_ALLOWED_ORIGIN:origin});
    const body=await response.json();
    assert.equal(body.runs.length,2000);
    assert.equal(body.truncated,true);
  } finally {DB.close();}
});
