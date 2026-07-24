#!/usr/bin/env node
// Backfill missing language translations for ALL events already in the DB.
// Template match first, then Claude Haiku for remaining.
// Run with: node scripts/backfill-translations.js
// Dry-run:  node scripts/backfill-translations.js --dry-run

import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const DRY_RUN = process.argv.includes('--dry-run');

const ALL_LANGS = ['he', 'en', 'ru', 'es', 'de', 'it', 'fr', 'pt', 'uk', 'tr', 'bg'];
const LANG_NAMES = { he: 'Hebrew', en: 'English', ru: 'Russian', es: 'Spanish', de: 'German', it: 'Italian', fr: 'French', pt: 'Portuguese', uk: 'Ukrainian', tr: 'Turkish', bg: 'Bulgarian' };

const { Pool, types } = pg;
types.setTypeParser(1082, v => v);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://bb_calendar:changeme@127.0.0.1:5432/bb_calendar',
});

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

async function translateMissing(titles, missingLangs) {
  if (!missingLangs.length) return {};
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sourceLang = titles.he ? 'he' : titles.en ? 'en' : 'ru';
  const sourceText = titles[sourceLang];
  const targetList = missingLangs.map(l => `${l} (${LANG_NAMES[l]})`).join(', ');

  const prompt = `Translate the following short event title from ${LANG_NAMES[sourceLang]} into these languages: ${targetList}.
This is for a Jewish educational community calendar (Bnei Baruch / Kabbalah). Preserve proper nouns like "Kabbalah", "Zohar", "Bnei Baruch". For Jewish holidays and concepts, use the standard transliteration in each target language.
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

async function main() {
  console.log(DRY_RUN ? '--- DRY RUN ---' : '--- LIVE RUN ---');

  const { rows: templates } = await pool.query('SELECT id, titles FROM event_templates');
  console.log(`Loaded ${templates.length} templates`);

  // Find all events with at least one missing language
  const { rows: events } = await pool.query(
    `SELECT id, date, titles FROM events
     WHERE ${ALL_LANGS.map(l => `(titles->>'${l}') IS NULL OR (titles->>'${l}') = ''`).join(' OR ')}
     ORDER BY date`
  );
  console.log(`Events with missing translations: ${events.length}`);

  if (events.length === 0) {
    console.log('Nothing to do.');
    await pool.end();
    return;
  }

  let fromTemplate = 0, fromClaude = 0, updated = 0, failed = 0;

  for (const event of events) {
    const titles = event.titles || {};
    const missing = ALL_LANGS.filter(l => !titles[l]);
    if (!missing.length) continue;

    const displayName = titles.he || titles.en || event.id;
    if (DRY_RUN) {
      console.log(`  [${event.id}] ${event.date} [${displayName}] missing: ${missing.join(',')}`);
      continue;
    }

    try {
      const full = { ...titles };

      // 1. Template match
      const tmpl = findTemplate(titles, templates);
      if (tmpl) {
        for (const l of missing) {
          if (tmpl.titles[l]) full[l] = tmpl.titles[l];
        }
      }

      // 2. Claude for remaining
      const stillMissing = ALL_LANGS.filter(l => !full[l]);
      if (stillMissing.length) {
        if (!process.env.ANTHROPIC_API_KEY) {
          console.warn(`  ⚠ No ANTHROPIC_API_KEY — skipping Claude for ${event.id}`);
        } else {
          const translated = await translateMissing(full, stillMissing);
          Object.assign(full, translated);
          fromClaude++;
        }
      } else {
        fromTemplate++;
      }

      const addedLangs = ALL_LANGS.filter(l => full[l] && !titles[l]);
      if (!addedLangs.length) continue;

      console.log(`  [${event.id}] ${event.date} [${displayName}] +${addedLangs.join(',')}`);
      await pool.query('UPDATE events SET titles = $1::jsonb WHERE id = $2', [JSON.stringify(full), event.id]);
      updated++;
    } catch (err) {
      console.error(`  Failed ${event.id}: ${err.message}`);
      failed++;
    }
  }

  if (!DRY_RUN) {
    console.log(`\nDone. Updated: ${updated}, failed: ${failed}`);
    console.log(`From templates: ${fromTemplate}, from Claude: ${fromClaude}`);
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
