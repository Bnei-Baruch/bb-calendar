import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Event } from '../data/events';

interface EventsContextValue {
  events: Event[];
  loading: boolean;
}

const EventsContext = createContext<EventsContextValue>({ events: [], loading: true });

const POLL_MS = 10 * 60 * 1000;

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch('/api/events')
        .then(r => r.json())
        .then(data => { setEvents(data); setLoading(false); })
        .catch(() => setLoading(false));

    load();

    const interval = setInterval(load, POLL_MS);

    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <EventsContext.Provider value={{ events, loading }}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  return useContext(EventsContext);
}
