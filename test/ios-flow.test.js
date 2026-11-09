import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';

crypto.subtle.timingSafeEqual = (a,b) => timingSafeEqual(Buffer.from(a),Buffer.from(b));

test('iOS batch is stored once, updated and deleted; report stays unverified', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const DB = {prepare(sql) {return {bind(...args) {return {
    async first() {return db.prepare(sql).get(...args) || null;},
    async run() {return db.prepare(sql).run(...args);},
    async all() {return {results:db.prepare(sql).all(...args)};}
  };}};}};
  // D1 also allows execution of unbound statements.
  const prepare = DB.prepare;
  DB.prepare = sql => {const p = prepare(sql); return {...p, all:() => p.bind().all()};};
  const env = {DB, KAROLIS_INGEST_SECRET:'ingest-test', ADMIN_SECRET:'admin-test'};
  const workout = {id:'healthkit:ios-test',activity_type:'running',source_name:'Strava',start_at:'2026-11-09T12:00:00Z',distance_meters:3200};
  const send = (workouts,deletions=[]) => worker.fetch(new Request('https://example.test/api/apple-health/sync', {method:'POST',headers:{Authorization:'Bearer ingest-test'},body:JSON.stringify({schema_version:2,workouts,deletions})}), env);
  assert.equal((await send([workout])).status, 200);
  assert.equal((await send([workout])).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM activities').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM notifications').get().n, 1);
  const response = await worker.fetch(new Request('https://example.test/report?at=2026-11-10T12:00:00Z', {headers:{Authorization:'Bearer admin-test'}}),env);
  const report = await response.json();
  assert.equal(report.results.Karolis.metres, 3200);
  assert.equal(report.settlement, null);
  assert.equal((await send([{...workout,distance_meters:4000}])).status, 200);
  assert.equal(db.prepare('SELECT metres FROM activities').get().metres, 4000);
  assert.match(db.prepare('SELECT text FROM notifications').get().text, /4 km/);
  assert.equal((await send([], [{id:workout.id,kind:'workout'}])).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM activities').get().n, 0);
  db.close();
});
