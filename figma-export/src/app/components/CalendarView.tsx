import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Language, useTranslation } from '../utils/i18n';
import { getMonthEvents, Event, events } from '../data/events';
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';

interface MultiDayEvent {
  id: string;
  title: Event['title'];
  type: Event['type'];
  startDate: string;
  endDate: string;
  allDates: string[]; // All dates this event spans
}

export function CalendarView() {
  const { language } = useOutletContext<{ language: Language }>();
  const t = useTranslation(language);
  const navigate = useNavigate();
  const isRTL = language === 'he';
  
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(1); // February (0-based)

  const monthEvents = getMonthEvents(currentYear, currentMonth + 1);

  // Get all multi-day events (parent events)
  const getMultiDayEvents = (): MultiDayEvent[] => {
    const parentEvents = new Map<string, MultiDayEvent>();
    
    // First, find all child events and group them by parent
    const childEventsByParent = new Map<string, Event[]>();
    events.forEach(event => {
      if (event.parentEventId) {
        const children = childEventsByParent.get(event.parentEventId) || [];
        children.push(event);
        childEventsByParent.set(event.parentEventId, children);
      }
    });
    
    // Now, for each parent, find its date range from all children
    childEventsByParent.forEach((children, parentId) => {
      const parentEvent = events.find(e => e.id === parentId);
      if (!parentEvent) return;
      
      // Get min and max dates from all child events
      const dates = children.map(c => c.date).sort();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      
      // Generate all dates between start and end
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const allDatesInterval = eachDayOfInterval({ start, end });
      const allDates = allDatesInterval.map(d => format(d, 'yyyy-MM-dd'));
      
      parentEvents.set(parentId, {
        id: parentId,
        title: parentEvent.title,
        type: parentEvent.type,
        startDate,
        endDate,
        allDates,
      });
    });
    
    return Array.from(parentEvents.values());
  };

  const multiDayEvents = getMultiDayEvents();

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const monthNames = {
    he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
    es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  };

  const dayNames = {
    he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
    es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const days: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Calculate weeks for grid
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const handleDayClick = (day: number) => {
    const date = format(new Date(currentYear, currentMonth, day), 'yyyy-MM-dd');
    navigate(`/?date=${date}`);
  };

  const handleEventClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/event/${eventId}?from=year`);
  };

  const getEventsForDay = (day: number): Event[] => {
    const dateStr = format(new Date(currentYear, currentMonth, day), 'yyyy-MM-dd');
    const dayEvents = monthEvents.get(dateStr) || [];
    // Filter out child events AND parent events (they're shown as bars)
    // Only show regular standalone events
    const parentEventIds = new Set(multiDayEvents.map(md => md.id));
    return dayEvents
      .filter(evt => !evt.parentEventId && !parentEventIds.has(evt.id)) // Filter out both child and parent events
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 3);
  };

  const getMoreEventsCount = (day: number): number => {
    const dateStr = format(new Date(currentYear, currentMonth, day), 'yyyy-MM-dd');
    const dayEvents = monthEvents.get(dateStr) || [];
    const parentEvents = dayEvents.filter(evt => !evt.parentEventId);
    return Math.max(0, parentEvents.length - 3);
  };

  const isToday = (day: number | null): boolean => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const getEventColor = (event: Event | MultiDayEvent): string => {
    switch (event.type) {
      case 'conference':
        return 'bg-purple-500 text-white border-purple-600';
      case 'holiday':
        return 'bg-green-500 text-white border-green-600';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Get multi-day events that overlap with a specific week
  const getMultiDayEventsForWeek = (week: (number | null)[]): Array<{
    event: MultiDayEvent;
    startCol: number;
    span: number;
  }> => {
    const weekStart = week.find(d => d !== null);
    const weekEnd = week[week.length - 1];
    if (!weekStart || !weekEnd) return [];

    const weekStartDate = format(new Date(currentYear, currentMonth, weekStart), 'yyyy-MM-dd');
    const weekEndDate = format(new Date(currentYear, currentMonth, weekEnd), 'yyyy-MM-dd');

    return multiDayEvents
      .filter(mdEvent => {
        // Check if this multi-day event overlaps with the current week AND month
        const eventStartMonth = parseInt(mdEvent.startDate.split('-')[1]);
        const eventStartYear = parseInt(mdEvent.startDate.split('-')[0]);
        const eventEndMonth = parseInt(mdEvent.endDate.split('-')[1]);
        const eventEndYear = parseInt(mdEvent.endDate.split('-')[0]);
        
        // Check if event is in the current month/year or spans into it
        const inCurrentMonth = 
          (eventStartYear === currentYear && eventStartMonth === currentMonth + 1) ||
          (eventEndYear === currentYear && eventEndMonth === currentMonth + 1) ||
          (eventStartYear < currentYear || (eventStartYear === currentYear && eventStartMonth < currentMonth + 1)) && 
          (eventEndYear > currentYear || (eventEndYear === currentYear && eventEndMonth > currentMonth + 1));
        
        if (!inCurrentMonth) return false;
        
        return mdEvent.endDate >= weekStartDate && mdEvent.startDate <= weekEndDate;
      })
      .map(mdEvent => {
        // Calculate which columns this event spans in this week
        let startCol = 0;
        let span = 0;

        week.forEach((day, index) => {
          if (!day) return;
          const dayDate = format(new Date(currentYear, currentMonth, day), 'yyyy-MM-dd');
          
          if (dayDate >= mdEvent.startDate && dayDate <= mdEvent.endDate) {
            if (span === 0) {
              startCol = index;
            }
            span++;
          }
        });

        return { event: mdEvent, startCol, span };
      })
      .filter(item => item.span > 0);
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth('prev')}
          >
            {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </Button>

          <div className="flex items-center gap-3">
            {/* Month selector */}
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className={`
                px-3 py-1.5 border border-gray-300 rounded-md text-base font-semibold
                bg-white hover:bg-gray-50 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${isRTL ? 'text-right' : 'text-left'}
              `}
            >
              {monthNames[language].map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            
            {/* Year selector */}
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className={`
                px-3 py-1.5 border border-gray-300 rounded-md text-base font-semibold
                bg-white hover:bg-gray-50 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${isRTL ? 'text-right' : 'text-left'}
              `}
            >
              {Array.from({ length: 10 }, (_, i) => 2020 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth('next')}
          >
            {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames[language].map((day, index) => (
              <div
                key={index}
                className={`
                  text-center font-semibold text-gray-700 py-3 text-sm
                  ${isRTL ? 'border-l border-gray-200 last:border-l-0' : 'border-r border-gray-200 last:border-r-0'}
                `}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            {weeks.map((week, weekIndex) => {
              const multiDayEventsInWeek = getMultiDayEventsForWeek(week);
              
              return (
                <div key={weekIndex} className="border-b border-gray-200 last:border-b-0 relative">
                  {/* Multi-day event bars - absolutely positioned */}
                  {multiDayEventsInWeek.map((item, barIndex) => {
                    const dayDate = week[item.startCol];
                    if (!dayDate) return null;
                    
                    const dateStr = format(new Date(currentYear, currentMonth, dayDate), 'yyyy-MM-dd');
                    const isFirstDayInEvent = dateStr === item.event.startDate;
                    const isLastDayInEvent = dateStr === item.event.endDate;
                    
                    // Calculate position: each column is 1/7 of the width
                    const leftPercent = (item.startCol / 7) * 100;
                    const widthPercent = (item.span / 7) * 100;
                    
                    return (
                      <div
                        key={barIndex}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(item.event.id, e);
                        }}
                        className={`
                          absolute cursor-pointer hover:opacity-90 transition-opacity z-10
                          h-6 flex items-center px-2 text-xs font-semibold
                          ${getEventColor(item.event)}
                          ${isRTL ? 'text-right' : 'text-left'}
                          ${isRTL ? 
                            (isFirstDayInEvent ? 'rounded-r-md' : '') + ' ' + (isLastDayInEvent ? 'rounded-l-md' : '') : 
                            (isFirstDayInEvent ? 'rounded-l-md' : '') + ' ' + (isLastDayInEvent ? 'rounded-r-md' : '')
                          }
                        `}
                        style={{
                          top: `${32 + barIndex * 28}px`,
                          [isRTL ? 'right' : 'left']: `calc(${leftPercent}% + 8px)`,
                          width: `calc(${widthPercent}% - 16px)`,
                        }}
                      >
                        <span className="truncate">{item.event.title[language]}</span>
                      </div>
                    );
                  })}
                  
                  {/* Regular day cells */}
                  <div className="grid grid-cols-7">
                    {week.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`
                          min-h-[120px] p-2
                          ${isRTL ? 'border-l border-gray-200 last:border-l-0' : 'border-r border-gray-200 last:border-r-0'}
                          ${day ? 'cursor-pointer hover:bg-gray-50 transition-colors' : 'bg-gray-50'}
                          ${isToday(day) ? 'bg-blue-50' : ''}
                        `}
                        onClick={() => day && handleDayClick(day)}
                      >
                        {day && (
                          <div className="h-full flex flex-col">
                            <div className={`text-sm font-semibold mb-2 ${isRTL ? 'text-right' : 'text-left'} ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>
                              {day}
                            </div>
                            
                            {/* Spacer for multi-day events */}
                            {multiDayEventsInWeek.length > 0 && (
                              <div style={{ height: `${multiDayEventsInWeek.length * 28}px` }} />
                            )}
                            
                            <div className="flex-1 space-y-1 overflow-hidden">
                              {getEventsForDay(day).map((event) => (
                                <div
                                  key={event.id}
                                  onClick={(e) => handleEventClick(event.id, e)}
                                  className={`
                                    text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity
                                    ${getEventColor(event)}
                                    ${isRTL ? 'text-right' : 'text-left'}
                                    truncate
                                  `}
                                >
                                  <span className="font-medium">{event.startTime}</span>
                                  {' '}
                                  <span>{event.title[language]}</span>
                                </div>
                              ))}
                              {getMoreEventsCount(day) > 0 && (
                                <div className={`text-xs text-gray-600 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                                  +{getMoreEventsCount(day)} {language === 'he' ? 'נוספים' : language === 'en' ? 'more' : language === 'ru' ? 'еще' : 'más'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}