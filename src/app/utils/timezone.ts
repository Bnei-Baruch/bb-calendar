export const ISRAEL_TZ = 'Asia/Jerusalem';

export interface QuickZone { key: string; label: string; tz: string }

/** Zones offered at the top of the picker. 'local' is resolved from the browser. */
export const QUICK_ZONES: QuickZone[] = [
  { key: 'local', label: 'Local', tz: 'local' },
  { key: 'israel', label: 'Israel', tz: ISRAEL_TZ },
  { key: 'et', label: 'Eastern Time (ET)', tz: 'America/New_York' },
  { key: 'ct', label: 'Central Time (CT)', tz: 'America/Chicago' },
  { key: 'mt', label: 'Mountain Time (MT)', tz: 'America/Denver' },
  { key: 'pt', label: 'Pacific Time (PT)', tz: 'America/Los_Angeles' },
];

export function resolveTz(tz: string): string {
  if (tz === 'local') {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ISRAEL_TZ; } catch { return ISRAEL_TZ; }
  }
  return tz;
}

const ISRAEL_ALIASES = new Set([ISRAEL_TZ, 'Asia/Tel_Aviv', 'Israel']);
export function isIsraelZone(tz: string): boolean {
  return ISRAEL_ALIASES.has(tz);
}

let activeTz = ISRAEL_TZ;
/** Set by TimezoneProvider; lets non-React helpers (getIsraelToday) follow the user's zone. */
export function setActiveTimezone(tz: string) { activeTz = tz; }
export function getActiveTimezone() { return activeTz; }

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function parts(ts: number, tz: string) {
  const o: Record<string, number> = {};
  for (const p of partsFormatter(tz).formatToParts(new Date(ts))) {
    if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
  }
  return o;
}

const pad = (n: number) => String(n).padStart(2, '0');

function offsetMs(ts: number, tz: string): number {
  const p = parts(ts, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ts / 60000) * 60000;
}

/** Convert an Israel wall-clock date (YYYY-MM-DD) + time (HH:mm) into `toTz` wall-clock. */
export function convertFromIsrael(date: string, time: string, toTz: string): { date: string; time: string } {
  if (toTz === ISRAEL_TZ) return { date, time };
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h || 0, mi || 0);
  let utc = guess - offsetMs(guess, ISRAEL_TZ);
  utc = guess - offsetMs(utc, ISRAEL_TZ); // second pass settles DST boundaries
  const p = parts(utc, toTz);
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

export function getTodayInTz(tz: string = activeTz): string {
  const p = parts(Date.now(), tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function getUtcOffsetLabel(tz: string): string {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: resolveTz(tz), timeZoneName: 'shortOffset' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
    return name.replace('GMT', 'UTC');
  } catch { return ''; }
}

export function getAllTimeZones(): string[] {
  try {
    const f = (Intl as any).supportedValuesOf;
    if (typeof f === 'function') return f('timeZone') as string[];
  } catch { /* fall through */ }
  return QUICK_ZONES.filter(z => z.tz !== 'local').map(z => z.tz);
}

export function cityLabel(tz: string): string {
  return tz.split('/').slice(1).join(' / ').replace(/_/g, ' ') || tz;
}

/** Short label for the trigger button. */
export function shortZoneLabel(tz: string, localLabel: string): string {
  if (tz === 'local') return localLabel;
  if (tz === ISRAEL_TZ) return 'IST';
  const q = QUICK_ZONES.find(z => z.tz === tz);
  const m = q?.label.match(/\((\w+)\)/);
  return m ? m[1] : cityLabel(tz);
}
