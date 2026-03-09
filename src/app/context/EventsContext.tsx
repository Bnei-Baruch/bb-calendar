import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Event } from '../data/events';

interface EventsContextValue {
  events: Event[];
  loading: boolean;
}

const EventsContext = createContext<EventsContextValue>({ events: [], loading: true });

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return <EventsContext.Provider value={{ events, loading }}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  return useContext(EventsContext);
}
