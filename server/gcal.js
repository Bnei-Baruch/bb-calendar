import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_PATH = join(__dirname, '../bb-calendar-488901-6a4730c846cc.json');

const CALENDAR_IDS = {
  he: '21sr1c1r5ab3aqum1elftef6qs@group.calendar.google.com',
  en: '4ntftm9sqt1jid8jasjgsjb7n0@group.calendar.google.com',
  ru: 'noubve6l8fhi83iu4qucd2ekok@group.calendar.google.com',
  es: 'idd92b8cuvqtouhpj11jkb0270@group.calendar.google.com',
};

const TZ = 'Asia/Jerusalem';
const DOW_TOKENS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

let _cal = null;
function getCalendar() {
  if (_cal) return _cal;
  if (!existsSync(KEY_PATH)) throw new Error('GCal service account key not found');
  const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  _cal = google.calendar({ version: 'v3', auth });
  return _cal;
}

function buildRRule(recurrence, recurrenceEnd, recurrenceDays) {
  const until = recurrenceEnd
    ? recurrenceEnd.replace(/-/g, '') + 'T235959Z'
    : '20310101T000000Z';
  if (recurrence === 'daily')   return `RRULE:FREQ=DAILY;UNTIL=${until}`;
  if (recurrence === 'monthly') return `RRULE:FREQ=MONTHLY;UNTIL=${until}`;
  if (recurrence === 'weekly')  return `RRULE:FREQ=WEEKLY;UNTIL=${until}`;
  if (recurrence === 'custom' && recurrenceDays) {
    const byDay = recurrenceDays.split(',').map(n => DOW_TOKENS[Number(n)]).join(',');
    return `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${until}`;
  }
  return null;
}

function buildResource(event) {
  const rrule = event.recurrenceId && event.id === event.recurrenceId
    ? buildRRule(event.recurrence, event.recurrenceEnd, event.recurrenceDays)
    : null;

  return (lang) => {
    const title = event.title?.[lang];
    if (!title) return null;
    const resource = {
      summary: title,
      start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone: TZ },
      end:   { dateTime: `${event.date}T${event.endTime}:00`,   timeZone: TZ },
    };
    if (event.description?.[lang]) resource.description = event.description[lang];
    if (rrule) resource.recurrence = [rrule];
    return resource;
  };
}

export async function gcalCreate(event) {
  if (event.private) return null;
  const cal = getCalendar();
  const makeResource = buildResource(event);
  const ids = {};
  for (const [lang, calId] of Object.entries(CALENDAR_IDS)) {
    const resource = makeResource(lang);
    if (!resource) continue;
    try {
      const res = await cal.events.insert({ calendarId: calId, requestBody: resource });
      ids[lang] = res.data.id;
    } catch (err) {
      console.error(`[gcal] create ${lang} failed for ${event.id}:`, err.message);
    }
  }
  return Object.keys(ids).length ? ids : null;
}

export async function gcalUpdate(event, gcalIds) {
  if (!gcalIds) return null;
  if (event.private) {
    await gcalDelete(gcalIds);
    return null;
  }
  const cal = getCalendar();
  const makeResource = buildResource(event);
  const ids = { ...gcalIds };
  for (const [lang, calId] of Object.entries(CALENDAR_IDS)) {
    const resource = makeResource(lang);
    if (!resource) continue;
    const gcalId = gcalIds[lang];
    try {
      if (gcalId) {
        const res = await cal.events.update({ calendarId: calId, eventId: gcalId, requestBody: resource });
        ids[lang] = res.data.id;
      } else {
        const res = await cal.events.insert({ calendarId: calId, requestBody: resource });
        ids[lang] = res.data.id;
      }
    } catch (err) {
      console.error(`[gcal] update ${lang} failed for ${event.id}:`, err.message);
    }
  }
  return ids;
}

export async function gcalDelete(gcalIds) {
  if (!gcalIds) return;
  const cal = getCalendar();
  for (const [lang, calId] of Object.entries(CALENDAR_IDS)) {
    const gcalId = gcalIds[lang];
    if (!gcalId) continue;
    try {
      await cal.events.delete({ calendarId: calId, eventId: gcalId });
    } catch (err) {
      if (err.status !== 410) console.error(`[gcal] delete ${lang} failed:`, err.message);
    }
  }
}

// Truncate a recurring series UNTIL to the day before cutoffDate
export async function gcalUpdateUntil(gcalIds, cutoffDate) {
  if (!gcalIds) return;
  const cal = getCalendar();
  // new UNTIL = one day before cutoffDate
  const d = new Date(cutoffDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  const until = d.toISOString().slice(0, 10).replace(/-/g, '') + 'T235959Z';

  for (const [lang, calId] of Object.entries(CALENDAR_IDS)) {
    const gcalId = gcalIds[lang];
    if (!gcalId) continue;
    try {
      const existing = await cal.events.get({ calendarId: calId, eventId: gcalId });
      const rules = existing.data.recurrence || [];
      const updated = rules.map(r =>
        r.startsWith('RRULE:') ? r.replace(/;?UNTIL=[^;]+/, '') + `;UNTIL=${until}` : r
      );
      await cal.events.patch({ calendarId: calId, eventId: gcalId, requestBody: { recurrence: updated } });
    } catch (err) {
      console.error(`[gcal] updateUntil ${lang} failed:`, err.message);
    }
  }
}
