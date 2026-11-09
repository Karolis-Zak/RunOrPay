import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchRunDistances} from '../src/android-distance.js';

const run = {uuid:'run',source:'com.strava',name:'running',start_time:'2026-11-10T10:00:00Z',end_time:'2026-11-10T10:30:00Z'};
const distance = {uuid:'distance',source:'com.strava',start_time:'2026-11-10T10:00:00Z',end_time:'2026-11-10T10:30:00Z',meters:3200};
test('matches distance within an explicit running session', () => {
  assert.equal(matchRunDistances([run],[distance])[0].metres,3200);
});
test('missing, overlapping or ambiguous distance is not scored', () => {
  assert.equal(matchRunDistances([run],[])[0].status,'unverified');
  assert.equal(matchRunDistances([run],[distance,distance])[0].status,'unverified');
  assert.equal(matchRunDistances([run,{...run,uuid:'other'}],[distance])[0].status,'unverified');
});
