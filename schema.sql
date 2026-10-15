-- Lead intake for every Strongpoint property. One table, one endpoint.
CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_ms INTEGER NOT NULL,        -- epoch ms, for the rate-limit window
  created_at TEXT    NOT NULL,        -- ISO 8601, for reading by eye
  source     TEXT    NOT NULL,        -- which site produced it
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  org        TEXT,
  place      TEXT,                    -- "where" is a reserved word in SQL
  need       TEXT    NOT NULL,
  msg        TEXT    NOT NULL,
  ip         TEXT,
  ua         TEXT
);
CREATE INDEX IF NOT EXISTS leads_created ON leads (created_ms DESC);
CREATE INDEX IF NOT EXISTS leads_ip_time ON leads (ip, created_ms);
