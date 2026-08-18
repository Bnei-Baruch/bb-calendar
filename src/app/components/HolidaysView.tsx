import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { Calendar, MapPin, Pencil, Trash2, Plus } from 'lucide-react';
import { AddToCalendarButton } from './AddToCalendarButton';
import { Language, useTranslation } from '../utils/i18n';
import { useEvents } from '../context/EventsContext';
import { Event, getIsraelToday } from '../data/events';
import { isAdmin } from '../admin/AdminGuard';
import { adminApi } from '../admin/adminApi';
import { AddEventModal } from '../admin/AddEventModal';
import type { AdminEvent } from '../admin/adminApi';

const HOLIDAY_KEYWORDS_HE = [
  'פסח', 'סוכות', 'ראש השנה', 'יום כיפור', 'שבועות', 'פורים', 'חנוכה',
  'ל"ג בעומר', 'לג בעומר', 'שמחת תורה', 'שמיני עצרת', 'הושענא רבה',
  'תשעה באב', 'ט"ו בשבט', 'טו בשבט', 'ראש חודש',
  'ליל הסדר', 'שביעי של פסח', 'אחרון של פסח', 'לוז פסח', 'לו"ז פסח',
  'יום השואה', 'שואה ולגבורה', 'יום הזיכרון', 'יום הזכרון',
  'יום העצמאות', 'יום ירושלים', 'ערב יום העצמאות',
];
const HOLIDAY_KEYWORDS_EN = [
  'passover', 'sukkot', 'rosh hashana', 'yom kippur', 'shavuot', 'purim',
  'hanukkah', 'chanukah', "lag b'omer", 'lag baomer', 'simchat torah',
  'shemini atzeret', "tisha b'av", "tu b'shvat", 'rosh chodesh',
  'holocaust', 'remembrance day', 'independence day', 'jerusalem day',
  'memorial day',
];

const MEMORIAL_KEYWORDS_HE = [
  'שואה', 'יום הזיכרון', 'יום הזכרון', 'יום ירושלים', 'יום העצמאות',
];
const MEMORIAL_KEYWORDS_EN = [
  'holocaust', 'remembrance day', 'memorial day', 'independence day', 'jerusalem day',
];

export function isMemorialDay(event: Event): boolean {
  const he = (event.title.he || '').toLowerCase();
  const en = (event.title.en || '').toLowerCase();
  return (
    MEMORIAL_KEYWORDS_HE.some(kw => he.includes(kw.toLowerCase())) ||
    MEMORIAL_KEYWORDS_EN.some(kw => en.includes(kw))
  );
}

export function isHoliday(event: Event): boolean {
  if (event.type === 'holiday') return true;
  const heTitle = (event.title.he || '').toLowerCase();
  const enTitle = (event.title.en || '').toLowerCase();
  return (
    HOLIDAY_KEYWORDS_HE.some(kw => heTitle.includes(kw.toLowerCase())) ||
    HOLIDAY_KEYWORDS_EN.some(kw => enTitle.includes(kw))
  );
}

