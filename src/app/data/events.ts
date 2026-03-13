export type EventType = 'regular' | 'conference' | 'holiday';

export interface Event {
  id: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, for multi-day events
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: {
    he: string;
    en: string;
    ru: string;
    es: string;
  };
  description?: {
    he: string;
    en: string;
    ru: string;
    es: string;
  };
  location?: string;
  studyLink?: string;
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
