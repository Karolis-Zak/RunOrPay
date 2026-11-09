import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timingSafeEqual} from 'node:crypto';
import {openDatabase} from '../src/sqlite-binding.js';
import worker from '../src/worker.js';

crypto.subtle.timingSafeEqual = (a,b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));

test('dashboard access is read-only, origin-limited and uses a separate secret', async () => {
  const DB = openDatabase(':memory:');
  const secret = 'd'.repeat(32), origin = 'https://karolis-zak.github.io';
  const env = {DB, ADMIN_SECRET:'admin-secret', DASHBOARD_READ_SECRET:secret, DASHBOARD_ALLOWED_ORIGIN:origin};
  const request = (headers={},method='GET') => new Request('http://localhost/dashboard/runs',{method,headers});
  try {
    await DB.prepare('INSERT INTO activities (runner, source_id, started_at, metres, updated_at) VALUES (?, ?, ?, ?, ?)').bind('Karolis','private-source-id','2026-11-09T12:00:00Z',30,'2026-11-09T12:00:00Z').run();
    assert.equal((await worker.fetch(request(),env)).status,403);
    assert.equal((await worker.fetch(request({Origin:'https://attacker.example',Authorization:`Bearer ${secret}`}),env)).status,403);
    assert.equal((await worker.fetch(request({Origin:origin,Authorization:'Bearer admin-secret'}),env)).status,401);
    assert.equal((await worker.fetch(request({Origin:origin,Authorization:`Bearer ${secret}`},'POST'),env)).status,405);
    const preflight = await worker.fetch(request({Origin:origin},'OPTIONS'),env);
    assert.equal(preflight.status,204);
    assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
    const response = await worker.fetch(request({Origin:origin,Authorization:`Bearer ${secret}`}),env);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    const body = await response.json();
    assert.deepEqual(body.runs.map(x=>({...x})),[{runner:'Karolis',started_at:'2026-11-09T12:00:00Z',metres:30,moving_time:null}]);
    assert.equal(body.coverage,'unverified');
    assert.equal(body.truncated,false);
    assert.equal(JSON.stringify(body).includes('private-source-id'),false);
    assert.equal((await worker.fetch(request({Origin:origin,Authorization:`Bearer ${secret}`}),{DB})).status,403);
  } finally {DB.close();}
});
