import type { Language } from '../utils/i18n';
import { getTodayInTz } from '../utils/timezone';

export type EventType = 'regular' | 'conference' | 'holiday' | 'special';

export interface Event {
  id: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  endDate?: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: Partial<Record<Language, string>>;
  description?: Partial<Record<Language, string>>;
  location?: string;
  studyLink?: string;
  private?: boolean;
  parentId?: string;
  scope?: 'global' | 'local' | 'ten';
  _db?: boolean;
  createdByRole?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceEnd?: string;
  recurrenceId?: string;
  recurrenceDays?: string;
  /** Set when times were converted to the user's time zone: the untouched Israel-time event (use for editing). */
  _orig?: Event;
}

/** Event as stored (Israel time) — pass this to admin edit forms. */
export function rawEvent<T extends Event>(e: T): Event {
  return e._orig ?? e;
}

export function getEventTitle(event: Event, language: Language): string {
  return event.title[language] || event.title.en || event.title.he || '';
}

export function getEventDescription(event: Event, language: Language): string {
  return event.description?.[language] || event.description?.en || event.description?.he || '';
}

/** Description as share-text lines: bulleted when it has several lines. */
export function getDescriptionShareLines(event: Event, language: Language): string[] {
  const lines = (event.description?.[language] ?? '').split('\n').map(l => l.trim()).filter(Boolean);
  return lines.length > 1 ? lines.map(l => `• ${l}`) : lines;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getEventsByDate(allEvents: Event[], date: string): Event[] {
  return allEvents
    .filter(e => e.date === date)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

export function getEventById(allEvents: Event[], id: string): Event | undefined {
  return allEvents.find(e => e.id === id);
}

/** Today's date (YYYY-MM-DD) in the user's selected time zone (Israel until chosen). */
export function getIsraelToday(): string {
  return getTodayInTz();
}

export function getContainerSchedule(allEvents: Event[], event: Event): Record<string, Event[]> {
  const isMultiDay = !!(event.endDate && event.endDate !== event.date);
  const endRange = isMultiDay ? event.endDate! : event.date;

  const byDate: Record<string, Event[]> = {};
  let d = event.date;
  while (d <= endRange) {
    byDate[d] = [];
    const [yy, mm, dd] = d.split('-').map(Number);
    const next = new Date(Date.UTC(yy, mm - 1, dd + 1));
    d = next.toISOString().split('T')[0];
  }

  const isContainer = event.type === 'conference' || event.type === 'holiday';
  allEvents
    .filter(e =>
      // children of a container may shift outside its range after time zone conversion
      ((isContainer && e.parentId === event.id) || (e.date >= event.date && e.date <= endRange)) &&
      e.id !== event.id &&
      !(e.endDate && e.endDate !== e.date) &&
      (isContainer ? e.parentId === event.id : !e.parentId)
    )
    .forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

  Object.keys(byDate).forEach(date => {
    byDate[date].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  });

  return byDate;
}

export function getMonthEvents(allEvents: Event[], year: number, month: number): Map<string, Event[]> {
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  const monthEvents = allEvents.filter(e => e.date.startsWith(prefix));
  const eventsByDay = new Map<string, Event[]>();

  monthEvents.forEach(event => {
    const existing = eventsByDay.get(event.date) || [];
    eventsByDay.set(event.date, [...existing, event]);
  });

  return eventsByDay;
}
