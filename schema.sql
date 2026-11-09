CREATE TABLE IF NOT EXISTS activities (
  runner TEXT NOT NULL CHECK (runner IN ('Karolis', 'Lorenas')),
  source_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  metres INTEGER NOT NULL CHECK (metres >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (runner, source_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0
);
