import express from 'express';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const CACHE_FILE = join(__dirname, 'data', 'events.json');
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const TG_API_ID = 36986128;
const TG_API_HASH = 'b1a1bf07bca5f6f56c09edbfb1051b95';
const TG_CHANNEL_ID = BigInt(3580881638);
const SESSION_FILE = join(__dirname, 'telegram-session.txt');
const POSTS_CACHE_FILE = join(__dirname, 'data', 'posts.json');
const MEDIA_DIR = join(__dirname, 'data', 'media');
const MEDIA_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let tgClient = null;
let tgChannelEntity = null;
let postsLastFetched = 0;
const SHEET_ID = '1ewi5NfWbl7qRM4Sn4r4eN7lgA4czgU1w9CyWhIBGBcs';
const KEY_FILE = join(__dirname, 'bb-calendar-488901-6a4730c846cc.json');
const SHEET_TAB = 'לו"ז';

let lastFetched = 0;
let studyLinksCache = [];
let studyLastFetched = 0;

function timeToMin(t) {
  if (!t) return -1;
  const [h, m] = t.replace(/^0/, '').split(':').map(Number);
  return h * 60 + (m || 0);
}

async function fetchStudyLinks() {
  const now = Date.now();
  if (now - studyLastFetched < CACHE_TTL_MS && studyLinksCache.length > 0) {
    return studyLinksCache;
  }
  try {
    const res = await fetch('https://study.kli.one/api/events?public=true&language=he');
    const data = await res.json();
    const list = [];
    for (const e of (data.events || [])) {
      list.push({
        date: e.date.split('T')[0],
        startMin: timeToMin(e.start_time),
        endMin: timeToMin(e.end_time),
        link: 'https://study.kli.one/?event=' + e.id,
      });
    }
    studyLinksCache = list;
    studyLastFetched = now;
    console.log('[study] Cached ' + list.length + ' study events');
  } catch (err) {
    console.error('[study] Fetch failed:', err.message);
  }
  return studyLinksCache;
}

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

function cleanupOldMedia() {
  if (!existsSync(MEDIA_DIR)) return;
  const now = Date.now();
  let deleted = 0;
  for (const file of readdirSync(MEDIA_DIR)) {
    const filePath = join(MEDIA_DIR, file);
    if (now - statSync(filePath).mtimeMs > MEDIA_MAX_AGE_MS) {
      unlinkSync(filePath);
      deleted++;
    }
  }
  if (deleted > 0) console.log(`[media] Deleted ${deleted} old file(s)`);
}

async function downloadPostPhoto(client, message) {
  const mediaPath = join(MEDIA_DIR, `${message.id}.jpg`);
  if (existsSync(mediaPath)) return true;
  try {
    if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });
    const buffer = await client.downloadMedia(message, { workers: 1 });
    if (buffer && buffer.length > 0) {
      writeFileSync(mediaPath, buffer);
      return true;
    }
  } catch (e) {
    console.error(`[media] Failed to download post ${message.id}:`, e.message);
  }
  return false;
}

async function getTgClient() {
  if (tgClient && tgClient.connected) return tgClient;
  const sessionStr = existsSync(SESSION_FILE) ? readFileSync(SESSION_FILE, 'utf-8').trim() : '';
  const client = new TelegramClient(new StringSession(sessionStr), TG_API_ID, TG_API_HASH, {
    connectionRetries: 3,
  });
  client.setLogLevel('error');
  await client.connect();
  tgClient = client;
  return client;
}

async function fetchTelegramPosts() {
  const now = Date.now();
  if (now - postsLastFetched < CACHE_TTL_MS && existsSync(POSTS_CACHE_FILE)) {
    return JSON.parse(readFileSync(POSTS_CACHE_FILE, 'utf-8'));
  }
  try {
    const client = await getTgClient();

    if (!tgChannelEntity) {
      tgChannelEntity = await client.getEntity(new Api.PeerChannel({ channelId: TG_CHANNEL_ID }));
      console.log('[telegram] Resolved channel:', tgChannelEntity.title);
    }

    const messages = await client.getMessages(tgChannelEntity, { limit: 50 });

    const posts = [];
    for (const m of messages) {
      const isPhoto = m.media?.className === 'MessageMediaPhoto';
      const hasText = !!(m.message?.trim());
      if (!hasText && !isPhoto) continue;

      let mediaUrl = null;
      if (isPhoto) {
        const ok = await downloadPostPhoto(client, m);
        if (ok) mediaUrl = `/api/posts/media/${m.id}`;
      }

      posts.push({
        id: m.id,
        text: m.message || '',
        date: new Date(m.date * 1000).toISOString(),
        mediaUrl,
      });
    }

    if (!existsSync(join(__dirname, 'data'))) mkdirSync(join(__dirname, 'data'));
    writeFileSync(POSTS_CACHE_FILE, JSON.stringify(posts, null, 2), 'utf-8');
    postsLastFetched = now;
    console.log(`[telegram] Cached ${posts.length} posts`);
    return posts;
  } catch (err) {
    console.error('[telegram] Fetch failed:', err.message);
    if (existsSync(POSTS_CACHE_FILE)) {
      return JSON.parse(readFileSync(POSTS_CACHE_FILE, 'utf-8'));
    }
    return [];
  }
}

