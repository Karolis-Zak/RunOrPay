// The dashboard displays only validated records returned by the configured API.
const runners = [{name:'Karolis',goal:10000,number:'01'}, {name:'Lorenas',goal:5000,number:'02'}];
const $ = s => document.querySelector(s);
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km = metres => new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(metres/1000);
const percent = (metres,goal) => Math.round(metres / goal * 1000) / 10;
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
  const comparison = totals[0].metres * totals[1].goal - totals[1].metres * totals[0].goal;
  $('#weekly-summary').textContent = !loaded ? 'Progress towards each personal goal' : comparison === 0 ? 'Level on weekly goal progress' : `${comparison > 0 ? totals[0].name : totals[1].name} leads on weekly goal progress`;
  $('#runner-cards').innerHTML = totals.map((r,i)=>{const pct=loaded ? percent(r.metres,r.goal) : null, left=loaded?Math.max(0,r.goal-r.metres):null;return `<article class="runner-card ${i?'runner-two':'runner-one'}"><div class="card-top"><span class="card-index">ATHLETE / ${r.number}</span><span class="card-goal">WEEKLY GOAL <strong>${km(r.goal)} KM</strong></span></div><div class="runner-name"><span class="runner-avatar">${r.name[0]}</span><div><small>ON THE BOARD</small><h3>${r.name}</h3></div></div><div class="metric"><strong class="${loaded?'':'metric-empty'}">${loaded?km(r.metres):'Not connected'}</strong><span> / ${km(r.goal)} <b>KM</b></span></div><div class="track" role="progressbar" aria-label="${r.name} weekly goal" aria-valuemin="0" aria-valuemax="100" ${loaded?`aria-valuenow="${Math.min(pct,100)}"`:'aria-valuetext="Data unavailable"'}><span style="width:${loaded?Math.min(pct,100):0}%"></span></div><div class="card-bottom"><span>${loaded?pct+'% COMPLETE':'AWAITING DATA'}</span><strong>${loaded?km(left)+' KM LEFT':'— KM LEFT'}</strong></div></article>`}).join('');
  if (!loaded) $('#leaderboard').innerHTML='<div class="empty-leader"><div><strong>No data connected</strong><small>Connect above to see overall distance.</small></div></div>';
  else {const ranked=runners.map(r=>({...r,metres:valid.filter(x=>x.runner===r.name).reduce((sum,x)=>sum+x.metres,0)})).sort((a,b)=>b.metres-a.metres), tie=ranked[0].metres===ranked[1].metres; $('#leaderboard').innerHTML=ranked.map((r,i)=>`<div class="rank"><span class="rank-number">${tie?'—':String(i+1).padStart(2,'0')}</span><span class="rank-name"><strong>${r.name}</strong></span><strong class="rank-score">${km(r.metres)}<small> km</small></strong></div>`).join('');}
  const daily=Array.from({length:7},(_,i)=>{const date=dayShift(weekStart,i);return runners.map(r=>week.filter(x=>x.day===date && x.runner===r.name).reduce((sum,x)=>sum+x.metres,0));});
  const dailyTotals=daily.map(distances=>distances.reduce((sum,n)=>sum+n,0));
  const max=Math.max(...dailyTotals,1);
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  $('#week-chart').innerHTML=daily.map((distances,i)=>`<div class="chart-day" role="img" aria-label="${days[i]}: ${loaded?`Karolis ${km(distances[0])} kilometres, Lorenas ${km(distances[1])} kilometres`:'data unavailable'}"><span class="chart-value">${loaded?km(dailyTotals[i]):'—'}</span><div class="bar-well" aria-hidden="true"><span class="bar-karolis" style="height:${loaded?distances[0]/max*100:0}%"></span><span class="bar-lorenas" style="height:${loaded?distances[1]/max*100:0}%"></span></div><small aria-hidden="true">${days[i].slice(0,3)}</small></div>`).join('');
  $('#combined').innerHTML=`${loaded?km(dailyTotals.reduce((a,b)=>a+b,0)):'—'} <small>KM</small>`;
  $('#chart-note').textContent=loaded?'This week':'Waiting for data';
  $('#run-rows').innerHTML=valid.slice(0,20).map(r=>`<tr><td><span class="table-initial">${escapeHtml(r.runner[0])}</span><strong>${escapeHtml(r.runner)}</strong></td><td>${escapeHtml(fmtDate(r.day))}</td><td><strong>${km(r.metres)} km</strong></td><td>${r.movingTime ? escapeHtml(r.movingTime) : 'Not available'}</td></tr>`).join('');
  $('#empty-state').hidden=loaded && valid.length>0; $('#activity-count').textContent=loaded?`${valid.length} RECORDED RUN${valid.length===1?'':'S'}`:'NO DATA LOADED';
  if(!valid.length){$('#empty-state strong').textContent=loaded?'No runs recorded yet.':'Your runs will live here.';$('#empty-state span:last-child').textContent=loaded?'Only records saved by the bot are shown.':'Connect real recorded data to see your activity.';}
}
updateWeek();
render([],false);
setInterval(()=>{const previous=weekStart;updateWeek();if(previous!==weekStart)render(currentRows || [],currentRows !== null)},60000);

