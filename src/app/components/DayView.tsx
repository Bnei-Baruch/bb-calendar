import { useNavigate, useSearchParams, useOutletContext } from 'react-router';
import { ChevronLeft, ChevronRight, Clock, CalendarIcon } from 'lucide-react';
import { he as heLocale, enUS, ru, es } from 'date-fns/locale';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Language, useTranslation } from '../utils/i18n';
import { getEventsByDate } from '../data/events';
import { useEvents } from '../context/EventsContext';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { useState } from 'react';

export function DayView() {
  const { language } = useOutletContext<{ language: Language }>();
  const t = useTranslation(language);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  
  const { events: allEvents, loading } = useEvents();
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const currentDate = parseISO(dateParam);
  const allDayEvents = getEventsByDate(allEvents, dateParam);

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(currentDate, 1) 
      : addDays(currentDate, 1);
    setSearchParams({ date: format(newDate, 'yyyy-MM-dd') });
  };

  const goToToday = () => {
    setSearchParams({ date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}?from=day&date=${dateParam}`);
  };

  const padTime = (time: string) => {
    if (!time) return time;
    const [h, m] = time.split(':');
    return `${h.padStart(2, '0')}:${m || '00'}`;
  };

  // Format date based on language
  const formatDateByLanguage = (date: Date) => {
    const dayNames = {
      he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
      en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
      es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    };
    
    const monthNames = {
      he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    };

    const day = date.getDate();
    const dayName = dayNames[language][date.getDay()];
    const month = monthNames[language][date.getMonth()];
    const year = date.getFullYear();

    if (language === 'he') {
      return `${dayName}, ${day} ${month} ${year}`;
    }
    return `${dayName}, ${month} ${day}, ${year}`;
  };

  // Find multi-day event spanning the current date — if multiple overlap, pick the most recently started
  const parentEvent = allEvents
    .filter(e => e.endDate && e.endDate !== e.date && e.date <= dateParam && e.endDate >= dateParam)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;

  // Exclude the parent event itself from the cards list
  const events = parentEvent
    ? allDayEvents.filter(e => e.id !== parentEvent.id)
    : allDayEvents;

  const dayNumber = parentEvent
    ? Math.round((parseISO(dateParam).getTime() - parseISO(parentEvent.date).getTime()) / 86400000) + 1
    : null;

  const getEventTypeColor = (type: string) => {
    const borderSide = isRTL ? 'border-r-4' : 'border-l-4';
    switch (type) {
      case 'conference':
        return `${borderSide} border-purple-700 bg-purple-50`;
      case 'holiday':
        return `${borderSide} border-green-700 bg-green-50`;
      default:
        return `${borderSide} border-blue-900 bg-blue-50`;
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <div className={`container mx-auto px-3 sm:px-4 py-4 sm:py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-8 gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDay('prev')}
            className="h-9 w-9 sm:h-11 sm:w-11 border border-blue-200 bg-blue-50 hover:bg-blue-100 shadow-sm hover:shadow-md shrink-0"
          >
            {isRTL ? <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" /> : <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />}
          </Button>

          <div className="text-center flex-1 min-w-0">
            <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-bold truncate">
                {formatDateByLanguage(currentDate)}
              </h2>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="h-7 w-7 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer shadow-sm hover:shadow-md shrink-0"
                    title={t.selectDate}
                  >
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => {
                      if (date) {
                        setSearchParams({ date: format(date, 'yyyy-MM-dd') });
                      }
                      setOpen(false);
                    }}
                    locale={language === 'he' ? heLocale : language === 'ru' ? ru : language === 'es' ? es : enUS}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDay('next')}
            className="h-9 w-9 sm:h-11 sm:w-11 border border-blue-200 bg-blue-50 hover:bg-blue-100 shadow-sm hover:shadow-md shrink-0"
          >
            {isRTL ? <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" /> : <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />}
          </Button>
        </div>

        {parentEvent && (
          <div
            className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow mb-5"
            onClick={() => handleEventClick(parentEvent.id)}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-center">
              {parentEvent.title[language]}
              {dayNumber && ` - ${t.day} ${dayNumber}`}
            </h2>
            {parentEvent.description && (
              <p className="text-center text-blue-100 mt-2 text-sm sm:text-base">
                {parentEvent.description[language]}
              </p>
            )}
          </div>
        )}

        <div className="space-y-5">
          {loading ? (
            <Card className="p-8 text-center text-gray-400">טוען...</Card>
          ) : events.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              {t.noEvents}
            </Card>
          ) : (
            <>
              {(() => {
                const timeless = events.filter(e => !e.startTime || !e.endTime || e.startTime === e.endTime);
                const timed = events.filter(e => e.startTime && e.endTime && e.startTime !== e.endTime);
                return (
                  <>
                    {timeless.length > 0 && (
                      <div className={`bg-blue-50 ${isRTL ? 'border-r-4' : 'border-l-4'} border-blue-600 rounded-lg shadow-sm mt-2 mb-5 space-y-1`} style={isRTL ? {paddingRight: '25px', paddingTop: '5px', paddingBottom: '5px'} : {paddingLeft: '25px', paddingTop: '5px', paddingBottom: '5px'}}>
                        {timeless.map((e) => (
                          <div key={e.id} className="cursor-pointer" onClick={() => handleEventClick(e.id)}>
                            <p className={`text-blue-900 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{e.title[language]}</p>
                            {e.description && (
                              <p className={`text-blue-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{e.description[language]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {timed.map((event) => (
                      <Card
                        key={event.id}
                        className={`border-0 ${getEventTypeColor(event.type)} p-4 cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => handleEventClick(event.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-[120px]">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium" dir="ltr">
                              {isRTL
                                ? `${padTime(event.endTime)} - ${padTime(event.startTime)}`
                                : `${padTime(event.startTime)} - ${padTime(event.endTime)}`
                              }
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-blue-900">
                              {event.title[language]}
                            </h3>
                            {event.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {event.description[language]}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}