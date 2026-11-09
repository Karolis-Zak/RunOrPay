import puppeteer from 'puppeteer';
import {parseActivityDetails} from './strava-parse.js';
import {validateServiceUrl} from './service-url.js';

const {CHALLENGE_URL, KAROLIS_INGEST_SECRET, LORENAS_INGEST_SECRET, STRAVA_SESSION_PATH, STRAVA_LOGIN} = process.env;
if (!STRAVA_SESSION_PATH) throw new Error('Set STRAVA_SESSION_PATH to a private persistent directory');
if (!STRAVA_LOGIN && (!CHALLENGE_URL || !KAROLIS_INGEST_SECRET || !LORENAS_INGEST_SECRET)) throw new Error('Set CHALLENGE_URL and both participant ingest secrets');
if (CHALLENGE_URL) validateServiceUrl(CHALLENGE_URL);

const browser = await puppeteer.launch({headless:STRAVA_LOGIN !== '1', userDataDir:STRAVA_SESSION_PATH, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}), args:process.env.CHROMIUM_NO_SANDBOX === '1' ? ['--no-sandbox','--disable-setuid-sandbox'] : []});
const page = await browser.newPage();
if (STRAVA_LOGIN === '1') {
  await page.goto('https://www.strava.com/login', {waitUntil:'domcontentloaded'});
  console.log('Complete Strava login in the opened browser, then close it. Never share your session files.');
  await new Promise(resolve => browser.on('disconnected', resolve));
  process.exit(0);
}
const profiles = [
  {runner:'Karolis',url:'https://www.strava.com/athletes/129883494',secret:KAROLIS_INGEST_SECRET},
  {runner:'Lorenas',url:'https://www.strava.com/athletes/144185625',secret:LORENAS_INGEST_SECRET},
];
try {
  let failed = false;
  for (const profile of profiles) {
    try {
    await page.goto(profile.url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('[data-testid="activity-icon"]', {timeout:15000});
    const text = await page.$eval('body', el => el.innerText);
    if (/log in to see|sign in to see/i.test(text) || new URL(page.url()).pathname.startsWith('/login')) throw new Error(`${profile.runner}: Strava requires login or profile access`);
    const cards = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="activity-icon"]')).flatMap(icon => {
      let card = icon.parentElement;
      while (card && (card.querySelectorAll('[data-testid="activity-icon"]').length !== 1 || !card.querySelector('a[href*="/activities/"]'))) card = card.parentElement;
      const ids = [...(card?.querySelectorAll('a[href*="/activities/"]') || [])].map(link => link.getAttribute('href')?.match(/\/activities\/(\d+)/)?.[1]).filter(Boolean);
      const uniqueIds = [...new Set(ids)];
      const id = uniqueIds.length === 1 ? uniqueIds[0] : null;
      return [{id, type:icon.querySelector('title')?.textContent?.trim()}];
    }));
    if (!cards.length) throw new Error(`${profile.runner}: no recognizable activity cards; profile layout needs inspection`);
    let accepted = 0;
    for (const card of cards) {
      if (!/^(run|running|trail run|virtual run)$/i.test(card.type || '')) continue;
      if (!card.id) throw new Error(`${profile.runner}: a run could not be matched to one activity`);
      await page.goto(`https://www.strava.com/activities/${card.id}`, {waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForSelector('time', {timeout:15000});
      const details = await page.evaluate(() => ({title:document.title, date:document.querySelector('time')?.textContent?.trim(), text:document.body.innerText}));
      const parsed = parseActivityDetails(details);
      if (!parsed) throw new Error(`${profile.runner}: run details are incomplete or unavailable`);
      // Noon is an internal calendar-date anchor, not the actual start time.
      const activity = {id:card.id, startedAt:`${parsed.date}T12:00:00Z`, metres:parsed.metres, movingTime:parsed.movingTime};
      const response = await fetch(new URL(`/ingest/${profile.runner}`, CHALLENGE_URL), {method:'POST',headers:{Authorization:`Bearer ${profile.secret}`,'Content-Type':'application/json'},body:JSON.stringify(activity),signal:AbortSignal.timeout(15000),redirect:'error'});
      if (!response.ok) throw new Error(`${profile.runner}: intake returned HTTP ${response.status}`);
      accepted++;
    }
    console.log(`${profile.runner}: ${cards.length} candidate cards, ${accepted} accepted. Profile completeness is not verified.`);
    } catch (error) { failed = true; console.error(`${profile.runner}: check failed: ${error.message}`); }
  }
  if (failed) process.exitCode = 1;
} finally { await browser.close(); }
