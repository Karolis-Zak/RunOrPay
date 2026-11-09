import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHealthExport } from '../src/health-export.js';

test('parses documented workout export and converts units', () => {
  const parsed = parseHealthExport({data:{workouts:[
    {id:'one',name:'Running',start:'2026-11-10 10:30:00 +0000',distance:{qty:3.2,units:'km'}},
    {id:'two',name:'Running',start:'2026-11-11 10:30:00 +0000',distance:{qty:1,units:'mi'}},
    {id:'three',name:'Walking',start:'2026-11-11 10:30:00 +0000',distance:{qty:1,units:'km'}}
  ]}});
  assert.deepEqual(parsed.accepted.map(x => x.metres), [3200,1609]);
  assert.equal(parsed.accepted[0].startedAt, '2026-11-10T10:30:00+00:00');
});
test('rejects missing units and missing IDs without guessing', () => {
  const {accepted,rejected} = parseHealthExport({data:{workouts:[{name:'Running',start:'2026-11-10 10:30:00 +0000',distance:{qty:3}}]}});
  assert.equal(accepted.length, 0);
  assert.equal(rejected.length, 1);
  assert.throws(() => parseHealthExport({}), /workouts/);
});