export function HolidaysView() {
  const { language } = useOutletContext<{ language: Language }>();
  const t = useTranslation(language);
  const isRTL = language === 'he';
  const admin = isAdmin();

  const { events: allEvents, refetch } = useEvents();
  const [editEvent, setEditEvent] = useState<AdminEvent | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);

  const todayStr = getIsraelToday();

  const shiftDay = (dateStr: string, delta: number) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + delta);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  // Multi-day holiday ranges (inner single-day events will be suppressed)
  const multiDayRanges = allEvents
    .filter(e => isHoliday(e) && e.endDate && e.endDate !== e.date)
    .map(e => ({ start: e.date, end: e.endDate! }));

  const isInsideMultiDay = (date: string) =>
    multiDayRanges.some(r => date >= r.start && date <= r.end);

  // Start dates of all multi-day holidays — used to suppress "ערב X" eve events
  const multiDayStartDates = new Set(multiDayRanges.map(r => r.start));

  const seenDates = new Set<string>();
  const seenMultiStarts = new Set<string>();
  const holidays = allEvents
    .filter(event => {
      if (!isHoliday(event)) return false;
      const relevantDateStr = event.endDate || event.date;
      if (relevantDateStr < todayStr) return false;
      // Multi-day: show once per start date
      if (event.endDate && event.endDate !== event.date) {
        if (seenMultiStarts.has(event.date)) return false;
        seenMultiStarts.add(event.date);
        return true;
      }
      // Suppress inner days of a multi-day holiday
      if (isInsideMultiDay(event.date)) return false;
      // Suppress "ערב X" eve events when the next day is a holiday (the multi-day event covers it)
      const heTitle = event.title?.he || '';
      if (heTitle.startsWith('ערב ') && multiDayStartDates.has(shiftDay(event.date, 1))) return false;
      // Deduplicate by date
      if (seenDates.has(event.date)) return false;
      seenDates.add(event.date);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const getEventDateRange = (event: Event) => {
    const startStr = event.date;
    const endStr = event.endDate && event.endDate !== event.date ? event.endDate : event.date;
    // For single-day events, format as full date string
    if (startStr === endStr) {
      const [y, mo, da] = startStr.split('-').map(Number);
      return new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : language, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }).format(new Date(y, mo - 1, da));
    }
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    if (sm === em && sy === ey) return `${sd}–${ed}.${sm}.${sy}`;
    if (sy === ey) return `${sd}.${sm}–${ed}.${em}.${sy}`;
    return `${sd}.${sm}.${sy}–${ed}.${em}.${ey}`;
  };

  const getDays = (event: Event) => {
    const start = new Date(event.date);
    const end = new Date(event.endDate || event.date);
    return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this event?')) return;
    await adminApi.deleteEvent(id);
    refetch();
  };

  return (
    <div className={`container mx-auto px-3 sm:px-4 py-4 sm:py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6 sm:mb-8">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t.holidays}</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t.holidaysSubtitle}</p>
          </div>
          {admin && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0 mt-1"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'הוסף' : 'Add'}
            </button>
          )}
        </div>

        {holidays.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t.noUpcomingHolidays}</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
            {holidays.map((event) => {
              const days = getDays(event);
              const memorial = isMemorialDay(event);
              const isDB = !!event._db;
              const tagLabel = memorial ? (language === 'he' ? 'יום לאומי' : 'National Day') : (language === 'he' ? 'חג' : 'Holiday');

              const displayStart = event.date;
              const [dsy, dsm, dsd] = displayStart.split('-').map(Number);
              const displayDate = new Date(dsy, dsm - 1, dsd);

              const inner = (
                <>
                  <div className="w-1 self-stretch rounded-full shrink-0 bg-amber-400" />

                  <div className="shrink-0 text-center min-w-[52px] text-amber-700 dark:text-amber-300">
                    <div className="text-xl sm:text-2xl font-bold leading-none" dir="ltr">
                      {displayStart.split('-')[2]}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide" dir="ltr">
                      {new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : language, { month: 'short' }).format(displayDate)}
                    </div>
                    <div className="text-xs opacity-60" dir="ltr">
                      {displayStart.split('-')[0]}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                        {tagLabel}
                      </span>
                      {days > 1 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {days} {language === 'he' ? 'ימים' : 'days'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                      {event.title[language] ?? event.title.he ?? event.title.en}
                      {event.private && <span className="ml-1 opacity-60 text-sm">🔒</span>}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span dir="ltr" className="text-sm font-semibold text-amber-600 dark:text-amber-300">
                        {getEventDateRange(event)}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <AddToCalendarButton event={event} language={language} isRTL={isRTL} />
                    {admin && (
                      <>
                        <button
                          onClick={e => {
                            e.preventDefault(); e.stopPropagation();
                            isDB ? setEditEvent(event as unknown as AdminEvent) : setAddDate(event.date);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                          title="Edit"
                        ><Pencil className="w-4 h-4" /></button>
                        {isDB && (
                          <button
                            onClick={e => handleDelete(e, event.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete"
                          ><Trash2 className="w-4 h-4" /></button>
                        )}
                      </>
                    )}
                    <div className="text-gray-300 dark:text-gray-600 group-hover:text-amber-400 transition-colors">
                      {isRTL
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                      }
                    </div>
                  </div>
                </>
              );

              return (
                <Link
                  key={event.id}
                  to={`/event/${event.id}?from=holidays`}
                  className="flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors group"
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {(addOpen || addDate) && (
        <AddEventModal
          date={addDate ?? undefined}
          onClose={() => { setAddOpen(false); setAddDate(null); }}
          onSaved={() => { setAddOpen(false); setAddDate(null); refetch(); }}
        />
      )}
      {editEvent && (
        <AddEventModal
          event={editEvent}
          onClose={() => setEditEvent(null)}
          onSaved={() => { setEditEvent(null); refetch(); }}
        />
      )}
    </div>
  );
}
