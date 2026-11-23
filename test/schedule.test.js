import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scheduledMessages} from '../src/schedule.js';

test('schedules week-start and generic reminders in London time', () => {
  assert.equal(scheduledMessages('2026-11-09T08:00:00Z')[0].id, 'week-start:2026-11-09');
  assert.equal(scheduledMessages('2026-11-13T17:00:00Z')[0].id, 'reminder:2026-11-13');
  assert.equal(scheduledMessages('2026-11-13T17:15:00Z').length, 0);
  assert.equal(scheduledMessages('2027-01-01T17:00:00Z').length, 0);
  assert.deepEqual(scheduledMessages('2026-11-23T12:00:00Z'), []);
  assert.deepEqual(scheduledMessages('2026-11-30T12:00:00Z'), []);
  assert.deepEqual(scheduledMessages('2027-01-01T12:00:00Z'), []);
  assert.deepEqual(scheduledMessages('2026-12-30T08:00:00Z'), [{id:'challenge-ending:2026-12-31',text:'Challenge ending: 31 December 2026.'}]);
  assert.deepEqual(scheduledMessages('2026-12-30T08:15:00Z'), []);
});

test('week-start messages rotate predictably without targets or money', () => {
  const first=scheduledMessages('2026-11-23T08:00:00Z')[0];
  const next=scheduledMessages('2026-11-30T08:00:00Z')[0];
  assert.match(first.text,/New week/);
  assert.match(next.text,/New week/);
  assert.notEqual(first.text,next.text);
  assert.doesNotMatch(first.text,/£|10 km|5 km/i);
  assert.deepEqual(scheduledMessages('2026-11-23T08:00:00Z')[0],first);
});
