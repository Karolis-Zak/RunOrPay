import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHealthSync} from '../src/healthsync.js';

test('normalizes Strava runs and deletion records without importing other sources', () => {
  const data = parseHealthSync({schema_version:2,workouts:[
    {id:'healthkit:one',activity_type:'running',source_name:'Strava',start_at:'2026-11-09T15:00:00Z',distance_meters:3200.3},
    {id:'healthkit:two',activity_type:'running',source_name:'Nike Run Club',start_at:'2026-11-09T15:00:00Z',distance_meters:3000}
  ], deletions:[{id:'healthkit:three',kind:'workout'}]});
  assert.deepEqual(data.activities, [{id:'healthkit:one',startedAt:'2026-11-09T15:00:00Z',metres:3200}]);
  assert.deepEqual(data.deleted,['healthkit:three']);
});
test('fails closed on a Strava run with missing distance', () => {
  assert.throws(() => parseHealthSync({schema_version:2,workouts:[{id:'healthkit:a',activity_type:'running',source_name:'Strava',start_at:'2026-11-09T15:00:00Z'}],deletions:[]}), /Incomplete/);
});
