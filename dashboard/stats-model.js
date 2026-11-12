// Calculations use only complete, validated run-level records. Distances are
// rounded to the precision of the original source; missing durations stay null.
export const RUNNERS = ['Karolis', 'Lorenas'];

export function durationSeconds(value) {
  if (typeof value !== 'string') return null;
  if (/^\d{1,5}s$/.test(value)) return Number(value.slice(0, -1)) || null;
  if (!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const parts = value.split(':').map(Number);
  if (parts.at(-1) >= 60 || (parts.length === 3 && parts[1] >= 60)) return null;
  const seconds = parts.length === 3 ? parts[0]*3600 + parts[1]*60 + parts[2] : parts[0]*60 + parts[1];
  return seconds > 0 ? seconds : null;
}

export function validRuns(rows) {
  return Array.isArray(rows) && rows.every(row => row && RUNNERS.includes(row.runner)
    && Number.isSafeInteger(row.metres) && row.metres >= 0 && row.metres <= 1000000
    && typeof row.started_at === 'string' && Number.isFinite(Date.parse(row.started_at))
    && (row.moving_time == null || typeof row.moving_time === 'string'));
}

const dayFormatter = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'});
function londonDay(value) {
  const parts=Object.fromEntries(dayFormatter.formatToParts(new Date(value)).map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function mondayFor(day) {
  const date=new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
  return date.toISOString().slice(0,10);
}

export function summarise(rows) {
  if (!validRuns(rows)) throw new Error('Invalid run data');
  return RUNNERS.map(name => {
    const runs = rows.filter(row => row.runner === name);
    const timed = runs.map(row => ({row, seconds:durationSeconds(row.moving_time)}))
      .filter(item => item.row.metres > 0 && item.seconds !== null);
    const timedMetres = timed.reduce((sum,item) => sum + item.row.metres,0);
    const movingSeconds = timed.reduce((sum,item) => sum + item.seconds,0);
    const longest = runs.reduce((best,row) => !best || row.metres > best.metres ? row : best,null);
    const metres = runs.reduce((sum,row)=>sum+row.metres,0);
    const days = new Set();
    const weeks = new Map();
    for (const run of runs) {
      const day=londonDay(run.started_at), week=mondayFor(day);
      days.add(day);
      weeks.set(week,(weeks.get(week)||0)+run.metres);
    }
    const bestWeek = [...weeks.entries()].reduce((best,[week,distance])=>!best || distance>best.metres ? {start:week,metres:distance} : best,null);
    const longestMovingSeconds = timed.length ? Math.max(...timed.map(item=>item.seconds)) : null;
    return {name, count:runs.length, metres, averageRunMetres:runs.length ? metres/runs.length : null,
      activeDays:days.size, bestWeek, longestMovingSeconds,
      longest, timedCount:timed.length, timedMetres, movingSeconds,
      secondsPerKm:timedMetres && movingSeconds ? movingSeconds * 1000 / timedMetres : null};
  });
}

export function formatKm(metres) {
  return new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(metres/1000);
}
export function formatPace(secondsPerKm) {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm)) return '—';
  const seconds = Math.round(secondsPerKm);
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} /km`;
}
export function formatSpeed(secondsPerKm) {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '—';
  return `${new Intl.NumberFormat('en-GB',{maximumFractionDigits:1}).format(3600/secondsPerKm)} km/h`;
}

export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor(rounded % 3600 / 60);
  const remainder = rounded % 60;
  return hours ? `${hours}h ${minutes}m ${remainder}s` : minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}
