import pg from 'pg';
const { Pool, types } = pg;
// Return DATE columns as plain strings (avoids local-midnight UTC shift on UTC+3)
types.setTypeParser(1082, v => v);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bb_calendar:changeme@127.0.0.1:5432/bb_calendar',
});

const SCHEMA = `
CREATE SEQUENCE IF NOT EXISTS admin_event_seq START 1;

CREATE TABLE IF NOT EXISTS events (
  id             TEXT PRIMARY KEY DEFAULT ('adm-' || nextval('admin_event_seq')),
  type           TEXT NOT NULL DEFAULT 'regular',
  date           DATE NOT NULL,
  end_date       DATE,
  start_time     TEXT NOT NULL DEFAULT '',
  end_time       TEXT NOT NULL DEFAULT '',
  titles         JSONB NOT NULL DEFAULT '{}',
  descriptions   JSONB,
  location       TEXT,
  private        BOOLEAN NOT NULL DEFAULT FALSE,
  generation_tag TEXT,
  parent_id      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS suppressed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_role TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_days TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS gcal_event_ids JSONB;

CREATE TABLE IF NOT EXISTS event_templates (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  titles             JSONB NOT NULL DEFAULT '{}',
  default_start_time TEXT DEFAULT '',
  default_end_time   TEXT DEFAULT '',
  private_by_default BOOLEAN NOT NULL DEFAULT FALSE,
  type               TEXT NOT NULL DEFAULT 'regular',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'regular';

CREATE TABLE IF NOT EXISTS holidays (
  id        SERIAL PRIMARY KEY,
  year      INTEGER NOT NULL,
  date      DATE NOT NULL,
  name_he   TEXT NOT NULL,
  name_en   TEXT NOT NULL,
  category  TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, date, name_en)
);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);
`;

export async function initDb() {
  await pool.query(SCHEMA);
  console.log('[db] Schema ready');
}

function rowToEvent(row) {
  return {
    id: row.id,
    type: row.type,
    date: row.date.slice(0, 10),
    endDate: row.end_date ? row.end_date.slice(0, 10) : undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    title: row.titles,
    description: row.descriptions || undefined,
    location: row.location || undefined,
    private: row.private,
    generationTag: row.generation_tag || undefined,
    parentId: row.parent_id || undefined,
    createdByRole: row.created_by_role || undefined,
    recurrence: row.recurrence || undefined,
    recurrenceEnd: row.recurrence_end ? row.recurrence_end.slice(0, 10) : undefined,
    recurrenceId: row.recurrence_id || undefined,
    recurrenceDays: row.recurrence_days || undefined,
    gcalEventIds: row.gcal_event_ids || undefined,
    _db: true,
  };
}

export async function getDbEvents(includePrivate = false) {
  const { rows } = await pool.query(
    includePrivate
      ? 'SELECT * FROM events WHERE suppressed = FALSE ORDER BY date, start_time'
      : 'SELECT * FROM events WHERE private = FALSE AND suppressed = FALSE ORDER BY date, start_time'
  );
  return rows.map(rowToEvent);
}

export async function getAllDbIds() {
  const { rows } = await pool.query('SELECT id FROM events');
  return rows.map(r => r.id);
}

export async function getDbEventById(id) {
  const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  return rows[0] ? rowToEvent(rows[0]) : null;
}

export { rowToEvent };
