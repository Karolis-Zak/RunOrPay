import { challengePeriod } from './challenge.js';
import { progressMessage } from './messages.js';
import { reportPeriod } from './report.js';
import { scheduledMessages } from './schedule.js';
import { parseHealthExport } from './health-export.js';
import { parseHealthSync } from './healthsync.js';

const json = (value, status = 200) => Response.json(value, {status, headers:{'Cache-Control':'no-store'}});
const keys = {Karolis:'KAROLIS_INGEST_SECRET', Lorenas:'LORENAS_INGEST_SECRET'};

async function authorized(request, secret) {
  if (!secret) return false;
  const token = request.headers.get('Authorization');
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([token || '', `Bearer ${secret}`].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  return crypto.subtle.timingSafeEqual(actual, expected);
}

async function readActivities(env) {
  const {results} = await env.DB.prepare('SELECT runner, source_id AS id, started_at AS startedAt, metres FROM activities').all();
  return results;
}

async function saveActivity(env, runner, body) {
  const existing = await env.DB.prepare('SELECT started_at, metres FROM activities WHERE runner=? AND source_id=?').bind(runner, body.id).first();
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT INTO activities (runner, source_id, started_at, metres, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(runner, source_id) DO UPDATE SET started_at=excluded.started_at, metres=excluded.metres, updated_at=excluded.updated_at').bind(runner, body.id, body.startedAt, body.metres, now).run();
  const changed = !existing || existing.metres !== body.metres || existing.started_at !== body.startedAt;
  if (existing && changed) await env.DB.prepare('DELETE FROM notifications WHERE id=? AND sent_at IS NULL').bind(`activity:${runner}:${body.id}`).run();
  // Recreate a missing outbox entry after an interrupted write. Existing sent
  // and claimed entries remain protected by the notification primary key.
  {
    const report = reportPeriod(body.startedAt, await readActivities(env));
    await env.DB.prepare('INSERT OR IGNORE INTO notifications (id,text,created_at) VALUES (?,?,?)').bind(`activity:${runner}:${body.id}`, progressMessage(runner, body.metres, report.results[runner], body.movingTime, body.startedAt), now).run();
  }
  return changed;
}

async function ingest(request, env, runner) {
  if (!await authorized(request, env[keys[runner]])) return json({error:'Unauthorized'}, 401);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({error:'Expected JSON'}, 415);
  if (Number(request.headers.get('content-length') || 0) > 16384) return json({error:'Payload too large'}, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 16384) return json({error:'Payload too large'}, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({error:'Invalid JSON'}, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({error:'Invalid normalized activity'}, 400);
  if (body.movingTime !== undefined && (typeof body.movingTime !== 'string' || !/^(?:\d{1,3}:\d{2}(?::\d{2})?|\d{1,5}s)$/.test(body.movingTime))) return json({error:'Invalid moving time'}, 400);
  if (typeof body.id !== 'string' || body.id.length < 1 || body.id.length > 200 || !Number.isSafeInteger(body.metres) || body.metres < 0 || body.metres > 1000000 || typeof body.startedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(body.startedAt) || !Number.isFinite(Date.parse(body.startedAt))) return json({error:'Invalid normalized activity'}, 400);
  if (!challengePeriod(body.startedAt)) return json({error:'Activity outside challenge'}, 400);
  return json({ok:true, changed:await saveActivity(env, runner, body)});
}

async function healthExport(request, env) {
  if (!await authorized(request, env.KAROLIS_INGEST_SECRET)) return json({error:'Unauthorized'}, 401);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({error:'Expected JSON'}, 415);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 131072) return json({error:'Payload too large; use batching'}, 413);
  let parsed;
  try { parsed = parseHealthExport(JSON.parse(raw)); } catch { return json({error:'Invalid workout export'}, 400); }
  if (parsed.rejected.length) return json({error:'Some running workouts need review', rejected:parsed.rejected.length}, 422);
  if (parsed.accepted.some(activity => activity.id.length > 200 || activity.metres > 1000000)) return json({error:'Invalid workout'}, 400);
  let saved = 0;
  for (const activity of parsed.accepted) {
    if (!challengePeriod(activity.startedAt)) continue;
    await saveActivity(env, 'Karolis', activity);
    saved++;
  }
  return json({ok:true, received:saved});
}

async function healthSync(request, env) {
  if (!await authorized(request, env.KAROLIS_INGEST_SECRET)) return json({error:'Unauthorized'}, 401);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 131072) return json({error:'Payload too large'}, 413);
  let batch;
  try { batch = parseHealthSync(JSON.parse(raw)); } catch { return json({error:'Invalid or incomplete batch'}, 400); }
  let received = 0;
  for (const activity of batch.activities) {
    if (!challengePeriod(activity.startedAt)) continue;
    await saveActivity(env, 'Karolis', activity);
    received++;
  }
  for (const id of batch.deleted) {
    await env.DB.prepare('DELETE FROM activities WHERE runner=? AND source_id=?').bind('Karolis', id).run();
    await env.DB.prepare('DELETE FROM notifications WHERE id=? AND sent_at IS NULL').bind(`activity:Karolis:${id}`).run();
  }
  return json({ok:true,received,duplicates:0,deleted:batch.deleted.length});
}

async function handle(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/health' && request.method === 'GET') return json({ok:true});
  if (url.pathname === '/api/apple-health/sync' && request.method === 'POST') return healthSync(request, env);
  if (url.pathname === '/health-export/karolis' && request.method === 'POST') return healthExport(request, env);
  const match = url.pathname.match(/^\/ingest\/(Karolis|Lorenas)$/);
  if (match && request.method === 'POST') return ingest(request, env, match[1]);
  if (match && request.method === 'DELETE') {
    if (!await authorized(request, env[keys[match[1]]])) return json({error:'Unauthorized'}, 401);
    const id = url.searchParams.get('id');
    if (!id || id.length > 200) return json({error:'Activity id required'}, 400);
    await env.DB.prepare('DELETE FROM activities WHERE runner=? AND source_id=?').bind(match[1], id).run();
    await env.DB.prepare('DELETE FROM notifications WHERE id=? AND sent_at IS NULL').bind(`activity:${match[1]}:${id}`).run();
    return json({ok:true});
  }
  if (!await authorized(request, env.ADMIN_SECRET)) return json({error:'Unauthorized'}, 401);
  if (url.pathname === '/report' && request.method === 'GET') {
    const at = url.searchParams.get('at');
    if (!at || !/^\d{4}-\d{2}-\d{2}T/.test(at) || !Number.isFinite(Date.parse(at)) || !challengePeriod(at)) return json({error:'Provide an ISO timestamp within the challenge as at'}, 400);
    return json(reportPeriod(at, await readActivities(env)));
  }
  if (url.pathname === '/notifications' && request.method === 'GET') {
    const pending = url.searchParams.get('pending') === '1';
    const sql = pending ? 'SELECT id, text, created_at, sent_at, attempts FROM notifications WHERE sent_at IS NULL AND attempts=0 ORDER BY created_at ASC LIMIT 100' : 'SELECT id, text, created_at, sent_at, attempts FROM notifications ORDER BY created_at DESC LIMIT 100';
    const {results} = await env.DB.prepare(sql).all();
    return json({notifications:results});
  }
  if (url.pathname === '/notifications/claim' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({error:'Invalid JSON'}, 400); }
    if (typeof body?.id !== 'string' || !body.id || body.id.length > 300 || typeof body.text !== 'string' || body.text.length > 10000) return json({error:'Notification id and text required'}, 400);
    const result = await env.DB.prepare('UPDATE notifications SET attempts=1 WHERE id=? AND text=? AND sent_at IS NULL AND attempts=0').bind(body.id, body.text).run();
    if ((result.meta?.changes ?? result.changes) !== 1) return json({error:'Notification unavailable or changed'}, 409);
    return json({ok:true});
  }
  if (url.pathname === '/notifications/ack' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({error:'Invalid JSON'}, 400); }
    if (typeof body?.id !== 'string' || !body.id || body.id.length > 300 || typeof body.text !== 'string' || body.text.length > 10000) return json({error:'Notification id and text required'}, 400);
    const result = await env.DB.prepare('UPDATE notifications SET sent_at=COALESCE(sent_at, ?) WHERE id=? AND text=? AND attempts=1').bind(new Date().toISOString(), body.id, body.text).run();
    const changes = result.meta?.changes ?? result.changes;
    if (changes !== 1) return json({error:'Notification changed or was removed'}, 409);
    return json({ok:true});
  }
  return json({error:'Not found'}, 404);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch { return json({error:'Unable to process request'}, 500); }
  },
  async scheduled(event, env) {
    // A heartbeat can be observed without claiming that phone data was synced.
    const now = new Date(event.scheduledTime);
    for (const {id,text} of scheduledMessages(now)) {
      await env.DB.prepare('INSERT OR IGNORE INTO notifications (id,text,created_at) VALUES (?,?,?)').bind(id, text, now.toISOString()).run();
    }
  }
};
