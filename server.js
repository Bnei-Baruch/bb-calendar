import express from 'express';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const CACHE_FILE = join(__dirname, 'data', 'events.json');
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SHEET_ID = '1ewi5NfWbl7qRM4Sn4r4eN7lgA4czgU1w9CyWhIBGBcs';
const KEY_FILE = join(__dirname, 'bb-calendar-488901-6a4730c846cc.json');
const SHEET_TAB = 'לו"ז';

let lastFetched = 0;

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseRows(rows) {
  // rows[0] is the header row — skip it
  const dataRows = rows.slice(1);
  const events = [];
  let idCounter = 1;

  for (const cols of dataRows) {
    // Sheets API returns rows as arrays (0-indexed from col A):
    // 0-3: calendar IDs (A-D, skip)
    // 4: start date (E), 5: end date (F), 6: start time (G), 7: end time (H)
    // 8-11: display flags I-L (skip)
    // 12: Hebrew title (M), 13: English (N), 14: Russian (O), 15: Spanish (P)
    // 16: Hebrew details (Q), 17: English details (R), 18: Russian details (S), 19: Spanish details (T)
    if (!cols || cols.length < 13) continue;

    const startDate = parseDate(cols[4]);
    if (!startDate) continue;

    const endDate = parseDate(cols[5]) || startDate;
    const startTime = (cols[6] || '').trim();
    const endTime = (cols[7] || '').trim();
    const titleHe = (cols[12] || '').trim();
    const titleEn = (cols[13] || '').trim();
    const titleRu = (cols[14] || '').trim();
    const titleEs = (cols[15] || '').trim();
    const detailsHe = (cols[16] || '').trim();
    const detailsEn = (cols[17] || '').trim();
    const detailsRu = (cols[18] || '').trim();
    const detailsEs = (cols[19] || '').trim();

    if (!titleHe && !titleEn) continue;

    const isMultiDay = startDate !== endDate;
    const type = isMultiDay ? 'conference' : 'regular';

    const event = {
      id: `ev-${idCounter++}`,
      type,
      date: startDate,
      endDate: isMultiDay ? endDate : undefined,
      startTime,
      endTime,
      title: { he: titleHe, en: titleEn, ru: titleRu, es: titleEs },
    };

    if (detailsHe || detailsEn) {
      event.description = { he: detailsHe, en: detailsEn, ru: detailsRu, es: detailsEs };
    }

    events.push(event);
  }

  return events;
}

async function fetchAndCache() {
  console.log('[cache] Fetching from Google Sheets (service account)...');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_TAB,
  });
  const rows = res.data.values || [];
  const events = parseRows(rows);

  if (!existsSync(join(__dirname, 'data'))) {
    mkdirSync(join(__dirname, 'data'));
  }
  writeFileSync(CACHE_FILE, JSON.stringify(events, null, 2), 'utf-8');
  lastFetched = Date.now();
  console.log(`[cache] Cached ${events.length} events`);
  return events;
}

async function getEvents() {
  const now = Date.now();
  const isCacheStale = now - lastFetched > CACHE_TTL_MS;

  if (!isCacheStale && existsSync(CACHE_FILE)) {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  }

  try {
    return await fetchAndCache();
  } catch (err) {
    console.error('[cache] Fetch failed:', err.message);
    // Fall back to stale cache if available
    if (existsSync(CACHE_FILE)) {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    }
    return [];
  }
}

app.use(express.json());

app.get('/api/events', async (req, res) => {
  try {
    const events = await getEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Warm cache on startup
getEvents().catch(console.error);

app.listen(PORT, () => {
  console.log(`[server] API running at http://localhost:${PORT}`);
});
