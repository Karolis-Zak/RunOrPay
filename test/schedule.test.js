import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scheduledMessages} from '../src/schedule.js';

test('schedules week-start and generic reminders in London time', () => {
  assert.equal(scheduledMessages('2026-11-09T08:00:00Z')[0].id, 'week-start:2026-11-09');
  assert.equal(scheduledMessages('2026-11-13T17:00:00Z')[0].id, 'reminder:2026-11-13');
  assert.equal(scheduledMessages('2026-11-13T17:15:00Z').length, 0);
  assert.equal(scheduledMessages('2027-01-01T17:00:00Z').length, 0);
  assert.equal(scheduledMessages('2027-01-01T12:00:00Z')[0].id, 'result-pending:2026-12-28');
});
