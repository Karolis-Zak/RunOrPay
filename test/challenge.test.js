import { test } from 'node:test';
import assert from 'node:assert/strict';
import { challengePeriod, londonDate } from '../src/challenge.js';
import { scoreWeek } from '../src/scoring.js';
import { outcomeMessage, progressMessage } from '../src/messages.js';
import { reportPeriod } from '../src/report.js';

test('challenge starts Monday and ends on Thursday with a short final period', () => {
  assert.equal(challengePeriod('2026-11-08T23:59:59Z'), null);
  assert.deepEqual(challengePeriod('2026-11-09T00:00:00Z'), {start:'2026-11-09',end:'2026-11-15'});
  assert.deepEqual(challengePeriod('2026-12-31T23:59:59Z'), {start:'2026-12-28',end:'2026-12-31'});
  assert.equal(challengePeriod('2027-01-01T00:00:00Z'), null);
});
test('dates use London time including British summer time', () => {
  assert.equal(londonDate('2027-06-06T23:30:00Z'), '2027-06-07');
});
test('messages describe remaining distance and never announce an unverified debt', () => {
  const scored = scoreWeek([{runner:'Karolis',id:'a',metres:3200}], {});
  assert.match(progressMessage('Karolis',3200,scored.results.Karolis), /Remaining: 6.8 km/);
  assert.doesNotMatch(progressMessage('Karolis',3200,scored.results.Karolis), /not yet verified/);
  assert.match(outcomeMessage(scored), /pending/);
});
test('report includes only runs from the chosen challenge week', () => {
  const report = reportPeriod('2026-11-15T12:00:00Z', [
    {runner:'Karolis',id:'1',metres:1000,startedAt:'2026-11-15T23:59:00Z'},
    {runner:'Karolis',id:'2',metres:2000,startedAt:'2026-11-16T00:00:00Z'},
  ]);
  assert.equal(report.results.Karolis.metres, 1000);
  assert.equal(report.settlement, null);
});
