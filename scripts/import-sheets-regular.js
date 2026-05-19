#!/usr/bin/env node
// One-time script: import future regular events from the Sheets cache into the DB.
// Auto-completes missing language translations from templates, then Claude API.
// Run with: node scripts/import-sheets-regular.js
// Dry-run:  node scripts/import-sheets-regular.js --dry-run

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const BACKFILL = process.argv.includes('--backfill');

const CACHE_FILE = join(__dirname, '../data/events.json');
const ALL_LANGS = ['he', 'en', 'ru', 'es', 'de', 'it', 'fr', 'pt', 'uk', 'tr', 'bg'];
const LANG_NAMES = { he: 'Hebrew', en: 'English', ru: 'Russian', es: 'Spanish', de: 'German', it: 'Italian', fr: 'French', pt: 'Portuguese', uk: 'Ukrainian', tr: 'Turkish', bg: 'Bulgarian' };

const { Pool, types } = pg;
types.setTypeParser(1082, v => v);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bb_calendar:changeme@127.0.0.1:5432/bb_calendar',
});

function israelToday() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jerusalem' }).slice(0, 10);
}

// Find best matching template by comparing he/en title
function findTemplate(titles, templates) {
  const heTitle = (titles.he || '').trim().toLowerCase();
  const enTitle = (titles.en || '').trim().toLowerCase();
  for (const t of templates) {
    const tHe = (t.titles.he || '').trim().toLowerCase();
    const tEn = (t.titles.en || '').trim().toLowerCase();
    if ((heTitle && tHe && heTitle === tHe) || (enTitle && tEn && enTitle === tEn)) {
      return t;
    }
  }
  return null;
}

// Translate missing langs via Claude API
async function translateMissing(titles, missingLangs) {
  if (!missingLangs.length) return {};
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sourceLang = titles.he ? 'he' : titles.en ? 'en' : 'ru';
  const sourceText = titles[sourceLang];
  const targetList = missingLangs.map(l => `${l} (${LANG_NAMES[l]})`).join(', ');

  const prompt = `Translate the following short event title from ${LANG_NAMES[sourceLang]} into these languages: ${targetList}.
This is for a Jewish educational community calendar (Bnei Baruch / Kabbalah). Preserve proper nouns like "Kabbalah", "Zohar", "Bnei Baruch".
Output one translation per line in the exact format: LANGCODE|translation
Do not include any other text, explanation, or punctuation outside the lines.
Example:
de|Morgenstunde
uk|Ранковий урок

Text to translate:
${sourceText}`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const result = {};
  for (const line of message.content[0].text.trim().split('\n')) {
    const pipe = line.indexOf('|');
    if (pipe === -1) continue;
    const lang = line.slice(0, pipe).trim();
    const val = line.slice(pipe + 1).trim();
    if (lang && val && missingLangs.includes(lang)) result[lang] = val;
  }
  return result;
}

