import { Event } from '../data/events';
import { Language } from './i18n';

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function nextDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + 1);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

export function generateICS(event: Event, language: Language): string {
  const title = event.title[language] || event.title.en;
  const description = event.description?.[language] || '';
  const location = event.location || '';
  const uid = `${event.id}@cal.kli.one`;
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const start = event.date.replace(/-/g, '');
  const endBase = event.endDate && event.endDate !== event.date ? event.endDate : event.date;
  const end = nextDayStr(endBase);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KLI Calendar//cal.kli.one//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeICS(title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`);
  if (location) lines.push(`LOCATION:${escapeICS(location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(event: Event, language: Language): void {
  const ics = generateICS(event, language);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `${(event.title.en || event.id).replace(/[^a-z0-9]/gi, '_')}.ics`;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    // On iOS, window.open with a .ics blob triggers the native Calendar app
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function getGoogleCalendarUrl(event: Event, language: Language): string {
  const title = event.title[language] || event.title.en;
  const description = event.description?.[language] || '';
  const location = event.location || '';
  const start = event.date.replace(/-/g, '');
  const endBase = event.endDate && event.endDate !== event.date ? event.endDate : event.date;
  const end = nextDayStr(endBase);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}`, details: description, location });
  return `https://calendar.google.com/calendar/render?${params}`;
}
