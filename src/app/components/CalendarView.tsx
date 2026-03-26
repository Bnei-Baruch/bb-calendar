import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Language, useTranslation } from '../utils/i18n';
import { getMonthEvents, Event } from '../data/events';
import { useEvents } from '../context/EventsContext';
import { format, parseISO, eachDayOfInterval } from 'date-fns';

interface MultiDayEvent {
  id: string;
  title: Event['title'];
  type: Event['type'];
  startDate: string;
  endDate: string;
  allDates: string[];
}

// Subtle bg tints per day-of-week column (Sun=0 … Sat=6)
const DAY_BG = [
  'bg-blue-50/60   dark:bg-blue-900/10',
  'bg-orange-50/60 dark:bg-orange-900/10',
  'bg-emerald-50/60 dark:bg-emerald-900/10',
  'bg-rose-50/60   dark:bg-rose-900/10',
  'bg-violet-50/60 dark:bg-violet-900/10',
  'bg-amber-50/60  dark:bg-amber-900/10',
  'bg-cyan-50/60   dark:bg-cyan-900/10',
];
const DAY_HEADER_BG = [
  'bg-blue-100/80   dark:bg-blue-900/20',
  'bg-orange-100/80 dark:bg-orange-900/20',
  'bg-emerald-100/80 dark:bg-emerald-900/20',
  'bg-rose-100/80   dark:bg-rose-900/20',
  'bg-violet-100/80 dark:bg-violet-900/20',
  'bg-amber-100/80  dark:bg-amber-900/20',
  'bg-cyan-100/80   dark:bg-cyan-900/20',
];
const DAY_TEXT = [
  'text-blue-700   dark:text-blue-300',
  'text-orange-700 dark:text-orange-300',
  'text-emerald-700 dark:text-emerald-300',
  'text-rose-700   dark:text-rose-300',
  'text-violet-700 dark:text-violet-300',
  'text-amber-700  dark:text-amber-300',
  'text-cyan-700   dark:text-cyan-300',
];