async function enrichTitles(titles, templates) {
  const full = { ...titles };
  const missing = ALL_LANGS.filter(l => !full[l]);
  if (!missing.length) return full;

  // 1. Fill from matching template
  const tmpl = findTemplate(titles, templates);
  if (tmpl) {
    for (const l of missing) {
      if (tmpl.titles[l]) full[l] = tmpl.titles[l];
    }
  }

  // 2. Translate remaining via Claude
  const stillMissing = ALL_LANGS.filter(l => !full[l]);
  if (stillMissing.length && process.env.ANTHROPIC_API_KEY) {
    try {
      const translated = await translateMissing(full, stillMissing);
      Object.assign(full, translated);
    } catch (err) {
      console.warn(`  ⚠ Translation failed: ${err.message}`);
    }
  }

  return full;
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

  // Load templates for title matching
  const { rows: templates } = await pool.query('SELECT id, titles FROM event_templates');
  console.log(`Loaded ${templates.length} templates for title matching`);

  // Check which IDs already exist in DB (with their current titles)
  const ids = toImport.map(e => e.id);
  const { rows: existing } = await pool.query(
    'SELECT id, titles FROM events WHERE id = ANY($1)', [ids]
  );
  const existingMap = new Map(existing.map(r => [r.id, r.titles]));
  console.log(`Already in DB: ${existingMap.size}`);

  const toInsert = toImport.filter(e => !existingMap.has(e.id));
  const toBackfill = BACKFILL
    ? toImport.filter(e => existingMap.has(e.id) && ALL_LANGS.some(l => !existingMap.get(e.id)?.[l]))
    : [];

  console.log(`Will import: ${toInsert.length}`);
  if (BACKFILL) console.log(`Will backfill missing translations: ${toBackfill.length}`);

  if (toInsert.length === 0 && toBackfill.length === 0) {
    console.log('Nothing to do.');
    await pool.end();
    return;
  }

  if (DRY_RUN) {
    toInsert.slice(0, 5).forEach(e =>
      console.log(`  [new]      ${e.id}  ${e.date}  ${e.title?.he || e.title?.en}`)
    );
    if (toInsert.length > 5) console.log(`  ... and ${toInsert.length - 5} more new`);
    toBackfill.slice(0, 5).forEach(e => {
      const missing = ALL_LANGS.filter(l => !existingMap.get(e.id)?.[l]);
      console.log(`  [backfill] ${e.id}  ${e.date}  ${e.title?.he || e.title?.en}  missing: ${missing.join(',')}`);
    });
    if (toBackfill.length > 5) console.log(`  ... and ${toBackfill.length - 5} more to backfill`);
    await pool.end();
    return;
  }

  let imported = 0, backfilled = 0, failed = 0, fromTemplate = 0, fromClaude = 0;

  for (const e of toInsert) {
    try {
      const originalLangs = Object.keys(e.title || {}).filter(l => e.title[l]);
      const fullTitles = await enrichTitles(e.title || {}, templates);
      const addedLangs = ALL_LANGS.filter(l => fullTitles[l] && !originalLangs.includes(l));
      if (addedLangs.length) {
        if (findTemplate(e.title || {}, templates)) fromTemplate++; else fromClaude++;
        console.log(`  [new] ${e.id} ${e.date} [${e.title?.he || e.title?.en}] +${addedLangs.join(',')}`);
      }
      await pool.query(
        `INSERT INTO events (id, type, date, end_date, start_time, end_time, titles, descriptions, private, generation_tag)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [e.id, e.type, e.date, e.endDate || null, e.startTime || '', e.endTime || '',
         JSON.stringify(fullTitles), e.description ? JSON.stringify(e.description) : null, false, 'sheets-import']
      );
      imported++;
    } catch (err) {
      console.error(`Failed ${e.id}:`, err.message);
      failed++;
    }
  }

  for (const e of toBackfill) {
    try {
      const currentTitles = existingMap.get(e.id) || {};
      const merged = { ...e.title, ...currentTitles }; // DB wins for existing langs
      const fullTitles = await enrichTitles(merged, templates);
      const addedLangs = ALL_LANGS.filter(l => fullTitles[l] && !currentTitles[l]);
      if (!addedLangs.length) continue;
      if (findTemplate(merged, templates)) fromTemplate++; else fromClaude++;
      console.log(`  [backfill] ${e.id} ${e.date} [${merged.he || merged.en}] +${addedLangs.join(',')}`);
      await pool.query(
        `UPDATE events SET titles = $1::jsonb WHERE id = $2`,
        [JSON.stringify(fullTitles), e.id]
      );
      backfilled++;
    } catch (err) {
      console.error(`Backfill failed ${e.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\nDone. Imported: ${imported}, backfilled: ${backfilled}, failed: ${failed}`);
  console.log(`Translations enriched — from templates: ${fromTemplate}, from Claude: ${fromClaude}`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
