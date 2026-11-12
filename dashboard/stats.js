import {summarise,formatKm,formatPace,formatSpeed,formatDuration,validRuns} from './stats-model.js?v=stats-2';

const $ = selector => document.querySelector(selector);
const keyName = 'run-or-pay.dashboard-key.v1';
let key='', inFlight=false, generation=0, retryAfter=0, lastStartedAt=0;
const store = {
  get() { try { return localStorage.getItem(keyName) || ''; } catch { return ''; } },
  set(value) { try { localStorage.setItem(keyName,value); return true; } catch { return false; } },
  clear() { try { localStorage.removeItem(keyName); } catch { /* Storage can be unavailable. */ } },
};
let remember = false;
let endpoint;
try {
  const url = new URL(window.RUN_OR_PAY_API_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/dashboard/runs' || url.search || url.hash) throw new Error('Invalid endpoint');
  endpoint = url.href;
} catch {
  $('#stats-status').textContent='The dashboard connection is not configured.';
}
const date = value => new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric'}).format(new Date(value));
const display = (value,format) => value == null ? '—' : format(value);
function compare(label,values,format,lowerIsBetter,explanation,rank=true) {
  const both=values.every(value=>value != null);
  // Don't claim a winner when both rounded display values are identical.
  const tie=both && format(values[0])===format(values[1]);
  const winner=rank && both && !tie ? (lowerIsBetter ? (values[0]<values[1]?0:1) : (values[0]>values[1]?0:1)) : -1;
  return `<article class="stats-card"><h3>${label}</h3><div class="stats-pair">${['Karolis','Lorenas'].map((name,i)=>`<div><span>${name}</span><strong>${display(values[i],format)}${winner===i?' · ahead':''}</strong></div>`).join('')}</div><small>${explanation}${tie?' · Equal at displayed precision.':''}</small></article>`;
}
function render(rows) {
  const data=summarise(rows);
  $('#comparison').innerHTML = [
    compare('Recorded distance',data.map(r=>r.count?r.metres:null),n=>`${formatKm(n)} km`,false,'All recorded runs'),
    compare('Longest recorded run',data.map(r=>r.longest?.metres ?? null),n=>`${formatKm(n)} km`,false,'One activity'),
    compare('Average moving pace',data.map(r=>r.secondsPerKm),n=>`≈ ${formatPace(n)}`,true,'Approximate whole-run average; timed runs only, including walking',false),
    compare('Recorded runs',data.map(r=>r.count),n=>String(n),false,'Only runs captured by the tracker'),
    compare('Average run distance',data.map(r=>r.averageRunMetres),n=>`${formatKm(n)} km`,false,'Recorded distance divided by recorded runs'),
    compare('Best recorded week',data.map(r=>r.bestWeek?.metres ?? null),n=>`${formatKm(n)} km`,false,'Each runner’s best Monday–Sunday total')
  ].join('');
  $('#runner-stats').innerHTML=data.map(r=>`<article class="stats-runner"><h3><span>${r.name[0]}</span>${r.name}</h3><dl><div><dt>Recorded runs</dt><dd>${r.count}</dd></div><div><dt>Days with a recorded run</dt><dd>${r.activeDays}</dd></div><div><dt>Recorded distance</dt><dd>${r.count?formatKm(r.metres)+' km':'—'}</dd></div><div><dt>Average run distance</dt><dd>${r.averageRunMetres==null?'—':formatKm(r.averageRunMetres)+' km'}</dd></div><div><dt>Longest run</dt><dd>${r.longest?formatKm(r.longest.metres)+' km · '+date(r.longest.started_at):'—'}</dd></div><div><dt>Best recorded week</dt><dd>${r.bestWeek?formatKm(r.bestWeek.metres)+' km · week of '+date(r.bestWeek.start+'T12:00:00Z'):'—'}</dd></div><div><dt>Total moving time</dt><dd>${r.timedCount?formatDuration(r.movingSeconds):'—'}</dd></div><div><dt>Longest moving time</dt><dd>${formatDuration(r.longestMovingSeconds)}</dd></div><div><dt>Average moving pace</dt><dd>${r.secondsPerKm==null?'—':'≈ '+formatPace(r.secondsPerKm)}</dd></div><div><dt>Average moving speed</dt><dd>${r.secondsPerKm==null?'—':'≈ '+formatSpeed(r.secondsPerKm)}</dd></div></dl><small>Moving time, pace and speed include ${r.timedCount} of ${r.count} recorded runs with usable distance and moving time.</small></article>`).join('');
}
function reset(message) {
  $('#comparison').innerHTML=''; $('#runner-stats').innerHTML='';
  $('#stats-status').textContent=message;
  $('#connection-label').textContent='Connect'; $('#connection-settings').classList.remove('connected'); $('#source-strip').hidden=false;
  $('#source-title').textContent='Not connected'; $('#source-detail').textContent=message;
  $('#connect-form').hidden=false; $('#disconnect').hidden=true; $('#retry').hidden=true;
  $('#connection-status').textContent=''; $('#signal').classList.remove('loaded');
  $('#footer-source').textContent='NOT CONNECTED';
}
async function refresh(force=false) {
  const now=Date.now();
  if (!endpoint || !key || inFlight || now<retryAfter || (!force && lastStartedAt && now-lastStartedAt<60000)) return;
  inFlight=true; lastStartedAt=now; const requestGeneration=generation;
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timeout=controller?setTimeout(()=>controller.abort(),15000):null;
  try {
    const response=await fetch(endpoint,{headers:{Authorization:`Bearer ${key}`},cache:'no-store',redirect:'error',...(controller?{signal:controller.signal}:{})});
    if(requestGeneration!==generation)return;
    if(response.status===401){key='';store.clear();throw new Error('Access key not accepted. Check it and try again.');}
    if(response.status===429){const value=response.headers.get('Retry-After');const seconds=Number(value);const dateMs=Date.parse(value);const delay=Number.isFinite(seconds)&&seconds>0?seconds*1000:Number.isFinite(dateMs)?Math.max(0,dateMs-Date.now()):60000;retryAfter=Date.now()+Math.max(1000,delay);throw new Error('Too many requests. Please try again later.');}
    if(!response.ok)throw new Error('Could not connect. Please try again.');
    const body=await response.json(); if(requestGeneration!==generation)return;
    if(!body||!validRuns(body.runs)||body.truncated!==false)throw new Error('Run data is incomplete. Stats are unavailable.');
    render(body.runs);
    const updated=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date());
    $('#stats-status').textContent=`${body.runs.length} recorded runs · Updated ${updated} London time · Complete history is not verified`;
    const saved=remember?store.set(key):false;
    $('#connection-status').textContent=remember&&!saved?'Connected · this browser cannot remember your sign-in':`Connected · updated ${updated}`;
    $('#connection-label').textContent='Connected'; $('#connection-settings').classList.add('connected'); $('#signal').classList.add('loaded');
    if (!$('#source-strip').hidden && !(remember&&!saved)) $('#connection-settings').open=false;
    $('#source-strip').hidden=true; $('#connect-form').hidden=true; $('#disconnect').hidden=false; $('#retry').hidden=true;
    $('#footer-source').textContent=`Updated ${updated} · London time`;
  } catch(error) {
    if(requestGeneration!==generation)return;
    $('#comparison').innerHTML=''; $('#runner-stats').innerHTML=''; $('#stats-status').textContent=error.message;
    $('#source-strip').hidden=false; $('#source-title').textContent='Connection unavailable'; $('#source-detail').textContent=error.message;
    $('#connection-label').textContent='Connection unavailable'; $('#connection-settings').classList.remove('connected'); $('#connection-status').textContent=''; $('#signal').classList.remove('loaded');
    $('#footer-source').textContent='NOT CONNECTED'; $('#retry').hidden=!key;
    if(!key){$('#connect-form').hidden=false;$('#disconnect').hidden=true;}
  } finally { if(timeout!==null)clearTimeout(timeout);inFlight=false;if(requestGeneration!==generation&&key)refresh(true); }
}
if(endpoint){
  $('#connect-form').hidden=false;
  $('#connect-form').addEventListener('submit',event=>{event.preventDefault();generation++;key=$('#access-key').value;remember=$('#remember-device').checked;store.clear();$('#access-key').value='';retryAfter=0;refresh(true);});
  $('#disconnect').addEventListener('click',()=>{generation++;key='';store.clear();reset('Sign in to see recorded stats.');});
  $('#retry').addEventListener('click',()=>{refresh(true);});
  key=store.get(); if(key){remember=true;refresh();}
  setInterval(()=>{if(document.visibilityState!=='hidden')refresh();},60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
}
