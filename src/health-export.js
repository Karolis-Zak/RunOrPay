// Parses the documented Health Auto Export v2 JSON structure. Actual device
// exports and the activity-source policy still need to be verified.
export function parseHealthExport(payload) {
  const workouts = payload?.data?.workouts;
  if (!Array.isArray(workouts)) throw new Error('Expected data.workouts array');
  const accepted = [], rejected = [];
  for (const workout of workouts) {
    if (workout?.name !== 'Running') continue;
    const id = workout.id;
    const match = typeof workout.start === 'string' && workout.start.match(/^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d) ([+-]\d\d)(\d\d)$/);
    const qty = workout.distance?.qty;
    const units = workout.distance?.units;
    const multiplier = {m:1, km:1000, mi:1609.344}[units];
    if (typeof id !== 'string' || !id || !match || typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0 || multiplier === undefined) {
      rejected.push({id: typeof id === 'string' ? id : null, reason:'Missing or unsupported workout data'});
      continue;
    }
    const startedAt = `${match[1]}T${match[2]}${match[3]}:${match[4]}`;
    if (!Number.isFinite(Date.parse(startedAt))) {
      rejected.push({id, reason:'Invalid workout timestamp'});
      continue;
    }
    accepted.push({id, startedAt, metres:Math.round(qty * multiplier)});
  }
  return {accepted, rejected};
}
