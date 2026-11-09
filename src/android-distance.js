// Experimental: map a Health Connect run to distance samples only when their
// source and complete time interval unambiguously belong to exactly one run.
// Payload batches can be incremental, so callers must first retain and reconcile
// records across batches. This function never treats absence of data as zero.
export function matchRunDistances(exercises, distances) {
  if (!Array.isArray(exercises) || !Array.isArray(distances)) throw new Error('Expected record arrays');
  const runs = exercises.filter(x => x?.name === 'running' || x?.type === '56');
  const output = [];
  for (const run of runs) {
    const start = Date.parse(run.start_time), end = Date.parse(run.end_time);
    if (!run.uuid || !run.source || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) { output.push({id:run.uuid || null,status:'unverified'}); continue; }
    let ambiguous = false;
    const eligible = distances.filter(d => {
      const a = Date.parse(d.start_time), b = Date.parse(d.end_time);
      if (d.source !== run.source || !Number.isFinite(a) || !Number.isFinite(b) || b <= a || a >= end || b <= start) return false;
      if (a < start || b > end || !d.uuid || typeof d.meters !== 'number' || !Number.isFinite(d.meters) || d.meters < 0) { ambiguous = true; return false; }
      if (runs.some(other => other !== run && other.source === run.source && Date.parse(other.start_time) < b && Date.parse(other.end_time) > a)) { ambiguous = true; return false; }
      return true;
    });
    const sorted = eligible.sort((a,b) => Date.parse(a.start_time)-Date.parse(b.start_time));
    for (let i=1; i<sorted.length; i++) if (Date.parse(sorted[i].start_time) < Date.parse(sorted[i-1].end_time)) ambiguous = true;
    if (new Set(sorted.map(x => x.uuid)).size !== sorted.length) ambiguous = true;
    if (ambiguous || !sorted.length) output.push({id:run.uuid,status:'unverified'});
    else output.push({id:run.uuid,startedAt:run.start_time,metres:Math.round(sorted.reduce((n,d) => n+d.meters,0)),status:'provisional'});
  }
  return output;
}
