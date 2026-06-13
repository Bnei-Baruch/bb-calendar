/**
 * Bulk-sync existing DB events to Google Calendars.
 * Syncs parent recurring events (with RRULE) and non-recurring events.
 * Child occurrence rows are skipped — covered by the parent's RRULE.
 *
 * Usage:
 *   DRY_RUN=true node scripts/sync-gcal.js    # preview
 *   node scripts/sync-gcal.js                  # apply
 *   FORCE=true node scripts/sync-gcal.js       # re-sync already-synced events too
 */

import pg from 'pg';
import { gcalCreate, gcalUpdate } from '../server/gcal.js';

const { Pool, types } = pg;
types.setTypeParser(1082, v => v);

const DRY_RUN = process.env.DRY_RUN !== 'false';
const FORCE   = process.env.FORCE === 'true';
const BATCH   = 10;
const DELAY_MS = 500;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bb_calendar:changeme@127.0.0.1:5432/bb_calendar',
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\n=== GCal Bulk Sync ===`);
  console.log(`Mode:  ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Force: ${FORCE ? 'yes (re-sync all)' : 'no (skip already synced)'}\n`);

  // Only sync parents and non-recurring events (not child rows)
  const condition = FORCE
    ? `(recurrence_id IS NULL OR id = recurrence_id) AND private = FALSE`
    : `(recurrence_id IS NULL OR id = recurrence_id) AND private = FALSE AND gcal_event_ids IS NULL`;

  const { rows } = await pool.query(
    `SELECT * FROM events WHERE ${condition} ORDER BY date`
  );

  console.log(`Events to sync: ${rows.length}`);
  if (DRY_RUN) {
    const recurring    = rows.filter(r => r.recurrence_id).length;
    const nonRecurring = rows.length - recurring;
    console.log(`  Recurring series (parents): ${recurring}`);
    console.log(`  Non-recurring events:       ${nonRecurring}`);
    console.log('\nDry run done. Set DRY_RUN=false to apply.\n');
    await pool.end();
    return;
  }

  let created = 0, updated = 0, failed = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async (row) => {
      const event = {
        id: row.id,
        type: row.type,
        date: row.date.slice(0, 10),
        startTime: row.start_time,
        endTime: row.end_time,
        title: row.titles,
        description: row.descriptions || undefined,
        private: row.private,
        recurrence: row.recurrence || undefined,
        recurrenceEnd: row.recurrence_end ? row.recurrence_end.slice(0, 10) : undefined,
        recurrenceId: row.recurrence_id || undefined,
        recurrenceDays: row.recurrence_days || undefined,
        gcalEventIds: row.gcal_event_ids || undefined,
      };
      try {
        let ids;
        if (FORCE && event.gcalEventIds) {
          ids = await gcalUpdate(event, event.gcalEventIds);
          updated++;
        } else {
          ids = await gcalCreate(event);
          created++;
        }
        if (ids) {
          await pool.query('UPDATE events SET gcal_event_ids=$1 WHERE id=$2', [ids, event.id]);
        }
      } catch (err) {
        console.error(`  [failed] ${event.id} ${event.title?.he}: ${err.message}`);
        failed++;
      }
    }));
    console.log(`  Progress: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
    if (i + BATCH < rows.length) await sleep(DELAY_MS);
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Failed: ${failed}\n`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
