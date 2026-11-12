import {test} from 'node:test';
import assert from 'node:assert/strict';
import {durationSeconds,summarise,formatPace,formatSpeed} from '../dashboard/stats-model.js';

test('duration parsing handles seconds, minutes and hours and rejects invalid values',()=>{
  assert.equal(durationSeconds('41s'),41); assert.equal(durationSeconds('10:01'),601);
  assert.equal(durationSeconds('1:02:03'),3723); assert.equal(durationSeconds('2:99'),null);
  assert.equal(durationSeconds('0s'),null); assert.equal(durationSeconds(null),null);
});

test('averages use total time divided by total distance, excluding missing durations',()=>{
  const rows=[{runner:'Karolis',metres:1000,started_at:'2026-11-09T12:00:00Z',moving_time:'10:00'},
    {runner:'Karolis',metres:9000,started_at:'2026-11-10T12:00:00Z',moving_time:'45:00'},
    {runner:'Karolis',metres:3000,started_at:'2026-11-11T12:00:00Z',moving_time:null}];
  const [k,l]=summarise(rows); assert.equal(k.metres,13000); assert.equal(k.longest.metres,9000);
  assert.equal(k.count,3); assert.equal(k.timedCount,2); assert.equal(formatPace(k.secondsPerKm),'5:30 /km');
  assert.equal(formatSpeed(k.secondsPerKm),'10.9 km/h');
  assert.equal(k.averageRunMetres,13000/3); assert.equal(k.activeDays,3);
  assert.equal(k.longestMovingSeconds,2700); assert.deepEqual(k.bestWeek,{start:'2026-11-09',metres:13000});
  assert.equal(l.secondsPerKm,null); assert.equal(l.longest,null);
});

test('best weeks and active days use London calendar boundaries',()=>{
  const rows=[{runner:'Karolis',metres:1000,started_at:'2026-05-31T22:30:00Z'},
    {runner:'Karolis',metres:2000,started_at:'2026-05-31T23:30:00Z'},
    {runner:'Karolis',metres:3000,started_at:'2026-06-01T10:00:00Z'}];
  const [k]=summarise(rows);
  assert.equal(k.activeDays,2);
  assert.deepEqual(k.bestWeek,{start:'2026-06-01',metres:5000});
});

test('invalid runners, distances, and dates are not reported as valid stats',()=>{
  assert.throws(()=>summarise([{runner:'Other',metres:1,started_at:'2026-11-09'}]));
  assert.throws(()=>summarise([{runner:'Karolis',metres:-1,started_at:'2026-11-09'}]));
  assert.throws(()=>summarise([{runner:'Karolis',metres:1,started_at:'bad'}]));
});
