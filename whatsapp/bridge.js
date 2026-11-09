import whatsapp from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import {validateServiceUrl} from './service-url.js';
import {sendWithAck} from './delivery.js';

const { Client, LocalAuth } = whatsapp;
const { CHALLENGE_URL, ADMIN_SECRET, WHATSAPP_GROUP_ID, LIST_GROUPS } = process.env;
if (!LIST_GROUPS && (!CHALLENGE_URL || !ADMIN_SECRET || !WHATSAPP_GROUP_ID)) {
  console.error('Set CHALLENGE_URL, ADMIN_SECRET and WHATSAPP_GROUP_ID, or LIST_GROUPS=1 to find the group.');
  process.exit(1);
}
if (CHALLENGE_URL) validateServiceUrl(CHALLENGE_URL);

const client = new Client({authStrategy:new LocalAuth({dataPath:process.env.WHATSAPP_SESSION_PATH || './.whatsapp-session'}), puppeteer:{headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}), args:process.env.CHROMIUM_NO_SANDBOX === '1' ? ['--no-sandbox','--disable-setuid-sandbox'] : []}});
let timer;
client.on('qr', qr => { console.log('Scan this QR code in WhatsApp > Linked devices:'); qrcode.generate(qr, {small:true}); });
client.on('auth_failure', () => console.error('WhatsApp authentication failed; relinking may be required.'));
client.on('disconnected', reason => { clearInterval(timer); console.error('WhatsApp disconnected:', reason); process.exitCode = 1; });
client.once('ready', async () => {
  if (LIST_GROUPS) {
    // WhatsApp Web changes sometimes break getChats for one unrelated chat.
    // Read only group names and IDs; never enumerate message contents.
    const groups = await client.pupPage.evaluate(() => {
      const chats = window.require('WAWebCollections').Chat.getModelsArray();
      return chats.flatMap(chat => {
        const id = chat.id?._serialized ?? chat.id?.$1;
        if (typeof id !== 'string' || !id.endsWith('@g.us')) return [];
        return [{id, name:String(chat.formattedTitle || chat.name || 'Unnamed group')}];
      });
    });
    for (const group of groups) console.log(`${group.name}: ${group.id}`);
    if (!groups.length) console.log('No groups were found. The WhatsApp Web format may have changed.');
    await client.destroy();
    return;
  }
  if (!/^[0-9-]+@g\.us$/.test(WHATSAPP_GROUP_ID)) throw new Error('Target must be a WhatsApp group');
  console.log('Connected to configured WhatsApp group; starting queue polling.');
  let busy = false;
  let paused = false;
  async function poll() {
    if (busy || paused) return;
    busy = true;
    try {
      const headers = {Authorization:`Bearer ${ADMIN_SECRET}`};
      const response = await fetch(new URL('/notifications?pending=1', CHALLENGE_URL), {headers, signal:AbortSignal.timeout(15000),redirect:'error'});
      if (!response.ok) throw new Error(`Queue returned HTTP ${response.status}`);
      const {notifications} = await response.json();
      for (const item of notifications) {
        const claim = await fetch(new URL('/notifications/claim', CHALLENGE_URL), {method:'POST', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({id:item.id,text:item.text}), signal:AbortSignal.timeout(15000),redirect:'error'});
        if (claim.status === 409) continue;
        if (!claim.ok) throw new Error(`Claim returned HTTP ${claim.status}; no message was sent`);
        await sendWithAck(client, WHATSAPP_GROUP_ID, item.text);
        const ack = await fetch(new URL('/notifications/ack', CHALLENGE_URL), {method:'POST', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({id:item.id,text:item.text}), signal:AbortSignal.timeout(15000),redirect:'error'});
        if (!ack.ok) throw new Error(`Acknowledgement returned HTTP ${ack.status}; delivery needs manual review`);
      }
    } catch (error) { paused = true; console.error('Delivery paused; check the WhatsApp group and queue before restarting:', error.message); }
    finally { busy = false; }
  }
  await poll();
  timer = setInterval(poll, 60000);
});
await client.initialize();
