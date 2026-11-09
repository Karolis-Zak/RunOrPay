import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timingSafeEqual} from 'node:crypto';
import {openDatabase} from '../src/sqlite-binding.js';
import worker from '../src/worker.js';
import {parseActivityDetails} from '../whatsapp/strava-parse.js';

crypto.subtle.timingSafeEqual = (a,b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));

test('a recognised run queues one message with duration and weekly target', async () => {
  const DB = openDatabase(':memory:');
  const env = {DB, KAROLIS_INGEST_SECRET:'karolis-secret', LORENAS_INGEST_SECRET:'lorenas-secret', ADMIN_SECRET:'admin-secret'};
  const parsed = parseActivityDetails({title:'Morning | Run | Strava',date:'Monday, November 9, 2026',text:'3.20 km\nDistance\n41s\nMoving Time'});
  const send = (name, secret, id) => worker.fetch(new Request(`http://localhost/ingest/${name}`, {method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({id,metres:parsed.metres,startedAt:`${parsed.date}T12:00:00Z`,movingTime:parsed.movingTime})}),env);
  try {
    assert.equal((await send('Karolis','karolis-secret','101')).status, 200);
    assert.equal((await send('Karolis','karolis-secret','101')).status, 200);
    // Simulate a crash after writing the activity but before queueing it.
    await DB.prepare('DELETE FROM notifications WHERE id=?').bind('activity:Karolis:101').run();
    assert.equal((await send('Karolis','karolis-secret','101')).status, 200);
    assert.equal((await send('Lorenas','lorenas-secret','102')).status, 200);
    const response = await worker.fetch(new Request('http://localhost/notifications?pending=1',{headers:{Authorization:'Bearer admin-secret'}}),env);
    const {notifications} = await response.json();
    assert.equal(notifications.length, 2);
    const karolis = notifications.find(item => item.id === 'activity:Karolis:101').text;
    const lorenas = notifications.find(item => item.id === 'activity:Lorenas:102').text;
    assert.match(karolis,/3\.2 km in 41s/);
    assert.match(karolis,/Remaining: 6\.8 km/);
    assert.match(lorenas,/Remaining: 1\.8 km/);
    assert.match(karolis,/9 Nov 2026/);
    const ack = text => worker.fetch(new Request('http://localhost/notifications/ack',{method:'POST',headers:{Authorization:'Bearer admin-secret','Content-Type':'application/json'},body:JSON.stringify({id:'activity:Karolis:101',text})}),env);
    const claim = () => worker.fetch(new Request('http://localhost/notifications/claim',{method:'POST',headers:{Authorization:'Bearer admin-secret','Content-Type':'application/json'},body:JSON.stringify({id:'activity:Karolis:101',text:karolis})}),env);
    assert.equal((await claim()).status,200);
    assert.equal((await claim()).status,409);
    const remaining = await (await worker.fetch(new Request('http://localhost/notifications?pending=1',{headers:{Authorization:'Bearer admin-secret'}}),env)).json();
    assert.equal(remaining.notifications.some(item => item.id === 'activity:Karolis:101'),false);
    assert.equal((await ack('stale message')).status,409);
    assert.equal((await ack(karolis)).status,200);
  } finally { DB.close(); }
});
