import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { Event } from '../data/events';
import keycloak from '../../keycloak';
import { useTimezone } from './TimezoneContext';
import { convertFromIsrael, ISRAEL_TZ } from '../utils/timezone';

interface EventsContextValue {
  events: Event[];
  loading: boolean;
  refetch: () => void;
}

const EventsContext = createContext<EventsContextValue>({ events: [], loading: true, refetch: () => {} });

const POLL_MS = 10 * 60 * 1000;

/** Event times are stored in Israel time; shift timed single-day events into the display zone. */
function convertEvents(list: Event[], tz: string): Event[] {
  if (tz === ISRAEL_TZ) return list;
  return list.map(e => {
    if (e.type === 'conference' || e.type === 'holiday') return e;
    if (e.endDate && e.endDate !== e.date) return e;
    if (!e.startTime || !e.endTime || e.startTime === e.endTime) return e;
    const s = convertFromIsrael(e.date, e.startTime, tz);
    const en = convertFromIsrael(e.date, e.endTime, tz);
    return { ...e, date: s.date, startTime: s.time, endTime: en.time, _orig: e };
  });
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [rawEvents, setEvents] = useState<Event[]>([]);
  const { effectiveTz } = useTimezone();
  const events = useMemo(() => convertEvents(rawEvents, effectiveTz), [rawEvents, effectiveTz]);
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
