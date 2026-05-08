#!/usr/bin/env node
// One-time script: import future regular events from the Sheets cache into the DB.
// Run with: node scripts/import-sheets-regular.js
// Dry-run:  node scripts/import-sheets-regular.js --dry-run

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

const CACHE_FILE = join(__dirname, '../data/events.json');

const { Pool, types } = pg;
types.setTypeParser(1082, v => v);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bb_calendar:changeme@127.0.0.1:5432/bb_calendar',
});

function israelToday() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jerusalem' }).slice(0, 10);
}

async function main() {
  const today = israelToday();
  console.log(`Today (Israel): ${today}`);
  console.log(DRY_RUN ? '--- DRY RUN ---' : '--- LIVE RUN ---');

  let cached;
  try {
    cached = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    console.error('Could not read', CACHE_FILE, '— make sure the server has run at least once to populate the cache.');
    process.exit(1);
  }

  const toImport = cached.filter(e => e.type === 'regular' && e.date >= today);
  console.log(`Sheets cache: ${cached.length} total, ${toImport.length} future regular events to consider`);

  // Check which IDs already exist in DB
  const ids = toImport.map(e => e.id);
  const { rows: existing } = await pool.query(
    'SELECT id FROM events WHERE id = ANY($1)', [ids]
  );
  const existingIds = new Set(existing.map(r => r.id));
  console.log(`Already in DB: ${existingIds.size}`);

  const toInsert = toImport.filter(e => !existingIds.has(e.id));
  console.log(`Will import: ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log('Nothing to do.');
    await pool.end();
    return;
  }

  if (DRY_RUN) {
    toInsert.slice(0, 5).forEach(e =>
      console.log(`  ${e.id}  ${e.date}  ${e.startTime}–${e.endTime}  ${e.title?.he || e.title?.en}`)
    );
    if (toInsert.length > 5) console.log(`  ... and ${toInsert.length - 5} more`);
    await pool.end();
    return;
  }

  let imported = 0, failed = 0;
  for (const e of toInsert) {
    try {
      await pool.query(
        `INSERT INTO events (id, type, date, end_date, start_time, end_time, titles, descriptions, private, generation_tag)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          e.id,
          e.type,
          e.date,
          e.endDate || null,
          e.startTime || '',
          e.endTime || '',
          e.title || {},
          e.description || null,
          false,
          'sheets-import',
        ]
      );
      imported++;
    } catch (err) {
      console.error(`Failed ${e.id}:`, err.message);
      failed++;
    }
  }

  console.log(`Done. Imported: ${imported}, failed: ${failed}, skipped (already existed): ${existingIds.size}`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
