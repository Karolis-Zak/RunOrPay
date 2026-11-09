import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

// Small D1-compatible adapter for the statements used by this project.
export function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const columns = db.prepare('PRAGMA table_info(activities)').all();
  if (!columns.some(column => column.name === 'moving_time')) db.exec('ALTER TABLE activities ADD COLUMN moving_time TEXT');
  return {
    prepare(sql) {
      function bind(...args) {
        return {
          async first() { return db.prepare(sql).get(...args) || null; },
          async all() { return {results:db.prepare(sql).all(...args)}; },
          async run() { return db.prepare(sql).run(...args); },
        };
      }
      return {bind, all:() => bind().all(), first:() => bind().first(), run:() => bind().run()};
    },
    close() { db.close(); },
  };
}