app.use(express.json());

app.get('/api/events', async (req, res) => {
  try {
    const [events, studyLinks] = await Promise.all([getEvents(), fetchStudyLinks()]);
    const enriched = events.map(e => {
      const eMin = timeToMin(e.startTime);
      const match = studyLinks.find(s =>
        s.date === e.date && eMin >= s.startMin && (s.endMin < 0 || eMin < s.endMin)
      );
      return match ? Object.assign({}, e, { studyLink: match.link }) : e;
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ics/:eventId', async (req, res) => {
  try {
    const events = await getEvents();
    const event = events.find(e => e.id === req.params.eventId);
    if (!event) return res.status(404).send('Event not found');

    const lang = req.query.lang || 'en';
    const title = (event.title[lang] || event.title.en || '').replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n');
    const description = ((event.description?.[lang] || event.description?.en || '')).replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n');
    const location = (event.location || '').replace(/[\\;,]/g, '\\$&');

    const fmtDate = d => d.replace(/-/g, '');
    const nextDay = d => {
      const [y, m, day] = d.split('-').map(Number);
      const dt = new Date(y, m - 1, day + 1);
      return `${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}`;
    };
    const start = fmtDate(event.date);
    const endBase = event.endDate && event.endDate !== event.date ? event.endDate : event.date;
    const end = nextDay(endBase);
    const now = new Date().toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z';

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//KLI Calendar//cal.kli.one//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@cal.kli.one`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${title}`,
    ];
    if (description) lines.push(`DESCRIPTION:${description}`);
    if (location) lines.push(`LOCATION:${location}`);
    lines.push('END:VEVENT', 'END:VCALENDAR');

    const filename = `${(event.title.en || event.id).replace(/[^a-z0-9]/gi, '_')}.ics`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\r\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/media/:id', (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).end();
  const filePath = join(MEDIA_DIR, `${id}.jpg`);
  if (!existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

// In-memory cache for audio resolution (content units don't change)
const audioResolveCache = new Map();

function parseMSec(timeStr) {
  if (!timeStr) return null;
  const m = timeStr.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return null;
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0');
}

app.get('/api/resolve-audio', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' });

  if (audioResolveCache.has(url)) return res.json(audioResolveCache.get(url));

  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/cu\/([A-Za-z0-9]+)/);
    if (!match) return res.status(404).json({ error: 'No unit ID in URL' });
    const unitId = match[1];

    const apiResp = await fetch(
      `https://kabbalahmedia.info/backend/content_units?id=${unitId}&with_files=true`
    );
    if (!apiResp.ok) throw new Error(`API error: ${apiResp.status}`);
    const data = await apiResp.json();

    const unit = data.content_units?.[0];
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const audioFile = unit.files?.find(f => f.language === 'he' && f.type === 'audio' && !f.is_hls);
    if (!audioFile) return res.status(404).json({ error: 'No Hebrew audio found' });

    const result = {
      audioUrl: `https://cdn.kabbalahmedia.info/${audioFile.id}`,
      name: unit.name || audioFile.name,
      duration: audioFile.duration,
      startSec: parseMSec(urlObj.searchParams.get('sstart')),
      endSec: parseMSec(urlObj.searchParams.get('send')),
    };

    audioResolveCache.set(url, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts', async (_req, res) => {
  try {
    const posts = await fetchTelegramPosts();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Warm cache on startup
getEvents().catch(console.error);
fetchTelegramPosts().catch(err => console.error('[telegram] Startup warm failed:', err.message));

// Cleanup old media on startup and daily
cleanupOldMedia();
setInterval(cleanupOldMedia, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`[server] API running at http://localhost:${PORT}`);
});