export function CalendarView() {
  const { language } = useOutletContext<{ language: Language }>();
  const t = useTranslation(language);
  const navigate = useNavigate();
  const isRTL = language === 'he';

  const { events: allEvents } = useEvents();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [popupDay, setPopupDay] = useState<number | null>(null);

  const monthEvents = getMonthEvents(allEvents, currentYear, currentMonth + 1);

  const getMultiDayEvents = (): MultiDayEvent[] => {
    return allEvents
      .filter(e => e.endDate && e.endDate !== e.date)
      .map(e => {
        const allDates = eachDayOfInterval({ start: parseISO(e.date), end: parseISO(e.endDate!) })
          .map(d => format(d, 'yyyy-MM-dd'));
        return { id: e.id, title: e.title, type: e.type, startDate: e.date, endDate: e.endDate!, allDates };
      });
  };

  const multiDayEvents = getMultiDayEvents();

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
      else setCurrentMonth(currentMonth - 1);
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
      else setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = {
    he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const days: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const handleDayClick = (day: number) => {
    const date = format(new Date(currentYear, currentMonth, day), 'yyyy-MM-dd');
    navigate(`/?date=${date}`);
  };

  const handleEventClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/event/${eventId}?from=year`);
  };

  const parentEventIds = new Set(multiDayEvents.map(md => md.id));

  const getAllEventsForDay = (day: number): Event[] => {
    const dateStr = format(new Date(currentYear, currentMonth, day), 'yyyy-MM-dd');
    const dayEvents = monthEvents.get(dateStr) || [];
    return dayEvents
      .filter(evt => !evt.parentEventId && !parentEventIds.has(evt.id))
      .sort((a, b) => {
        const toMin = (t: string) => { if (!t) return -1; const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
        return toMin(a.startTime) - toMin(b.startTime);
      });
  };

  const getEventsForDay = (day: number): Event[] => getAllEventsForDay(day).slice(0, 3);
  const getMoreEventsCount = (day: number): number => Math.max(0, getAllEventsForDay(day).length - 3);

  const isToday = (day: number | null): boolean => {
    if (!day) return false;
    const today = new Date();
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const isCurrentMonth = currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

  const getEventColor = (event: Event | MultiDayEvent): string => {
    switch (event.type) {
      case 'conference': return 'bg-purple-500 text-white border-purple-600';
      case 'holiday':    return 'bg-green-500 text-white border-green-600';
      default:           return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700';
    }
  };

  const getMultiDayEventsForWeek = (week: (number | null)[]) => {
    const weekStart = week.find(d => d !== null);
    const weekEnd = week[week.length - 1];
    if (!weekStart || !weekEnd) return [];
    const weekStartDate = format(new Date(currentYear, currentMonth, weekStart), 'yyyy-MM-dd');
    const weekEndDate   = format(new Date(currentYear, currentMonth, weekEnd),   'yyyy-MM-dd');

    return multiDayEvents
      .filter(mdEvent => {
        const [esy, esm] = mdEvent.startDate.split('-').map(Number);
        const [eey, eem] = mdEvent.endDate.split('-').map(Number);
        const inMonth =
          (esy === currentYear && esm === currentMonth + 1) ||
          (eey === currentYear && eem === currentMonth + 1) ||
          ((esy < currentYear || (esy === currentYear && esm < currentMonth + 1)) &&
           (eey > currentYear || (eey === currentYear && eem > currentMonth + 1)));
        return inMonth && mdEvent.endDate >= weekStartDate && mdEvent.startDate <= weekEndDate;
      })
      .map(mdEvent => {
        let startCol = 0, span = 0;
        week.forEach((day, index) => {
          if (!day) return;
          const dayDate = format(new Date(currentYear, currentMonth, day), 'yyyy-MM-dd');
          if (dayDate >= mdEvent.startDate && dayDate <= mdEvent.endDate) {
            if (span === 0) startCol = index;
            span++;
          }
        });
        return { event: mdEvent, startCol, span };
      })
      .filter(item => item.span > 0);
  };

  const shortDayNames = {
    he: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  };

  const popupEvents = popupDay ? getAllEventsForDay(popupDay) : [];

  return (
    <div className={`container mx-auto px-2 sm:px-4 py-4 sm:py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')} className="shrink-0">
            {isRTL ? <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm sm:text-base font-semibold bg-white dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthNames[language].map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm sm:text-base font-semibold bg-white dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 10 }, (_, i) => 2020 + i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            {!isCurrentMonth && (
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm font-semibold rounded-md border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                {t.today}
              </button>
            )}
          </div>

          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')} className="shrink-0">
            {isRTL ? <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          {/* Day column headers */}
          <div className="grid grid-cols-7">
            {shortDayNames[language].map((day, index) => (
              <div
                key={index}
                className={`
                  flex items-center justify-center py-3 sm:py-4
                  ${DAY_HEADER_BG[index]}
                  ${isRTL ? 'border-l border-gray-200 dark:border-gray-700 last:border-l-0' : 'border-r border-gray-200 dark:border-gray-700 last:border-r-0'}
                `}
              >
                <span className={`inline-flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full font-bold text-sm sm:text-base ${DAY_TEXT[index]}`}
                  style={{ background: 'rgba(255,255,255,0.5)' }}>
                  {day}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            {weeks.map((week, weekIndex) => {
              const multiDayEventsInWeek = getMultiDayEventsForWeek(week);
              return (
                <div key={weekIndex} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 relative">
                  {/* Multi-day event bars */}
                  {multiDayEventsInWeek.map((item, barIndex) => {
                    const dayDate = week[item.startCol];
                    if (!dayDate) return null;
                    const dateStr = format(new Date(currentYear, currentMonth, dayDate), 'yyyy-MM-dd');
                    const isFirst = dateStr === item.event.startDate;
                    const isLast  = dateStr === item.event.endDate;
                    const leftPct = (item.startCol / 7) * 100;
                    const widthPct = (item.span / 7) * 100;
                    return (
                      <div
                        key={barIndex}
                        onClick={(e) => { e.stopPropagation(); handleEventClick(item.event.id, e); }}
                        className={`
                          absolute cursor-pointer hover:opacity-90 transition-opacity z-10
                          h-6 flex items-center px-2 text-xs font-semibold
                          ${getEventColor(item.event)}
                          ${isRTL
                            ? (isFirst ? 'rounded-r-md' : '') + ' ' + (isLast ? 'rounded-l-md' : '')
                            : (isFirst ? 'rounded-l-md' : '') + ' ' + (isLast ? 'rounded-r-md' : '')}
                        `}
                        style={{
                          top: `${32 + barIndex * 28}px`,
                          [isRTL ? 'right' : 'left']: `calc(${leftPct}% + 8px)`,
                          width: `calc(${widthPct}% - 16px)`,
                        }}
                      >
                        <span className="truncate">{item.event.title[language]}</span>
                      </div>
                    );
                  })}

                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {week.map((day, dayIndex) => {
                      const todayCell = isToday(day);
                      return (
                        <div
                          key={dayIndex}
                          className={`
                            min-h-[120px] p-2 relative
                            ${isRTL ? 'border-l border-gray-200 dark:border-gray-700 last:border-l-0' : 'border-r border-gray-200 dark:border-gray-700 last:border-r-0'}
                            ${day ? `cursor-pointer transition-colors ${DAY_BG[dayIndex]}` : 'bg-gray-50 dark:bg-gray-800/50'}
                            ${todayCell ? 'ring-2 ring-inset ring-blue-500' : ''}
                          `}
                          onClick={() => day && handleDayClick(day)}
                        >
                          {day && (
                            <div className="h-full flex flex-col">
                              {/* Day number */}
                              <div className="mb-2 flex justify-center">
                                {todayCell ? (
                                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-lg font-bold shadow">
                                    {day}
                                  </span>
                                ) : (
                                  <span className={`text-lg font-bold ${DAY_TEXT[dayIndex]}`}>
                                    {day}
                                  </span>
                                )}
                              </div>

                              {/* Spacer for multi-day bars */}
                              {multiDayEventsInWeek.length > 0 && (
                                <div style={{ height: `${multiDayEventsInWeek.length * 28}px` }} />
                              )}

                              <div className="flex-1 space-y-1 overflow-hidden">
                                {getEventsForDay(day).map((event) => (
                                  <div
                                    key={event.id}
                                    onClick={(e) => handleEventClick(event.id, e)}
                                    className={`text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getEventColor(event)} truncate`}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  >
                                    <span className="font-medium">{event.startTime}</span>{' '}
                                    <span>{event.title[language]}</span>
                                  </div>
                                ))}
                                {getMoreEventsCount(day) > 0 && (
                                  <div
                                    className={`text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline ${isRTL ? 'text-right' : 'text-left'}`}
                                    onClick={(e) => { e.stopPropagation(); setPopupDay(day); }}
                                  >
                                    +{getMoreEventsCount(day)} {language === 'he' ? 'נוספים' : language === 'en' ? 'more' : language === 'ru' ? 'еще' : 'más'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popup for extra events */}
      {popupDay !== null && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setPopupDay(null)} />
          <div
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-w-[90vw] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {popupDay} {monthNames[language][currentMonth]} {currentYear}
              </span>
              <button onClick={() => setPopupDay(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {popupEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => { handleEventClick(event.id, e); setPopupDay(null); }}
                  className={`text-sm px-3 py-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${getEventColor(event)}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {event.startTime && <span className="font-semibold me-2">{event.startTime}</span>}
                  <span>{event.title[language]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
