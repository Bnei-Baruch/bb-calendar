import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { Calendar, MapPin, Pencil, Trash2, Plus } from 'lucide-react';
import { Language, useTranslation } from '../utils/i18n';
import { useEvents } from '../context/EventsContext';
import { Event, getIsraelToday } from '../data/events';
import { isHoliday } from './HolidaysView';
import { AddToCalendarButton } from './AddToCalendarButton';
import { isAdmin, isAdminOrTranslator } from '../admin/AdminGuard';
import { adminApi } from '../admin/adminApi';
import { AddEventModal } from '../admin/AddEventModal';
import type { AdminEvent } from '../admin/adminApi';

export function UpcomingEventsView() {
  const { language } = useOutletContext<{ language: Language }>();
  const t = useTranslation(language);
  const isRTL = language === 'he';
  const admin = isAdmin();
  const canEdit = isAdminOrTranslator();

  const { events: allEvents, refetch } = useEvents();
  const [editEvent, setEditEvent] = useState<AdminEvent | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);

  const todayStr = getIsraelToday();

  const congresses = allEvents
    .filter(event => {
      if (event.date < todayStr) return false;
      if (isHoliday(event)) return false;
      if (!canEdit && !event.title?.[language]) return false;
      const isMultiDay = event.endDate && event.endDate !== event.date;
      return isMultiDay || event.type === 'special';
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const formatDate = (dateStr: string) => {
    const [y, mo, da] = dateStr.split('-').map(Number);
    const date = new Date(y, mo - 1, da);
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
        <div className={`flex items-start justify-between mb-6 sm:mb-8`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t.upcomingEvents}</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t.congressesSubtitle}</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shrink-0 mt-1"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'הוסף' : 'Add'}
            </button>
          )}
        </div>

        {congresses.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t.noUpcomingCongresses}</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
            {congresses.map((event) => {
              const days = getDays(event);
              const isSpecial = event.type === 'special';
              const isDB = !!event._db;
              const accent = isSpecial
                ? { bar: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300', hover: '', cal: 'text-purple-500', calText: 'text-purple-600 dark:text-purple-300' }
                : { bar: 'bg-blue-500',   text: 'text-blue-700 dark:text-blue-300',     badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',       hover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400', cal: 'text-blue-500', calText: 'text-blue-600 dark:text-blue-300' };
              const badgeLabel = isSpecial ? (language === 'he' ? 'אירוע' : 'Event') : (language === 'he' ? 'כנס' : 'Congress');

              const inner = (
                <>
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${accent.bar}`} />

                  <div className={`shrink-0 text-center min-w-[52px] ${accent.text}`}>
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
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accent.badge}`}>
                        {badgeLabel}
                      </span>
                      {days > 1 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {days} {language === 'he' ? 'ימים' : 'days'}
                        </span>
                      )}
                    </div>
                    <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${accent.hover} transition-colors`}>
                      {event.title[language] ?? event.title.he ?? event.title.en}
                      {event.private && <span className="ml-1 opacity-60 text-sm">🔒</span>}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className={`w-3.5 h-3.5 shrink-0 ${accent.cal}`} />
                      <span dir="ltr" className={`text-sm font-semibold ${accent.calText}`}>
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
                    {canEdit && (
                      <>
                        <button
                          onClick={e => {
                            e.preventDefault(); e.stopPropagation();
                            isDB ? setEditEvent(event as unknown as AdminEvent) : setAddDate(event.date);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                          title="Edit"
                        ><Pencil className="w-4 h-4" /></button>
                        {isDB && admin && (
                          <button
                            onClick={e => handleDelete(e, event.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete"
                          ><Trash2 className="w-4 h-4" /></button>
                        )}
                      </>
                    )}
                    {!isSpecial && (
                      <div className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors">
                        {isRTL
                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                        }
                      </div>
                    )}
                  </div>
                </>
              );

              return isSpecial ? (
                <div key={event.id} className="flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4">
                  {inner}
                </div>
              ) : (
                <Link
                  key={event.id}
                  to={`/event/${event.id}?from=upcoming`}
                  className="flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
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
