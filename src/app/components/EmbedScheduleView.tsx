import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useEvents } from '../context/EventsContext';
import { getEventById } from '../data/events';
import { isEmbedTheme, DEFAULT_EMBED_THEME } from '../data/embedThemes';
import { ConventionSchedule } from './ConventionSchedule';
import type { Language } from '../utils/i18n';

const SUPPORTED_LANGS: Language[] = ['he', 'en', 'ru', 'es', 'de', 'it', 'fr', 'pt', 'uk', 'tr', 'bg'];

export function EmbedScheduleView() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const { events: allEvents } = useEvents();
  const rootRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef(0);

  const themeParam = searchParams.get('theme');
  const theme = isEmbedTheme(themeParam) ? themeParam : DEFAULT_EMBED_THEME;

  const langParam = searchParams.get('lang') as Language | null;
  const language: Language = langParam && SUPPORTED_LANGS.includes(langParam) ? langParam : 'he';

  const event = eventId ? getEventById(allEvents, eventId) : undefined;

  useEffect(() => {
    const postHeight = () => {
      const el = rootRef.current;
      if (!el) return;
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h && h !== lastHeightRef.current) {
        lastHeightRef.current = h;
        try {
          window.parent.postMessage({ type: 'bb-schedule-height', height: h }, '*');
        } catch {
          // parent may reject cross-origin postMessage in some sandboxes; nothing more to do
        }
      }
    };
    postHeight();
    const ro = new ResizeObserver(postHeight);
    if (rootRef.current) ro.observe(rootRef.current);
    const interval = setInterval(postHeight, 500);
    return () => {
      ro.disconnect();
      clearInterval(interval);
    };
  }, []);

  if (!event) {
    return (
      <div ref={rootRef} style={{ padding: 24, textAlign: 'center', fontFamily: 'sans-serif', color: '#6b7280' }}>
        Event not found
      </div>
    );
  }

  return (
    <div ref={rootRef} style={{ padding: 16 }}>
      <ConventionSchedule
        event={event}
        allEvents={allEvents}
        language={language}
        chrome={false}
        theme={theme}
      />
    </div>
  );
}
