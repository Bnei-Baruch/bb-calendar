/**
 * One-time seeding script: converts existing regular events into recurring series.
 *
 * Usage:
 *   DRY_RUN=true node scripts/seed-recurrence.js     # preview only
 *   node scripts/seed-recurrence.js                  # apply to DB
 *
 * Set DATABASE_URL env var to target a specific DB (defaults to local bb_calendar).
 */

import pg from 'pg';
const { Pool, types } = pg;
types.setTypeParser(1082, v => v);

const DRY_RUN = process.env.DRY_RUN !== 'false';
const DB_URL = process.env.DATABASE_URL || 'postgresql://bb_calendar:changeme@127.0.0.1:5432/bb_calendar';

const pool = new Pool({ connectionString: DB_URL });

function dayOfWeek(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay();
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
}

function fiveYearsFrom(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + 5);
  return d.toISOString().slice(0, 10);
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Detect pattern from sorted dates. Returns { pattern, allowedDows } or { pattern: null }
function detectPattern(sortedDates) {
  if (sortedDates.length < 2) return { pattern: null };
  const gaps = [];
  for (let i = 1; i < sortedDates.length; i++) {
    gaps.push(daysBetween(sortedDates[i - 1], sortedDates[i]));
  }
  const med = median(gaps);
  const maxGap = Math.max(...gaps);

  if (gaps.every(g => g === 7)) {
    return { pattern: 'weekly', allowedDows: new Set([dayOfWeek(sortedDates[0])]) };
  }
  // Daily: median gap = 1, max gap ≤ 3 (allows for weekend skips)
  if (med === 1 && maxGap <= 3) {
    return { pattern: 'daily', allowedDows: new Set(sortedDates.map(dayOfWeek)) };
  }
  return { pattern: null };
}

