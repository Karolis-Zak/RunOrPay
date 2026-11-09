import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {openDatabase} from './sqlite-binding.js';
import worker from './worker.js';

const {ADMIN_SECRET, KAROLIS_INGEST_SECRET, LORENAS_INGEST_SECRET} = process.env;
if (![ADMIN_SECRET, KAROLIS_INGEST_SECRET, LORENAS_INGEST_SECRET].every(x => typeof x === 'string' && x.length >= 32)) throw new Error('Three distinct secrets of at least 32 characters are required');
if (new Set([ADMIN_SECRET, KAROLIS_INGEST_SECRET, LORENAS_INGEST_SECRET]).size !== 3) throw new Error('Secrets must be distinct');
crypto.subtle.timingSafeEqual = (a,b) => timingSafeEqual(Buffer.from(a),Buffer.from(b));
const DB = openDatabase(process.env.DB_PATH || './run-or-pay.sqlite');
const env = {DB, ADMIN_SECRET, KAROLIS_INGEST_SECRET, LORENAS_INGEST_SECRET};
const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');

const server = createServer(async (req,res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 131072) { res.writeHead(413); res.end(); return; }
      chunks.push(chunk);
    }
    const method = req.method || 'GET';
    const body = ['GET','HEAD'].includes(method) ? undefined : Buffer.concat(chunks);
    const input = new Request(`http://localhost${req.url}`, {method, headers:req.headers, body});
    const result = await worker.fetch(input,env);
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Challenge service listening on 127.0.0.1:${port}`));

// Run the same 15-minute schedule as the Worker using UTC instants.
let timer;
function scheduleNext() {
  const next = Math.floor(Date.now() / 900000 + 1) * 900000;
  timer = setTimeout(async () => {
    try { await worker.scheduled({scheduledTime:next},env); }
    catch (error) { console.error('Scheduled task failed:', error.message); }
    scheduleNext();
  }, Math.max(0,next-Date.now()));
}
scheduleNext();
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => {
  clearTimeout(timer);
  server.close(() => {DB.close(); process.exit(0);});
});
