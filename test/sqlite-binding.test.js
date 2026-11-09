import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/sqlite-binding.js';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('SQLite adapter supports bound and unbound operations', async () => {
  const db = openDatabase(':memory:');
  await db.prepare('INSERT INTO activities (runner, source_id, started_at, metres, updated_at) VALUES (?, ?, ?, ?, ?)').bind('Karolis','test','2026-11-09T10:00:00Z',1000,'2026-11-09T11:00:00Z').run();
  assert.equal((await db.prepare('SELECT metres FROM activities WHERE source_id=?').bind('test').first()).metres, 1000);
  assert.equal((await db.prepare('SELECT * FROM activities').all()).results.length, 1);
  db.close();
});

test('existing activity database is migrated without losing records', async () => {
  const directory = mkdtempSync(join(tmpdir(),'run-or-pay-migration-'));
  const path = join(directory,'challenge.sqlite');
  const legacy = new DatabaseSync(path);
  legacy.exec("CREATE TABLE activities (runner TEXT NOT NULL, source_id TEXT NOT NULL, started_at TEXT NOT NULL, metres INTEGER NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (runner,source_id)); INSERT INTO activities VALUES ('Karolis','1','2026-11-09T12:00:00Z',30,'2026-11-09T12:00:00Z');");
  legacy.close();
  try {
    const db = openDatabase(path);
    const row = await db.prepare('SELECT metres,moving_time FROM activities WHERE source_id=?').bind('1').first();
    assert.equal(row.metres,30);
    assert.equal(row.moving_time,null);
    db.close();
    const reopened = openDatabase(path);
    assert.equal((await reopened.prepare('SELECT COUNT(*) AS n FROM activities').first()).n,1);
    reopened.close();
  } finally {rmSync(directory,{recursive:true,force:true});}
});
