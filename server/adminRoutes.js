import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { HebrewCalendar, HDate } from '@hebcal/core';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool, getDbEvents, getDbEventById, rowToEvent } from './db.js';
import { requireAdmin, requireAdminOrTranslator, isTranslatorRole } from './auth.js';
import { gcalCreate, gcalUpdate, gcalDelete, gcalUpdateUntil, gcalDeleteInstance } from './gcal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getSheetsEvents() {
  const cachePath = join(__dirname, '../data/events.json');
  if (!existsSync(cachePath)) return [];
  try { return JSON.parse(readFileSync(cachePath, 'utf8')); } catch { return []; }
}

const router = Router();
router.use((req, res, next) => { res.setHeader('Content-Type', 'application/json'); next(); });

let anthropic;
function getAnthropic() {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ALL_LANGS_ORDERED = ['he','en','ru','es','de','it','fr','pt','uk','tr','bg'];
const LANG_NAMES_EN = { he:'Hebrew',en:'English',ru:'Russian',es:'Spanish',de:'German',it:'Italian',fr:'French',pt:'Portuguese',uk:'Ukrainian',tr:'Turkish',bg:'Bulgarian' };

async function enrichTitles(titles, templates) {
  const full = { ...titles };
  const missing = ALL_LANGS_ORDERED.filter(l => !full[l]);
  if (!missing.length) return full;

  // 1. Fill from best-matching template (he or en title match)
  const heTitle = (full.he || '').trim().toLowerCase();
  const enTitle = (full.en || '').trim().toLowerCase();
  const tmpl = templates.find(t => {
    const tHe = (t.titles?.he || '').trim().toLowerCase();
    const tEn = (t.titles?.en || '').trim().toLowerCase();
    return (heTitle && tHe && heTitle === tHe) || (enTitle && tEn && enTitle === tEn);
  });
  if (tmpl) {
    for (const l of missing) {
      if (tmpl.titles[l]) full[l] = tmpl.titles[l];
    }
  }

  // 2. Translate remaining via Claude (haiku — fast & cheap)
  const stillMissing = ALL_LANGS_ORDERED.filter(l => !full[l]);
  if (stillMissing.length) {
    try {
      const sourceLang = full.he ? 'he' : full.en ? 'en' : 'ru';
      const sourceText = full[sourceLang];
      const targetList = stillMissing.map(l => `${l} (${LANG_NAMES_EN[l]})`).join(', ');
      const prompt = `Translate the following short event title from ${LANG_NAMES_EN[sourceLang]} into these languages: ${targetList}.
This is for a Jewish educational community calendar (Bnei Baruch / Kabbalah). Preserve proper nouns like "Kabbalah", "Zohar", "Bnei Baruch".
Output one translation per line in the exact format: LANGCODE|translation
Do not include any other text.

Text to translate:
${sourceText}`;
      const msg = await getAnthropic().messages.create({ model:'claude-haiku-4-5-20251001', max_tokens:512, messages:[{role:'user',content:prompt}] });
      for (const line of msg.content[0].text.trim().split('\n')) {
        const pipe = line.indexOf('|');
        if (pipe === -1) continue;
        const lang = line.slice(0, pipe).trim();
        const val  = line.slice(pipe + 1).trim();
        if (lang && val && stillMissing.includes(lang)) full[lang] = val;
      }
    } catch (err) {
      console.warn('[enrichTitles] translation failed:', err.message);
    }
  }
  return full;
}

function byDateThenTime(a, b) {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

function datesInMonth(year, month) {
  const dates = [];
  let day = 1;
  while (true) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const d = new Date(dateStr + 'T12:00:00Z');
    if (d.getUTCMonth() + 1 !== month) break;
    dates.push(dateStr);
    day++;
  }
  return dates;
}

function dayOfWeek(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay();
}

function generateRecurrenceDates(startDate, recurrence, endDate, recurrenceDays) {
  const dates = [];
  const end = new Date(endDate + 'T12:00:00Z');
  let current = new Date(startDate + 'T12:00:00Z');
  const MAX = 1827;

  if (recurrence === 'custom' && recurrenceDays) {
    const allowedDows = new Set(recurrenceDays.split(',').map(Number));
    current = new Date(current.getTime() + 86400000);
    while (current <= end && dates.length < MAX) {
      if (allowedDows.has(current.getUTCDay())) dates.push(current.toISOString().slice(0, 10));
      current = new Date(current.getTime() + 86400000);
    }
    return dates;
  }

  const advance = (d) => {
    if (recurrence === 'daily')   return new Date(d.getTime() + 86400000);
    if (recurrence === 'weekly')  return new Date(d.getTime() + 7 * 86400000);
    const next = new Date(d); next.setUTCMonth(next.getUTCMonth() + 1); return next;
  };

  current = advance(current);
  while (current <= end && dates.length < MAX) {
    dates.push(current.toISOString().slice(0, 10));
    current = advance(current);
  }
  return dates;
}

// ── Google Calendar sync (fire-and-forget) ────────────────────────────────────

function isGcalChild(event) {
  return event.recurrenceId && event.id !== event.recurrenceId;
}

function syncGcalCreate(event) {
  if (event.private || isGcalChild(event)) return;
  gcalCreate(event)
    .then(ids => { if (ids) pool.query('UPDATE events SET gcal_event_ids=$1 WHERE id=$2', [ids, event.id]); })
    .catch(err => console.error('[gcal] create failed:', err.message));
}

function syncGcalUpdate(event) {
  if (isGcalChild(event)) return;
  const action = event.gcalEventIds
    ? gcalUpdate(event, event.gcalEventIds)
    : gcalCreate(event);
  action
    .then(ids => { if (ids) pool.query('UPDATE events SET gcal_event_ids=$1 WHERE id=$2', [ids, event.id]); })
    .catch(err => console.error('[gcal] update failed:', err.message));
}

function syncGcalDelete(gcalIds) {
  if (!gcalIds) return;
  gcalDelete(gcalIds).catch(err => console.error('[gcal] delete failed:', err.message));
}

// ── Events CRUD ───────────────────────────────────────────────────────────────

router.get('/events', requireAdmin, async (req, res) => {
  try {
    const events = await getDbEvents(true);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/events/:id', requireAdminOrTranslator, async (req, res) => {
  try {
    const event = await getDbEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/events', requireAdminOrTranslator, async (req, res) => {
  try {
    const { type = 'regular', date, endDate, startTime = '', endTime = '',
            titles = {}, descriptions, location, private: priv = false, generationTag, parentId,
            recurrence, recurrenceEnd, recurrenceDays } = req.body;
    if (!date) return res.status(400).json({ error: 'date required' });

    let safeTitles = titles;
    let safeDescs = descriptions;
    let safePriv = priv;
    if (isTranslatorRole(req.user)) {
      const { he: _ht, ...nonHeTitles } = titles;
      const { he: _hd, ...nonHeDescs } = (descriptions || {});
      safeTitles = nonHeTitles;
      safeDescs = Object.keys(nonHeDescs).length ? nonHeDescs : null;
      safePriv = false;
    }

    const createdByRole = isTranslatorRole(req.user) ? 'events_translator' : 'events_admin';
    const safeRecurrenceDays = recurrence === 'custom' && recurrenceDays ? recurrenceDays : null;
    const { rows } = await pool.query(
      `INSERT INTO events (type, date, end_date, start_time, end_time, titles, descriptions, location, private, generation_tag, parent_id, created_by_role, recurrence, recurrence_end, recurrence_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [type, date, endDate || null, startTime, endTime, safeTitles, safeDescs || null, location || null, safePriv, generationTag || null, parentId || null, createdByRole, recurrence || null, recurrenceEnd || null, safeRecurrenceDays]
    );
    const parent = rows[0];

    if (recurrence && recurrenceEnd) {
      // Tag all series events (including parent) with the parent's id as recurrence_id
      await pool.query('UPDATE events SET recurrence_id=$1 WHERE id=$1', [parent.id]);
      parent.recurrence_id = parent.id; // reflect so rowToEvent includes it for RRULE

      const occurrenceDates = generateRecurrenceDates(date, recurrence, recurrenceEnd, safeRecurrenceDays);
      if (occurrenceDates.length) {
        const vals = [], params = [];
        let idx = 1;
        for (const d of occurrenceDates) {
          vals.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
          params.push(type, d, endDate || null, startTime, endTime, JSON.stringify(safeTitles), safeDescs ? JSON.stringify(safeDescs) : null, location || null, safePriv, parentId || null, parent.id);
        }
        await pool.query(
          `INSERT INTO events (type, date, end_date, start_time, end_time, titles, descriptions, location, private, parent_id, recurrence_id) VALUES ${vals.join(',')}`,
          params
        );
      }
    }

    const created = rowToEvent(parent);
    res.status(201).json(created);
    syncGcalCreate(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/events/:id', requireAdminOrTranslator, async (req, res) => {
  try {
    const { type, date, endDate, startTime, endTime, titles, descriptions, location, private: priv, parentId } = req.body;

    let safeTitles = titles;
    let safeDescs = descriptions;
    let safePriv = priv;
    if (isTranslatorRole(req.user)) {
      const existing = await getDbEventById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      safeTitles = { ...titles };
      existing.title?.he ? (safeTitles.he = existing.title.he) : delete safeTitles.he;
      safeDescs = { ...(descriptions || {}) };
      existing.description?.he ? (safeDescs.he = existing.description.he) : delete safeDescs.he;
      if (!Object.keys(safeDescs).length) safeDescs = null;
      safePriv = existing.private;
    }

    const { rows } = await pool.query(
      `UPDATE events SET
         type=$1, date=$2, end_date=$3, start_time=$4, end_time=$5,
         titles=$6, descriptions=$7, location=$8, private=$9, parent_id=$10
       WHERE id=$11 RETURNING *`,
      [type, date, endDate || null, startTime, endTime, safeTitles, safeDescs || null, location || null, safePriv, parentId || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const updated = rowToEvent(rows[0]);
    res.json(updated);
    syncGcalUpdate(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/events/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const future = req.query.future === 'true';

    if (future) {
      const { rows } = await pool.query('SELECT recurrence_id, date FROM events WHERE id=$1', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      const seriesId = rows[0].recurrence_id;
      const thisDate = rows[0].date?.slice(0, 10);
      if (!seriesId) return res.status(400).json({ error: 'Not a recurring event' });
      // Fetch parent gcal IDs and date before deleting
      const { rows: parentRows } = await pool.query('SELECT gcal_event_ids, date FROM events WHERE id=$1', [seriesId]);
      const parentGcalIds = parentRows[0]?.gcal_event_ids;
      const parentDate = parentRows[0]?.date?.slice(0, 10);
      await pool.query('DELETE FROM events WHERE recurrence_id=$1 AND date >= $2', [seriesId, thisDate]);
      res.json({ ok: true });
      if (parentGcalIds) {
        if (!parentDate || thisDate <= parentDate) {
          // Deleting from the first occurrence — remove GCal event entirely
          gcalDelete(parentGcalIds).catch(err => console.error('[gcal] delete series failed:', err.message));
        } else {
          gcalUpdateUntil(parentGcalIds, thisDate).catch(err => console.error('[gcal] updateUntil failed:', err.message));
        }
      }
      return;
    }

    // Fetch gcal IDs before deleting
    const { rows: evRows } = await pool.query('SELECT gcal_event_ids, recurrence_id, id, date FROM events WHERE id=$1', [id]);
    const evGcalIds = evRows[0]?.gcal_event_ids;
    const evDate = evRows[0]?.date?.slice(0, 10);
    const parentId = evRows[0]?.recurrence_id;
    const isChild = parentId && parentId !== id;
    const query = id.startsWith('adm-')
      ? 'DELETE FROM events WHERE id=$1'
      : 'UPDATE events SET suppressed=TRUE WHERE id=$1';
    const { rowCount } = await pool.query(query, [id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
    if (!isChild) {
      syncGcalDelete(evGcalIds);
    } else if (evDate) {
      // Single occurrence of a recurring series — cancel the specific GCal instance
      pool.query('SELECT gcal_event_ids FROM events WHERE id=$1', [parentId])
        .then(({ rows }) => {
          const parentGcalIds = rows[0]?.gcal_event_ids;
          if (parentGcalIds) gcalDeleteInstance(parentGcalIds, evDate)
            .catch(err => console.error('[gcal] deleteInstance failed:', err.message));
        })
        .catch(err => console.error('[gcal] parent lookup failed:', err.message));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/events/:id/series', requireAdminOrTranslator, async (req, res) => {
  try {
    const { titles, descriptions, startTime, endTime, location, private: priv,
            recurrence, recurrenceEnd, recurrenceDays } = req.body;
    const { rows } = await pool.query('SELECT recurrence_id, date FROM events WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const seriesId = rows[0].recurrence_id;
    if (!seriesId) return res.status(400).json({ error: 'Not a recurring event' });

    let safeTitles = titles;
    let safeDescs = descriptions || null;
    if (isTranslatorRole(req.user)) {
      const existing = await getDbEventById(req.params.id);
      safeTitles = { ...titles };
      existing.title?.he ? (safeTitles.he = existing.title.he) : delete safeTitles.he;
      safeDescs = { ...(descriptions || {}) };
      existing.description?.he ? (safeDescs.he = existing.description.he) : delete safeDescs.he;
      if (!Object.keys(safeDescs).length) safeDescs = null;
    }

    const thisDate = rows[0].date?.slice(0, 10);

    if (recurrence) {
      const safeRecurrenceDays = recurrence === 'custom' && recurrenceDays ? recurrenceDays : null;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE events SET titles=$1, descriptions=$2, start_time=$3, end_time=$4, location=$5, private=$6
           WHERE recurrence_id=$7 AND date >= $8`,
          [safeTitles, safeDescs, startTime, endTime, location || null, priv, seriesId, thisDate]
        );
        await client.query(
          'DELETE FROM events WHERE recurrence_id=$1 AND date > $2',
          [seriesId, thisDate]
        );
        await client.query(
          'UPDATE events SET recurrence=$1, recurrence_end=$2, recurrence_days=$3 WHERE id=$4',
          [recurrence, recurrenceEnd || null, safeRecurrenceDays, seriesId]
        );
        if (recurrenceEnd) {
          const futureDates = generateRecurrenceDates(thisDate, recurrence, recurrenceEnd, safeRecurrenceDays);
          if (futureDates.length) {
            const { rows: parentRows } = await client.query('SELECT * FROM events WHERE id=$1', [seriesId]);
            const p = parentRows[0];
            const vals = [], params = [];
            let idx = 1;
            for (const d of futureDates) {
              vals.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
              params.push(p.type, d, p.end_date, startTime, endTime,
                JSON.stringify(safeTitles), safeDescs ? JSON.stringify(safeDescs) : null,
                location || null, priv, seriesId);
            }
            await client.query(
              `INSERT INTO events (type, date, end_date, start_time, end_time, titles, descriptions, location, private, recurrence_id) VALUES ${vals.join(',')}`,
              params
            );
          }
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      await pool.query(
        `UPDATE events SET titles=$1, descriptions=$2, start_time=$3, end_time=$4, location=$5, private=$6
         WHERE recurrence_id=$7 AND date >= $8`,
        [safeTitles, safeDescs, startTime, endTime, location || null, priv, seriesId, thisDate]
      );
    }
    res.json({ ok: true });
    // Sync the parent recurring event to GCal (it has the RRULE)
    const { rows: parentRows } = await pool.query('SELECT * FROM events WHERE id=$1', [seriesId]);
    if (parentRows.length) syncGcalUpdate(rowToEvent(parentRows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Translate (accessible to translators) ─────────────────────────────────────

router.post('/translate', requireAdminOrTranslator, async (req, res) => {
  try {
    const { text, sourceLang = 'he', targetLangs } = req.body;
    if (!text || !Array.isArray(targetLangs) || !targetLangs.length) {
      return res.status(400).json({ error: 'text and targetLangs[] required' });
    }

    const targetList = targetLangs.map(l => `${l} (${LANG_NAMES[l] || l})`).join(', ');
    const prompt = `Translate the following short event title from ${LANG_NAMES[sourceLang] || sourceLang} into these languages: ${targetList}.
This is for a Jewish educational community calendar (Bnei Baruch / Kabbalah). Preserve proper nouns like "Kabbalah", "Zohar", "Bnei Baruch".
Output one translation per line in the exact format: LANGCODE|translation
Do not include any other text, explanation, or punctuation outside the lines.
Example:
en|Morning Lesson
ru|Утренний урок

Text to translate:
${text}`;

    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const translations = {};
    for (const line of message.content[0].text.trim().split('\n')) {
      const pipe = line.indexOf('|');
      if (pipe === -1) continue;
      const lang = line.slice(0, pipe).trim();
      const val  = line.slice(pipe + 1).trim();
      if (lang && val) translations[lang] = val;
    }
    res.json({ translations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All routes below this point require admin role
router.use(requireAdmin);

// ── Templates CRUD ────────────────────────────────────────────────────────────

const tmplToJson = r => ({
  id: r.id, name: r.name, titles: r.titles, type: r.type || 'regular',
  defaultStartTime: r.default_start_time, defaultEndTime: r.default_end_time,
  privateByDefault: r.private_by_default,
});

router.get('/templates', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM event_templates ORDER BY id');
    res.json(rows.map(tmplToJson));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM event_templates WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(tmplToJson(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, titles = {}, defaultStartTime = '', defaultEndTime = '', privateByDefault = false, type = 'regular' } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await pool.query(
      `INSERT INTO event_templates (name, titles, default_start_time, default_end_time, private_by_default, type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, titles, defaultStartTime, defaultEndTime, privateByDefault, type]
    );
    res.status(201).json(tmplToJson(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const { name, titles, defaultStartTime, defaultEndTime, privateByDefault, type = 'regular' } = req.body;
    const { rows } = await pool.query(
      `UPDATE event_templates SET name=$1, titles=$2, default_start_time=$3, default_end_time=$4, private_by_default=$5, type=$6
       WHERE id=$7 RETURNING *`,
      [name, titles, defaultStartTime, defaultEndTime, privateByDefault, type, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(tmplToJson(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const { rows: refs } = await pool.query(
      'SELECT id FROM events WHERE titles @> $1 LIMIT 1',
      [JSON.stringify({})] // placeholder — we check by template reference
    );
    // Simple approach: just delete (events keep their denormalized titles)
    const { rowCount } = await pool.query('DELETE FROM event_templates WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate preview + confirm ────────────────────────────────────────────────

router.post('/generate/preview', async (req, res) => {
  try {
    const { targetMonth, referenceMonth } = req.body;
    // targetMonth and referenceMonth: "YYYY-MM"
    if (!targetMonth || !referenceMonth) {
      return res.status(400).json({ error: 'targetMonth and referenceMonth required' });
    }

    const [refYear, refMonthNum] = referenceMonth.split('-').map(Number);
    const [tgtYear, tgtMonthNum] = targetMonth.split('-').map(Number);

    // Fetch all events from referenceMonth (Sheets + DB)
    const refStart = `${referenceMonth}-01`;
    const lastDay = new Date(Date.UTC(refYear, refMonthNum, 0)).getUTCDate();
    const refEnd = `${referenceMonth}-${String(lastDay).padStart(2, '0')}`;


    const { rows: refRows } = await pool.query(
      'SELECT * FROM events WHERE date >= $1 AND date <= $2 ORDER BY date, start_time',
      [refStart, refEnd]
    );
    const sheetsAll = getSheetsEvents();
    const sheetsRef = sheetsAll.filter(e => e.date >= refStart && e.date <= refEnd);
    // Exclude one-off events (holidays, labels) that have no start time
    const refEvents = [...sheetsRef, ...refRows.map(rowToEvent)].filter(e => e.startTime);

    // Load templates before AI call — needed for both the prompt and enriching results
    const { rows: tmplRows } = await pool.query('SELECT * FROM event_templates ORDER BY id');

    // Fetch reference month holidays to mark which dates to ignore
    const refHolidays = await getHolidaysForMonth(refYear, refMonthNum);
    const refHolidayDates = new Set(refHolidays.map(h => h.date));

    // Format events for Claude: date (Weekday):\n  HH:MM-HH:MM: title
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const byDate = {};
    for (const e of refEvents) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    }
    const eventList = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, evs]) => {
        const dow = dayOfWeek(date);
        const holiday = refHolidayDates.has(date) ? ' [HOLIDAY - ignore for pattern]' : '';
        return `${date} (${DAYS[dow]})${holiday}:\n` +
          evs.map(e => `  ${e.startTime}-${e.endTime}: ${(e.title?.he || '').replace(/\s*\n\s*/g, ' ')}`).join('\n');
      })
      .join('\n\n');

    const templateList = tmplRows
      .map(t => `  id=${t.id} "${t.titles?.he || t.name}" (default ${t.default_start_time}-${t.default_end_time})`)
      .join('\n');

    const aiPrompt = `You are analyzing a Bnei Baruch (Kabbalah) community calendar for ${referenceMonth}.

Task: for each day of the week, identify which of the KNOWN RECURRING EVENT TYPES below appear in the schedule, and at what time. Return the standard weekly schedule.

Known recurring event types (ONLY these may appear in output, referenced by id):
${templateList}

Rules:
- Dates marked [HOLIDAY - ignore for pattern] are Jewish holidays — skip those dates entirely.
- For each non-holiday occurrence of a weekday, check which known event types appear.
- Include an event type for a weekday if it appears on most non-holiday occurrences of that day.
- Use the start/end times actually observed in the data (not the defaults).

Day numbers: 0=Sunday 1=Monday 2=Tuesday 3=Wednesday 4=Thursday 5=Friday 6=Saturday

Return ONLY valid JSON, no other text:
{"pattern":{"0":[{"templateId":1,"startTime":"H:MM","endTime":"H:MM"}],"6":[...]}}
Omit days with no recurring events.

Events for ${referenceMonth}:
${eventList}`;

    const aiMsg = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: aiPrompt }],
    });

    let aiPattern;
    try {
      const text = aiMsg.content[0].text.trim();
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      aiPattern = JSON.parse(text.slice(start, end + 1)).pattern;
    } catch (e) {
      return res.status(500).json({ error: 'AI response parse error: ' + e.message });
    }

    const tmplById = Object.fromEntries(tmplRows.map(t => [t.id, t]));

    // Fetch Jewish holidays for target month
    const holidayDates = await getHolidaysForMonth(tgtYear, tgtMonthNum);

    // Major holiday days in target get events copied from the matching holiday day in reference,
    // not from the regular weekly pattern
    const majorTargetHolidays = holidayDates.filter(h => h.category?.includes('major'));
    const majorTargetDates = new Set(majorTargetHolidays.map(h => h.date));

    // Build reference holiday lookup: nameEn → events on that date
    const refMajorHolidays = refHolidays.filter(h => h.category?.includes('major'));
    const refEventsByDate = {};
    const allRefEvents = [...sheetsRef, ...refRows.map(rowToEvent)].filter(e => e.startTime);
    for (const e of allRefEvents) {
      if (!refEventsByDate[e.date]) refEventsByDate[e.date] = [];
      refEventsByDate[e.date].push(e);
    }
    const refHolidayEventsByName = {};
    for (const rh of refMajorHolidays) {
      refHolidayEventsByName[rh.nameEn] = refEventsByDate[rh.date] || [];
    }

    // Build preview events for target month
    const targetDates = datesInMonth(tgtYear, tgtMonthNum);
    const previewEvents = [];

    for (const date of targetDates) {
      if (majorTargetDates.has(date)) {
        // Holiday day: copy events from the matching holiday in the reference month
        const th = majorTargetHolidays.find(h => h.date === date);
        const refEvts = refHolidayEventsByName[th.nameEn] || [];
        for (const e of refEvts) {
          previewEvents.push({
            date,
            startTime: e.startTime,
            endTime: e.endTime,
            type: e.type || 'regular',
            titles: e.title,
            private: e.private || false,
          });
        }
      } else {
        // Regular day: apply weekly pattern from AI
        const dow = dayOfWeek(date);
        const slots = aiPattern[String(dow)] || [];
        for (const slot of slots) {
          const tmpl = tmplById[slot.templateId];
          if (!tmpl) continue;
          previewEvents.push({
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: 'regular',
            titles: tmpl.titles,
            private: tmpl.private_by_default,
          });
        }
      }
    }

    // Dates in target month that already have manually-added DB events
    const tgtStart = `${targetMonth}-01`;
    const tgtLastDay = new Date(Date.UTC(tgtYear, tgtMonthNum, 0)).getUTCDate();
    const tgtEnd = `${targetMonth}-${String(tgtLastDay).padStart(2, '0')}`;
    const { rows: existingRows } = await pool.query(
      'SELECT DISTINCT date FROM events WHERE date >= $1 AND date <= $2',
      [tgtStart, tgtEnd]
    );
    const existingDates = existingRows.map(r => r.date.slice(0, 10));

    res.json({
      previewEvents,
      holidayDates,
      existingDates,
      referenceMonth,
      targetMonth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate/confirm', async (req, res) => {
  try {
    const { events, targetMonth } = req.body;
    if (!Array.isArray(events) || !events.length) {
      return res.status(400).json({ error: 'events array required' });
    }

    const tag = targetMonth || events[0]?.date?.slice(0, 7);

    // Bulk insert using a single query with unnested values
    const values = [];
    const params = [];
    let idx = 1;
    for (const e of events) {
      values.push(`($${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++},$${idx++})`);
      params.push(
        e.type || 'regular', e.date, e.endDate || null, e.startTime || '', e.endTime || '',
        JSON.stringify(e.titles || e.title || {}),
        e.descriptions ? JSON.stringify(e.descriptions) : null,
        e.private || false, tag
      );
    }

    await pool.query(
      `INSERT INTO events (type, date, end_date, start_time, end_time, titles, descriptions, private, generation_tag)
       VALUES ${values.join(',')}`,
      params
    );

    res.json({ created: events.length, generationTag: tag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Holidays ──────────────────────────────────────────────────────────────────

async function getHolidaysForMonth(year, month) {
  const { rows } = await pool.query(
    `SELECT date, name_he, name_en, category FROM holidays
     WHERE year=$1 AND EXTRACT(MONTH FROM date)=$2`,
    [year, month]
  );

  if (rows.length > 0) {
    return rows.map(r => ({
      date: r.date.slice(0, 10),
      nameHe: r.name_he, nameEn: r.name_en, category: r.category,
    }));
  }

  // Cache miss — fetch and store the whole year
  await cacheHolidaysForYear(year);

  const { rows: fresh } = await pool.query(
    `SELECT date, name_he, name_en, category FROM holidays
     WHERE year=$1 AND EXTRACT(MONTH FROM date)=$2`,
    [year, month]
  );
  return fresh.map(r => ({
    date: r.date.slice(0, 10),
    nameHe: r.name_he, nameEn: r.name_en, category: r.category,
  }));
}

async function cacheHolidaysForYear(year) {
  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true,
    sedrot: false,
    omer: false,
    shabbat: false,
  });

  const inserts = events.map(ev => {
    const d = ev.getDate().greg();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return pool.query(
      `INSERT INTO holidays (year, date, name_he, name_en, category)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (year, date, name_en) DO NOTHING`,
      [year, date, ev.render('he') || ev.getDesc(), ev.getDesc(), ev.getCategories()?.[0] || null]
    );
  });
  await Promise.all(inserts);
  console.log(`[holidays] Cached ${events.length} events for ${year}`);
}

router.get('/holidays/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (isNaN(year)) return res.status(400).json({ error: 'Invalid year' });

    const { rows } = await pool.query(
      'SELECT date, name_he, name_en, category FROM holidays WHERE year=$1 ORDER BY date',
      [year]
    );

    if (!rows.length) {
      await cacheHolidaysForYear(year);
      const { rows: fresh } = await pool.query(
        'SELECT date, name_he, name_en, category FROM holidays WHERE year=$1 ORDER BY date',
        [year]
      );
      return res.json(fresh.map(r => ({
        date: r.date.slice(0, 10),
        nameHe: r.name_he, nameEn: r.name_en, category: r.category,
      })));
    }

    res.json(rows.map(r => ({
      date: r.date.slice(0, 10),
      nameHe: r.name_he, nameEn: r.name_en, category: r.category,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Year holidays (grouped) ───────────────────────────────────────────────────

// Strip Hebrew vowel marks (nikud U+05B0–U+05C7) and cantillation (U+0591–U+05AF)
function stripNikud(str) {
  return str.replace(/[֑-ׇ]/g, '');
}

function holidayFamily(nameEn) {
  return nameEn
    .replace(/^Erev /, '')
    .replace(/: \d+ Candles?$/, '')   // Chanukah: N Candle(s) → Chanukah
    .replace(/ (I{1,3}|IV|VI{0,3}|IX|VII|VIII)\b.*$/, '')
    .replace(/ \(CH''M\).*$/, '')
    .trim();
}

function groupHolidayRows(rows) {
  const groups = [];
  for (const row of rows) {
    if (row.name_en.startsWith('Erev ')) continue; // eve handled by frontend display shift
    const date = row.date.slice(0, 10);
    const family = holidayFamily(row.name_en);
    const last = groups[groups.length - 1];
    if (last && last.family === family) {
      const gap = (new Date(date + 'T12:00:00Z') - new Date(last.endDate + 'T12:00:00Z')) / 86400000;
      if (gap <= 2) { last.endDate = date; continue; }
    }
    const nameHe = stripNikud(row.name_he).replace(/^ערב /, '');
    groups.push({ family, nameEn: family, nameHe, date, endDate: date, category: row.category });
  }
  return groups;
}

router.get('/holidays/year/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (isNaN(year)) return res.status(400).json({ error: 'Invalid year' });

    let { rows } = await pool.query(
      `SELECT date, name_he, name_en, category FROM holidays
       WHERE year=$1 AND category LIKE '%holiday%' ORDER BY date`,
      [year]
    );
    if (!rows.length) {
      await cacheHolidaysForYear(year);
      ({ rows } = await pool.query(
        `SELECT date, name_he, name_en, category FROM holidays
         WHERE year=$1 AND category LIKE '%holiday%' ORDER BY date`,
        [year]
      ));
    }

    res.json({ holidays: groupHolidayRows(rows) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/holidays/ai-preview', async (req, res) => {
  try {
    const { currentYear, targetYear } = req.body;
    if (!currentYear || !targetYear) return res.status(400).json({ error: 'currentYear and targetYear required' });

    // Ensure both years are cached
    for (const yr of [currentYear, targetYear]) {
      const { rows } = await pool.query('SELECT 1 FROM holidays WHERE year=$1 LIMIT 1', [yr]);
      if (!rows.length) await cacheHolidaysForYear(yr);
    }

    // Get all holidays for both years (not pre-filtered by category)
    const [{ rows: curRows }, { rows: tgtRows }] = await Promise.all([
      pool.query('SELECT date, name_he, name_en, category FROM holidays WHERE year=$1 ORDER BY date', [currentYear]),
      pool.query('SELECT date, name_he, name_en, category FROM holidays WHERE year=$1 ORDER BY date', [targetYear]),
    ]);

    const curGroups = groupHolidayRows(curRows);
    const tgtGroups = groupHolidayRows(tgtRows);

    const curList = curGroups.map(g =>
      `${g.family} (${g.date}${g.date !== g.endDate ? ' – ' + g.endDate : ''})`
    ).join('\n');
    const tgtList = tgtGroups.map(g =>
      `id:${g.family}|${g.nameHe}|${g.date}${g.date !== g.endDate ? '–' + g.endDate : ''}`
    ).join('\n');

    const ALL_LANGS = ['he','en','ru','es','de','it','fr','pt','uk','tr','bg'];
    const LANG_NAMES_MAP = {
      he:'Hebrew',en:'English',ru:'Russian',es:'Spanish',de:'German',
      it:'Italian',fr:'French',pt:'Portuguese',uk:'Ukrainian',tr:'Turkish',bg:'Bulgarian'
    };

    const prompt = `You are building a Jewish holiday calendar for the Bnei Baruch / Kabbalah Learning Institute community (international audience, based in Israel).

${currentYear} had these holidays (for reference):
${curList}

${targetYear} will have these holidays (all hebcal entries):
${tgtList}

Tasks:
1. Select which holidays from the ${targetYear} list should appear on a community calendar. Include: major biblical holidays (Rosh Hashana, Yom Kippur, Sukkot + Shemini Atzeret/Simchat Torah, Chanukah, Purim, Pesach, Shavuot), Israeli national days (Yom HaZikaron, Yom HaAtzmaut, Yom Yerushalayim), and significant dates (Tu BiShvat, Lag BaOmer, Tu B'Av, Tisha B'Av). Skip minor fast days, Rosh Chodesh, weekly parasha entries, and obscure rabbinic additions.
2. For each selected holiday, provide its name in all 11 languages: ${ALL_LANGS.map(l => `${l} (${LANG_NAMES_MAP[l]})`).join(', ')}.

Rules:
- The "id" field must exactly match the id: value from the input list.
- For Hebrew (he): copy the Hebrew text exactly as given after the first | in the input. Do NOT translate or rephrase it. Do NOT add the Hebrew year number.
- For English (en): use the standard short English name (e.g. "Rosh Hashana", not "Rosh Hashana 5788"; "Lag BaOmer" not "33rd of the Omer").
- For other languages: use the standard transliterated or translated name for that language.

Return ONLY valid JSON (no markdown):
{"selected":[{"id":"Rosh Hashana","translations":{"he":"ראש השנה","en":"Rosh Hashana","ru":"Рош а-Шана","es":"Rosh Hashaná","de":"Rosch ha-Schana","it":"Rosh Hashanà","fr":"Roch Hachana","pt":"Rosh Hashaná","uk":"Рош га-Шана","tr":"Rosh Haşana","bg":"Рош Хашана"}}]}`;

    const aiMsg = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    let selected = [];
    try {
      const text = aiMsg.content[0].text.trim();
      const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      selected = parsed.selected || [];
    } catch (e) {
      console.error('[ai-preview] JSON parse error:', e.message);
    }

    const translationById = Object.fromEntries(selected.map(s => [s.id, s.translations]));
    const selectedIds = new Set(selected.map(s => s.id));

    const suggestions = tgtGroups
      .filter(g => selectedIds.has(g.family))
      .map(grp => ({
        family: grp.family,
        nameHe: grp.nameHe,
        nameEn: grp.nameEn,
        date: grp.date,
        endDate: grp.endDate,
        category: grp.category,
        titles: { ...translationById[grp.family], he: grp.nameHe } || { he: grp.nameHe, en: grp.family },
        type: 'holiday',
      }));

    res.json({ suggestions, targetYear, currentYear });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/holidays/create', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });

    for (const item of items) {
      const isMultiDay = item.endDate && item.date !== item.endDate;
      const type = 'holiday';
      const titles = item.titles || { he: item.nameHe, en: item.nameEn };
      await pool.query(
        `INSERT INTO events (type, date, end_date, start_time, end_time, titles, private)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [type, item.date, isMultiDay ? item.endDate : null,
         item.startTime || '', item.endTime || '', JSON.stringify(titles), false]
      );
    }

    res.json({ created: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Translation ────────────────────────────────────────────────────────────

const LANG_NAMES = {
  he: 'Hebrew', en: 'English', ru: 'Russian', es: 'Spanish',
  de: 'German', it: 'Italian', fr: 'French', pt: 'Portuguese',
  uk: 'Ukrainian', tr: 'Turkish', bg: 'Bulgarian',
};


// ── Bulk delete by generation tag ─────────────────────────────────────────────

router.delete('/generate/:tag', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM events WHERE generation_tag=$1',
      [req.params.tag]
    );
    res.json({ deleted: rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Import events for a convention/holiday from Google Sheet ──────────────────

const HE_MONTHS = {
  'ינואר':1,'פברואר':2,'מרץ':3,'אפריל':4,'מאי':5,'יוני':6,
  'יולי':7,'אוגוסט':8,'ספטמבר':9,'אוקטובר':10,'נובמבר':11,'דצמבר':12,
};

function parseHebrewDate(str) {
  const clean = str.replace(/\*/g, '').trim();
  const comma = clean.indexOf(', ');
  if (comma === -1) return null;
  const [day, monthHe, year] = clean.slice(comma + 2).split(' ');
  const m = HE_MONTHS[monthHe];
  if (!m || !year) return null;
  return `${year}-${String(m).padStart(2,'0')}-${String(parseInt(day)).padStart(2,'0')}`;
}

router.post('/events/import-sheets', async (req, res) => {
  try {
    const { url, parentId } = req.body;
    if (!url || !parentId) return res.status(400).json({ error: 'url and parentId required' });

    const { spreadsheetId, gid } = parseSheetUrl(url);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const resp = await fetch(csvUrl);
    if (!resp.ok) throw new Error(`Sheets fetch failed: ${resp.status} ${resp.statusText}`);
    const text = await resp.text();

    const rows = parseCsv(text);
    if (!rows.length) return res.status(400).json({ error: 'Sheet appears empty' });

    const dataRows = rows[0][0].toLowerCase() === 'date' ? rows.slice(1) : rows;

    // Load templates once for title matching
    const { rows: templates } = await pool.query('SELECT id, titles FROM event_templates');

    let created = 0, updated = 0;

    for (const cols of dataRows) {
      const dateRaw  = (cols[0] || '').trim();
      const startTime = (cols[1] || '').trim();
      const endTime   = (cols[2] || '').trim();
      if (!dateRaw || !startTime) continue;

      const date = parseHebrewDate(dateRaw);
      if (!date) continue;

      const rawTitles = Object.fromEntries(
        ALL_LANGS_ORDERED.map((l, i) => [l, (cols[3 + i] || '').trim()]).filter(([, v]) => v)
      );
      if (!rawTitles.he && !rawTitles.en) continue;

      const titles = await enrichTitles(rawTitles, templates);

      // Upsert by (parentId, date, startTime)
      const { rows: existing } = await pool.query(
        `SELECT id FROM events WHERE parent_id=$1 AND date=$2 AND start_time=$3`,
        [parentId, date, startTime]
      );
      if (existing.length) {
        await pool.query(
          `UPDATE events SET titles = titles || $1::jsonb, end_time=$2 WHERE id=$3`,
          [JSON.stringify(titles), endTime, existing[0].id]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO events (type, date, start_time, end_time, titles, private, parent_id)
           VALUES ('regular',$1,$2,$3,$4,false,$5)`,
          [date, startTime, endTime, JSON.stringify(titles), parentId]
        );
        created++;
      }
    }

    res.json({ created, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Import templates from Google Sheet ────────────────────────────────────────

function parseSheetUrl(url) {
  const m = url.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!m) throw new Error('Could not parse spreadsheet ID from URL');
  const spreadsheetId = m[1];
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return { spreadsheetId, gid };
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else field += ch;
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return rows.filter(r => r.some(c => c));
}

router.post('/templates/import-sheets', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });

    const { spreadsheetId, gid } = parseSheetUrl(url);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const resp = await fetch(csvUrl);
    if (!resp.ok) throw new Error(`Sheets fetch failed: ${resp.status} ${resp.statusText}`);
    const text = await resp.text();

    const rows = parseCsv(text);
    if (!rows.length) return res.status(400).json({ error: 'Sheet appears empty' });

    // Detect header row (first row containing 'name' or Hebrew column)
    const dataRows = rows[0][0].toLowerCase() === 'name' ? rows.slice(1) : rows;

    const ALL_LANGS = ['he','en','ru','es','de','it','fr','pt','uk','tr','bg'];
    let created = 0, updated = 0;

    for (const cols of dataRows) {
      const name = cols[0];
      if (!name) continue;
      const startTime = cols[1] || '';
      const endTime   = cols[2] || '';
      // Only include non-empty values so blank sheet cells don't wipe existing translations
      const titles = Object.fromEntries(
        ALL_LANGS.map((l, i) => [l, (cols[3 + i] || '').trim()]).filter(([, v]) => v)
      );

      const { rows: existing } = await pool.query(
        'SELECT id FROM event_templates WHERE name=$1', [name]
      );
      if (existing.length) {
        await pool.query(
          `UPDATE event_templates
             SET titles = titles || $1::jsonb,
                 default_start_time = CASE WHEN $2 <> '' THEN $2 ELSE default_start_time END,
                 default_end_time   = CASE WHEN $3 <> '' THEN $3 ELSE default_end_time   END
           WHERE name = $4`,
          [titles, startTime, endTime, name]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO event_templates (name, titles, default_start_time, default_end_time, private_by_default, type)
           VALUES ($1,$2,$3,$4,false,'regular')`,
          [name, titles, startTime, endTime]
        );
        created++;
      }
    }

    res.json({ created, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
