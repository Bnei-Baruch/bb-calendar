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
  _db?: boolean;
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
