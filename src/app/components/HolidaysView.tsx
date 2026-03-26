import React from 'react';
import { Link, useOutletContext } from 'react-router';
import { Calendar, MapPin } from 'lucide-react';
import { Language, useTranslation } from '../utils/i18n';
import { useEvents } from '../context/EventsContext';
import { Event } from '../data/events';

const HOLIDAY_KEYWORDS_HE = [
  'פסח', 'סוכות', 'ראש השנה', 'יום כיפור', 'שבועות', 'פורים', 'חנוכה',
  'ל"ג בעומר', 'לג בעומר', 'שמחת תורה', 'שמיני עצרת', 'הושענא רבה',
  'תשעה באב', 'ט"ו בשבט', 'טו בשבט', 'ראש חודש', 'חול המועד',
  'ליל הסדר', 'שביעי של פסח', 'אחרון של פסח', 'לוז פסח', 'לו"ז פסח',
];
const HOLIDAY_KEYWORDS_EN = [
  'passover', 'sukkot', 'rosh hashana', 'yom kippur', 'shavuot', 'purim',
  'hanukkah', 'chanukah', "lag b'omer", 'lag baomer', 'simchat torah',
  'shemini atzeret', "tisha b'av", "tu b'shvat", 'rosh chodesh', 'chol hamoed',
];

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

  const { events: allEvents } = useEvents();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const holidays = allEvents
    .filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today && event.endDate && event.endDate !== event.date && isHoliday(event);
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : language, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(date);
  };

  const getEventDateRange = (event: Event) => {
    if (!event.endDate || event.endDate === event.date) return formatDate(event.date);
    const [sy, sm, sd] = event.date.split('-').map(Number);
    const [ey, em, ed] = event.endDate.split('-').map(Number);
    if (sm === em && sy === ey) return `${sd}-${ed}.${sm}.${sy}`;
    if (sy === ey) return `${sd}.${sm}-${ed}.${em}.${sy}`;
    return `${sd}.${sm}.${sy}-${ed}.${em}.${ey}`;
  };

  const getDays = (event: Event) => {
    if (!event.endDate) return 1;
    return Math.round((new Date(event.endDate).getTime() - new Date(event.date).getTime()) / 86400000) + 1;
  };

  return (
    <div className={`container mx-auto px-3 sm:px-4 py-4 sm:py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
      <div className={`mb-6 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t.holidays}</h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t.holidaysSubtitle}</p>
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
            return (
              <Link
                key={event.id}
                to={`/event/${event.id}?from=holidays`}
                className="flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors group"
              >
                <div className="w-1 self-stretch rounded-full shrink-0 bg-amber-400" />

                <div className="shrink-0 text-center min-w-[52px] text-amber-700 dark:text-amber-300">
                  <div className="text-xl sm:text-2xl font-bold leading-none" dir="ltr">
                    {event.date.split('-')[2]}
                  </div>
                  <div className="text-xs font-medium uppercase tracking-wide" dir="ltr">
                    {new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : language, { month: 'short' }).format(new Date(event.date))}
                  </div>
                  <div className="text-xs opacity-60" dir="ltr">
                    {event.date.split('-')[0]}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      {language === 'he' ? 'חג' : language === 'en' ? 'Holiday' : language === 'ru' ? 'Праздник' : 'Fiesta'}
                    </span>
                    {days > 1 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {days} {language === 'he' ? 'ימים' : language === 'en' ? 'days' : language === 'ru' ? 'дней' : 'días'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                    {event.title[language]}
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

                <div className="shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-amber-400 transition-colors">
                  {isRTL
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  }
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
