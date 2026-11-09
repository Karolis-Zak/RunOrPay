// This local prototype only displays records supplied by the user. It does not
// connect to Oracle and never substitutes example values for missing data.
const runners = [{name:'Karolis',goal:10000,number:'01'}, {name:'Lorenas',goal:5000,number:'02'}];
const $ = s => document.querySelector(s);
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km = metres => new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(metres/1000);
const dayShift = (value, days) => {const d=new Date(value+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10)};
const londonDay = value => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const fmtDate = iso => new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'short'}).format(new Date(iso+'T12:00:00Z'));
let weekStart, weekEnd, currentRows = null;
const validRows = rows => Array.isArray(rows) && !rows.some(r=>!r||!runners.some(x=>x.name===r.runner)||!Number.isSafeInteger(r.metres)||r.metres<0||r.metres>1000000||typeof r.started_at!=='string'||!Number.isFinite(Date.parse(r.started_at))||(r.moving_time!=null && (typeof r.moving_time!=='string'||!/^(?:\d{1,3}:\d{2}(?::\d{2})?|\d{1,5}s)$/.test(r.moving_time))));
function updateWeek() {
  const today = londonDay(new Date());
  const weekday = new Date(today+'T12:00:00Z').getUTCDay();
  weekStart = dayShift(today,-((weekday+6)%7));
  weekEnd = dayShift(weekStart,6);
  $('#week-range').textContent = `${fmtDate(weekStart)} — ${fmtDate(weekEnd)}`;
  $('#week-number').textContent = `${new Date(today+'T12:00:00Z').getUTCFullYear()}`;
}
function render(rows, loaded) {
  const valid = loaded ? rows.map((r)=>({runner:r.runner, day:londonDay(r.started_at), metres:r.metres, movingTime:r.moving_time})).sort((a,b)=>b.day.localeCompare(a.day)) : [];
  const week = valid.filter(r=>r.day>=weekStart && r.day<=weekEnd);
  const totals = runners.map(r=>({...r,metres:week.filter(x=>x.runner===r.name).reduce((sum,x)=>sum+x.metres,0)}));
  $('#runner-cards').innerHTML = totals.map((r,i)=>{const pct=loaded ? Math.round(r.metres/r.goal*100) : null, left=loaded?Math.max(0,r.goal-r.metres):null;return `<article class="runner-card ${i?'runner-two':'runner-one'}"><div class="card-top"><span class="card-index">ATHLETE / ${r.number}</span><span class="card-goal">WEEKLY GOAL <strong>${km(r.goal)} KM</strong></span></div><div class="runner-name"><span class="runner-avatar">${r.name[0]}</span><div><small>ON THE BOARD</small><h3>${r.name}</h3></div><span class="runner-arrow">↗</span></div><div class="metric"><strong>${loaded?km(r.metres):'—'}</strong><span> / ${km(r.goal)} <b>KM</b></span></div><div class="track" role="progressbar" aria-label="${r.name} weekly goal" aria-valuemin="0" aria-valuemax="100" ${loaded?`aria-valuenow="${Math.min(pct,100)}"`:'aria-valuetext="Data unavailable"'}><span style="width:${loaded?Math.min(pct,100):0}%"></span></div><div class="card-bottom"><span>${loaded?pct+'% COMPLETE':'AWAITING DATA'}</span><strong>${loaded?km(left)+' KM LEFT':'— KM LEFT'} <b>↗</b></strong></div></article>`}).join('');
  if (!loaded) $('#leaderboard').innerHTML='<div class="empty-leader"><span>↗</span><div><strong>Ready when you are.</strong><small>Standings appear when run data is connected.</small></div></div>';
  else {const ranked=[...totals].sort((a,b)=>b.metres/b.goal-a.metres/a.goal), tie=ranked[0].metres/ranked[0].goal===ranked[1].metres/ranked[1].goal; $('#leaderboard').innerHTML=ranked.map((r,i)=>`<div class="rank"><span class="rank-number">${tie?'—':String(i+1).padStart(2,'0')}</span><span class="rank-name"><strong>${r.name}</strong><small>${km(r.metres)} / ${km(r.goal)} km</small></span><strong class="rank-score">${Math.round(r.metres/r.goal*100)}<small>%</small></strong></div>`).join('');}
  const daily=Array.from({length:7},(_,i)=>week.filter(r=>r.day===dayShift(weekStart,i)).reduce((s,r)=>s+r.metres,0)); const max=Math.max(...daily,1);
  $('#week-chart').innerHTML=daily.map((n,i)=>`<div class="chart-day"><span class="chart-value">${loaded?km(n):'—'}</span><div class="bar-well"><span style="height:${loaded?Math.max(n/max*100,n?4:0):0}%"></span></div><small>${['M','T','W','T','F','S','S'][i]}</small></div>`).join('');
  $('#combined').innerHTML=`${loaded?km(daily.reduce((a,b)=>a+b,0)):'—'} <small>KM</small>`;
  $('#chart-note').textContent=loaded?'Recorded runs only':'Waiting for data';
  $('#run-rows').innerHTML=valid.slice(0,20).map(r=>`<tr><td><span class="table-initial">${escapeHtml(r.runner[0])}</span><strong>${escapeHtml(r.runner)}</strong></td><td>${escapeHtml(fmtDate(r.day))}</td><td><strong>${km(r.metres)} km</strong></td><td>${r.movingTime ? escapeHtml(r.movingTime) : 'Not available'}</td><td class="table-arrow">↗</td></tr>`).join('');
  $('#empty-state').hidden=loaded && valid.length>0; $('#activity-count').textContent=loaded?`${valid.length} RECORDED RUN${valid.length===1?'':'S'}`:'NO DATA LOADED';
  if(!valid.length){$('#empty-state strong').textContent=loaded?'No runs in this snapshot.':'Your runs will live here.';$('#empty-state span:last-child').textContent=loaded?'Only records saved by the bot are shown.':'Connect real recorded data to see your activity.';}
}
updateWeek();
render([],false);
setInterval(()=>{const previous=weekStart;updateWeek();if(previous!==weekStart)render(currentRows || [],currentRows !== null)},60000);
$('#data-file').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>2_000_000)throw Error('The file is too large.');const rows=JSON.parse(await file.text());if(!validRows(rows))throw Error('Expected a JSON array of recorded runs.');currentRows=rows;render(rows,true);$('#source-title').textContent='Recorded data loaded';$('#source-detail').textContent='Local snapshot only — not automatically updated.';$('#footer-source').textContent='LOCAL SNAPSHOT / NOT LIVE';$('#signal').classList.add('loaded')}catch(error){currentRows=null;render([],false);$('#source-title').textContent='Could not read the file';$('#source-detail').textContent=error.message;$('#footer-source').textContent='NO DATA CONNECTED';$('#signal').classList.remove('loaded');}finally{event.target.value=''}});