// A remembered key is accessible to scripts on this GitHub Pages origin, so
// it is only persisted after successful sign-in and can be removed by sign-out.
const storageKey = 'run-or-pay.dashboard-key.v1';
let endpoint = null, accessKey = '', refreshing = false, generation = 0, rememberAfterSuccess = false;
function storedKey() {try {return window.localStorage.getItem(storageKey) || ''} catch {return ''}}
function saveKey(value) {try {window.localStorage.setItem(storageKey,value); return true} catch {return false}}
function forgetKey() {try {window.localStorage.removeItem(storageKey)} catch { /* Storage may be disabled. */ }}
function disconnectedState(message) {
  currentRows=null;render([],false);
  $('#source-strip').hidden=false;
  $('#connection-label').textContent='Connect';
  $('#connection-status').textContent='';
  $('#source-title').textContent='Live data not connected';
  $('#source-detail').textContent=message;
  $('#footer-source').textContent='NO DATA CONNECTED';
  $('#signal').classList.remove('loaded');
  $('#connect-form').hidden=false;
  $('#disconnect').hidden=true;
  $('#retry').hidden=true;
}
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
  const requestGeneration = generation;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(),15000) : null;
  try {
    const response = await fetch(endpoint,{headers:{Authorization:`Bearer ${accessKey}`},cache:'no-store',redirect:'error',...(controller ? {signal:controller.signal} : {})});
    if (requestGeneration !== generation) return;
    if (response.status === 401) {accessKey='';forgetKey();throw Error('Access key not accepted.');}
    if (!response.ok) throw Error('Could not reach the dashboard data.');
    const body = await response.json();
    if (requestGeneration !== generation) return;
    if (!validRows(body.runs) || body.truncated !== false) throw Error('Data is incomplete or invalid.');
    if (currentRows === null || JSON.stringify(currentRows) !== JSON.stringify(body.runs)) {
      currentRows=body.runs;
      render(currentRows,true);
    }
    $('#source-title').textContent='Connected';
    $('#connection-label').textContent='Connected';
    $('#source-detail').textContent='Refreshes every minute. Totals are runs recorded by the bot.';
    const updated = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(new Date());
    $('#footer-source').textContent=`Updated ${updated} · London time`;
    $('#signal').classList.add('loaded');
    const saved = rememberAfterSuccess ? saveKey(accessKey) : false;
    $('#connection-status').textContent=rememberAfterSuccess && !saved ? 'Connected · this browser cannot remember your sign-in' : `Connected · updated ${updated} (London time)`;
    if (!$('#source-strip').hidden) $('#connection-settings').open=rememberAfterSuccess && !saved;
    $('#source-strip').hidden=true;
    $('#connect-form').hidden=true;
    $('#disconnect').hidden=false;
    $('#retry').hidden=true;
  } catch(error) {
    if (requestGeneration !== generation) return;
    currentRows=null;render([],false);
    $('#source-strip').hidden=false;
    $('#connection-label').textContent='Connection unavailable';
    $('#connection-status').textContent='';
    $('#source-title').textContent='Connection unavailable';
    $('#source-detail').textContent=error.message === 'Access key not accepted.' ? 'Access key not accepted. Check it and try again.' : error.message === 'Data is incomplete or invalid.' ? 'Run data is incomplete or invalid. Totals cannot be displayed safely.' : 'Could not update data. Check your connection; we will try again automatically.';
    $('#footer-source').textContent='NO DATA CONNECTED';
    $('#signal').classList.remove('loaded');
    $('#retry').hidden=!accessKey;
    if (!accessKey) {$('#connect-form').hidden=false;$('#disconnect').hidden=true;}
  } finally {if (timeout !== null) clearTimeout(timeout);refreshing=false;if(requestGeneration !== generation && accessKey) refreshLive();}
}
if (endpoint) {
  $('#connect-form').addEventListener('submit',event=>{event.preventDefault();generation++;accessKey=$('#access-key').value;rememberAfterSuccess=$('#remember-device').checked;forgetKey();$('#access-key').value='';refreshLive();});
  $('#retry').addEventListener('click',()=>{generation++;refreshLive();});
  $('#disconnect').addEventListener('click',()=>{generation++;accessKey='';forgetKey();disconnectedState('Sign in to see runs recorded by the bot.');});
  const remembered = storedKey();
  if (remembered) {accessKey=remembered;rememberAfterSuccess=true;$('#disconnect').hidden=false;refreshLive();}
  setInterval(refreshLive,60000);
}
