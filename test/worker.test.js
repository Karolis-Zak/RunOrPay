import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timingSafeEqual} from 'node:crypto';
import worker from '../src/worker.js';

// Cloudflare provides this Web Crypto extension; emulate it for Node tests.
crypto.subtle.timingSafeEqual = (a,b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));
const env = {ADMIN_SECRET:'admin-test', KAROLIS_INGEST_SECRET:'karolis-test'};

test('public health endpoint and protected endpoints', async () => {
  assert.equal((await worker.fetch(new Request('https://example.test/health'), env)).status, 200);
  assert.equal((await worker.fetch(new Request('https://example.test/report'), env)).status, 401);
  assert.equal((await worker.fetch(new Request('https://example.test/ingest/Karolis', {method:'POST'}), env)).status, 401);
});
test('authenticated intake rejects invalid and non-JSON bodies before touching database', async () => {
  const headers = {'Authorization':'Bearer karolis-test', 'Content-Type':'application/json'};
  const bad = await worker.fetch(new Request('https://example.test/ingest/Karolis', {method:'POST',headers,body:'{"id":"x","metres":-1}'}), env);
  assert.equal(bad.status, 400);
  const malformed = await worker.fetch(new Request('https://example.test/ingest/Karolis', {method:'POST',headers,body:'{'}), env);
  assert.equal(malformed.status, 400);
});

test('health export validates the whole batch before writing any workouts', async () => {
  let touched = false;
  const database = {prepare() { touched = true; throw new Error('Unexpected database write'); }};
  const workout = {name:'Running', id:'valid', start:'2026-11-09 12:00:00 +0000', distance:{qty:5, units:'km'}};
  const response = await worker.fetch(new Request('https://example.test/health-export/karolis', {
    method:'POST', headers:{Authorization:'Bearer karolis-test', 'Content-Type':'application/json'},
    body:JSON.stringify({data:{workouts:[workout, {...workout, id:'x'.repeat(201)}]}}),
  }), {...env, DB:database});
  assert.equal(response.status, 400);
  assert.equal(touched, false);
});