// This remains disabled until an approved HTTPS endpoint is configured. The
// access key is kept in memory only and is never placed in the URL or storage.
let endpoint = null, accessKey = '', refreshing = false;
try {
  const configured = typeof window !== 'undefined' ? window.RUN_OR_PAY_API_URL : '';
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/dashboard/runs' || url.search || url.hash) throw Error('Invalid dashboard endpoint');
    endpoint = url.href;
    $('#connect-form').hidden = false;
  }
} catch { $('#source-detail').textContent='Dashboard connection is not configured correctly.'; }

async function refreshLive() {
  if (!endpoint || !accessKey || refreshing) return;
  refreshing = true;
  try {
    const response = await fetch(endpoint,{headers:{Authorization:`Bearer ${accessKey}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
    if (response.status === 401) {accessKey='';throw Error('Access key not accepted.');}
    if (!response.ok) throw Error('Could not reach the dashboard data.');
    const body = await response.json();
    if (!validRows(body.runs) || body.truncated !== false) throw Error('Data is incomplete or invalid.');
    currentRows=body.runs; render(currentRows,true);
    $('#source-title').textContent='Connected';
    $('#source-detail').textContent='Refreshes every minute. Totals are runs recorded by the bot.';
    $('#footer-source').textContent='LIVE / RECORDED RUNS';
    $('#signal').classList.add('loaded');
  } catch(error) {
    currentRows=null;render([],false);
    $('#source-title').textContent='Connection unavailable';
    $('#source-detail').textContent=error.message;
    $('#footer-source').textContent='NO DATA CONNECTED';
    $('#signal').classList.remove('loaded');
  } finally {refreshing=false;}
}
if (endpoint) {
  $('#connect-form').addEventListener('submit',event=>{event.preventDefault();accessKey=$('#access-key').value;$('#access-key').value='';refreshLive();});
  setInterval(refreshLive,60000);
}
