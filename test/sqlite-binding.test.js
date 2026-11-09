import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/sqlite-binding.js';

test('SQLite adapter supports bound and unbound operations', async () => {
  const db = openDatabase(':memory:');
  await db.prepare('INSERT INTO activities VALUES (?, ?, ?, ?, ?)').bind('Karolis','test','2026-11-09T10:00:00Z',1000,'2026-11-09T11:00:00Z').run();
  assert.equal((await db.prepare('SELECT metres FROM activities WHERE source_id=?').bind('test').first()).metres, 1000);
  assert.equal((await db.prepare('SELECT * FROM activities').all()).results.length, 1);
  db.close();
});