// Generate future dates on allowedDows from the day after lastDate up to endDate.
function generateFutureDates(lastDate, endDate, allowedDows) {
  const dates = [];
  let cur = addDays(lastDate, 1);
  while (cur <= endDate) {
    if (allowedDows.has(dayOfWeek(cur))) dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

async function run() {
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const monthEnd = nextMonth.toISOString().slice(0, 10);

  console.log(`\n=== Seed Recurrence Script ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (writing to DB)'}`);
  console.log(`DB:   ${DB_URL}`);
  console.log(`Pattern detection from: ${monthStart} → ${monthEnd}\n`);

  // Query current month regular events for pattern detection
  const { rows: monthRows } = await pool.query(`
    SELECT id, date, start_time, end_time, titles
    FROM events
    WHERE type = 'regular' AND recurrence_id IS NULL
      AND date >= $1 AND date < $2
    ORDER BY date
  `, [monthStart, monthEnd]);

  console.log(`Found ${monthRows.length} unseeded regular events in current month (used for pattern detection).\n`);

  // --- PASS 1: detect daily groups from current month ---
  const dailyGroupMap = new Map();
  for (const row of monthRows) {
    const key = `${row.start_time}|${row.end_time}|${row.titles?.he || ''}`;
    if (!dailyGroupMap.has(key)) dailyGroupMap.set(key, []);
    dailyGroupMap.get(key).push(row);
  }

  const detectedSignatures = []; // { key, pattern, allowedDows, startTime, endTime, titleHe }
  const dailyKeys = new Set();

  for (const [key, group] of dailyGroupMap) {
    if (group.length < 2) continue;
    const sorted = group.sort((a, b) => a.date.localeCompare(b.date));
    const { pattern, allowedDows } = detectPattern(sorted.map(r => r.date));
    if (pattern === 'daily') {
      // Use 'custom' for partial-week patterns, 'daily' only when all 7 days are present
      const effectivePattern = allowedDows.size < 7 ? 'custom' : 'daily';
      const first = sorted[0];
      detectedSignatures.push({ key, pattern: effectivePattern, allowedDows, startTime: first.start_time, endTime: first.end_time, titleHe: first.titles?.he || '' });
      dailyKeys.add(key);
    }
  }

  // --- PASS 2: detect weekly groups from non-daily current month rows ---
  const weeklyGroupMap = new Map();
  for (const row of monthRows) {
    const key = `${row.start_time}|${row.end_time}|${row.titles?.he || ''}`;
    if (dailyKeys.has(key)) continue;
    const dow = dayOfWeek(row.date);
    const weeklyKey = `${dow}|${row.start_time}|${row.end_time}|${row.titles?.he || ''}`;
    if (!weeklyGroupMap.has(weeklyKey)) weeklyGroupMap.set(weeklyKey, []);
    weeklyGroupMap.get(weeklyKey).push(row);
  }

  for (const [, group] of weeklyGroupMap) {
    if (group.length < 2) continue;
    const sorted = group.sort((a, b) => a.date.localeCompare(b.date));
    const { pattern, allowedDows } = detectPattern(sorted.map(r => r.date));
    if (pattern === 'weekly') {
      const first = sorted[0];
      const sigKey = `${first.start_time}|${first.end_time}|${first.titles?.he || ''}`;
      detectedSignatures.push({ key: sigKey, pattern, allowedDows, startTime: first.start_time, endTime: first.end_time, titleHe: first.titles?.he || '' });
    }
  }

  // For each detected signature, fetch ALL existing matching events (all months, unseeded)
  // to get the full existing set and the true last date.
  const series = [];
  for (const sig of detectedSignatures) {
    let query, params;
    if (sig.pattern === 'weekly') {
      const dow = [...sig.allowedDows][0];
      query = `
        SELECT id, date, start_time, end_time, titles, descriptions, location, private, type
        FROM events
        WHERE type = 'regular' AND recurrence_id IS NULL
          AND start_time = $1 AND end_time = $2 AND titles->>'he' = $3
          AND EXTRACT(DOW FROM date::date) = $4
        ORDER BY date
      `;
      params = [sig.startTime, sig.endTime, sig.titleHe, dow];
    } else {
      query = `
        SELECT id, date, start_time, end_time, titles, descriptions, location, private, type
        FROM events
        WHERE type = 'regular' AND recurrence_id IS NULL
          AND start_time = $1 AND end_time = $2 AND titles->>'he' = $3
        ORDER BY date
      `;
      params = [sig.startTime, sig.endTime, sig.titleHe];
    }
    const { rows: allRows } = await pool.query(query, params);
    if (allRows.length >= 2) {
      series.push({ ...sig, rows: allRows });
    }
  }

  // Collect all IDs handled so we can report skipped
  const handledIds = new Set(series.flatMap(s => s.rows.map(r => r.id)));
  const skippedInMonth = monthRows.filter(r => !handledIds.has(r.id));

  // --- Print summary ---
  const daily = series.filter(s => s.pattern === 'daily');
  const custom = series.filter(s => s.pattern === 'custom');
  const weekly = series.filter(s => s.pattern === 'weekly');

  console.log(`--- DAILY (every day) series: ${daily.length} ---`);
  for (const s of daily) {
    const last = s.rows[s.rows.length - 1];
    const futureEnd = fiveYearsFrom(last.date);
    const futureCount = generateFutureDates(last.date, futureEnd, s.allowedDows).length;
    console.log(`  [${s.startTime}-${s.endTime}] "${s.titleHe}" — ${s.rows.length} existing rows (up to ${last.date}), +${futureCount} future`);
  }

  console.log(`\n--- CUSTOM (specific days) series: ${custom.length} ---`);
  for (const s of custom) {
    const dows = [...s.allowedDows].sort((a,b)=>a-b).map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(',');
    const last = s.rows[s.rows.length - 1];
    const futureEnd = fiveYearsFrom(last.date);
    const futureCount = generateFutureDates(last.date, futureEnd, s.allowedDows).length;
    console.log(`  [${s.startTime}-${s.endTime}] "${s.titleHe}" — ${s.rows.length} existing rows (up to ${last.date}), +${futureCount} future, days: ${dows}`);
  }

  console.log(`\n--- WEEKLY series: ${weekly.length} ---`);
  for (const s of weekly) {
    const dows = [...s.allowedDows].map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(',');
    const last = s.rows[s.rows.length - 1];
    const futureEnd = fiveYearsFrom(last.date);
    const futureCount = generateFutureDates(last.date, futureEnd, s.allowedDows).length;
    console.log(`  [${s.startTime}-${s.endTime}] "${s.titleHe}" — ${s.rows.length} existing rows (up to ${last.date}), +${futureCount} future, day: ${dows}`);
  }

  console.log(`\n--- SKIPPED in current month (unclassified): ${skippedInMonth.length} events ---`);
  for (const r of skippedInMonth) {
    console.log(`  [${r.start_time}-${r.end_time}] "${r.titles?.he}" on ${r.date}`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Set DRY_RUN=false to apply.\n');
    await pool.end();
    return;
  }

  // --- APPLY ---
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let seriesCreated = 0;
    let occurrencesInserted = 0;

    for (const s of series) {
      const parent = s.rows[0];
      const last = s.rows[s.rows.length - 1];
      const recurrenceEnd = fiveYearsFrom(last.date);

      const recurrenceDaysStr = s.pattern === 'custom'
        ? [...s.allowedDows].sort((a, b) => a - b).join(',')
        : null;

      // Tag parent: set recurrence, recurrence_end, recurrence_days, recurrence_id = id
      await client.query(`
        UPDATE events
        SET recurrence = $1, recurrence_end = $2, recurrence_days = $3, recurrence_id = id
        WHERE id = $4
      `, [s.pattern, recurrenceEnd, recurrenceDaysStr, parent.id]);

      // Tag all other existing rows: set recurrence_id = parent.id
      const otherIds = s.rows.slice(1).map(r => r.id);
      if (otherIds.length > 0) {
        await client.query(
          `UPDATE events SET recurrence_id = $1 WHERE id = ANY($2)`,
          [parent.id, otherIds]
        );
      }

      // Insert future occurrences (after the last existing row)
      const futureDates = generateFutureDates(last.date, recurrenceEnd, s.allowedDows);
      for (const date of futureDates) {
        await client.query(`
          INSERT INTO events
            (type, date, start_time, end_time, titles, descriptions, location, private, recurrence_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          parent.type, date, parent.start_time, parent.end_time,
          JSON.stringify(parent.titles),
          parent.descriptions ? JSON.stringify(parent.descriptions) : null,
          parent.location || null,
          parent.private,
          parent.id,
        ]);
        occurrencesInserted++;
      }

      seriesCreated++;
    }

    await client.query('COMMIT');
    console.log(`\nDone. ${seriesCreated} series created, ${occurrencesInserted} future occurrences inserted.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error — rolled back:', err.message);
  } finally {
    client.release();
  }

  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
