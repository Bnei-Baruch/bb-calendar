import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Event } from '../data/events';
import keycloak from '../../keycloak';

interface EventsContextValue {
  events: Event[];
  loading: boolean;
  refetch: () => void;
}

const EventsContext = createContext<EventsContextValue>({ events: [], loading: true, refetch: () => {} });

const POLL_MS = 10 * 60 * 1000;

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      if (keycloak.authenticated) await keycloak.updateToken(30);
      const headers: Record<string, string> = {};
      if (keycloak.token) headers['Authorization'] = `Bearer ${keycloak.token}`;
      const data = await fetch('/api/events', { headers }).then(r => r.json());
      setEvents(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const interval = setInterval(load, POLL_MS);

    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return <EventsContext.Provider value={{ events, loading, refetch: load }}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  return useContext(EventsContext);
}
