import type { Language } from '../utils/i18n';

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
  scope?: 'global' | 'local';
  _db?: boolean;
  createdByRole?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceEnd?: string;
  recurrenceId?: string;
  recurrenceDays?: string;
}

export function getEventTitle(event: Event, language: Language): string {
  return event.title[language] || event.title.en || event.title.he || '';
}

export function getEventDescription(event: Event, language: Language): string {
  return event.description?.[language] || event.description?.en || event.description?.he || '';
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

export function getIsraelToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function getContainerSchedule(allEvents: Event[], event: Event): Record<string, Event[]> {
  const isMultiDay = !!(event.endDate && event.endDate !== event.date);
  const endRange = isMultiDay ? event.endDate! : event.date;

  const byDate: Record<string, Event[]> = {};
  let d = event.date;
  while (d <= endRange) {
    byDate[d] = [];
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    d = next.toISOString().split('T')[0];
  }

  const isContainer = event.type === 'conference' || event.type === 'holiday';
  allEvents
    .filter(e =>
      e.date >= event.date &&
      e.date <= endRange &&
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
