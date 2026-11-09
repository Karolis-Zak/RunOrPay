// HealthSync schema v2: only explicit Strava running workouts are accepted.
export function parseHealthSync(payload) {
  if (!payload || payload.schema_version !== 2 || !Array.isArray(payload.workouts) || !Array.isArray(payload.deletions)) throw new Error('Invalid HealthSync v2 batch');
  const activities = [], deleted = [];
  for (const item of payload.workouts) {
    if (item?.activity_type !== 'running') continue;
    if (typeof item.source_name !== 'string' || !/strava/i.test(item.source_name)) continue;
    if (typeof item.id !== 'string' || !item.id.startsWith('healthkit:') || item.id.length > 200 || typeof item.start_at !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(item.start_at) || !Number.isFinite(Date.parse(item.start_at)) || typeof item.distance_meters !== 'number' || !Number.isFinite(item.distance_meters) || item.distance_meters < 0 || item.distance_meters > 1000000) throw new Error('Incomplete running workout');
    activities.push({id:item.id,startedAt:item.start_at,metres:Math.round(item.distance_meters)});
  }
  for (const item of payload.deletions) {
    if (item?.kind !== 'workout') continue;
    if (typeof item.id !== 'string' || !item.id.startsWith('healthkit:') || item.id.length > 200) throw new Error('Invalid deletion');
    deleted.push(item.id);
  }
  return {activities, deleted};
}
