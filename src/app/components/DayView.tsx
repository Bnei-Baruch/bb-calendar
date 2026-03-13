import { useNavigate, useSearchParams, useOutletContext } from 'react-router';
import { ChevronLeft, ChevronRight, Clock, CalendarIcon, BookOpen, Share2 } from 'lucide-react';
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
  const [shareOpen, setShareOpen] = useState(false);

  const buildScheduleText = () => {
    const sep = isRTL ? '\u202E━━━━━━━━━━' : '━━━━━━━━━━';
    const lines: string[] = [formatDateByLanguage(currentDate), ''];
    if (parentEvent) {
      lines.push(parentEvent.title[language] + (dayNumber ? ` - ${t.day} ${dayNumber}` : ''));
      lines.push(sep);
      lines.push('');
    }
    const timeless = events.filter(e => !e.startTime || !e.endTime || e.startTime === e.endTime);
    const timed = events.filter(e => e.startTime && e.endTime && e.startTime !== e.endTime);
    timeless.forEach(e => lines.push(e.title[language]));
    if (timeless.length > 0) lines.push('');
    timed.forEach(e => {
        const time = `${padTime(e.startTime)} - ${padTime(e.endTime)}`;
      lines.push(`${time}  ${e.title[language]}`);
    });
    return lines.join('\n');
  };

  const shareOptions = [
    {
      label: isRTL ? 'שתף בווטסאפ' : 'Share on WhatsApp',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.549 4.076 1.504 5.786L0 24l6.395-1.682A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.388l-.36-.214-3.732.981.998-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
      ),
      href: `https://wa.me/?text=${encodeURIComponent(buildScheduleText())}`,
    },
    {
      label: isRTL ? 'שתף בטלגרם' : 'Share on Telegram',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-500"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.772l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.787z"/></svg>
      ),
      href: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(buildScheduleText())}`,
    },
    {
      label: isRTL ? 'העתק טקסט' : 'Copy text',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      ),
      onClick: () => {
        const text = buildScheduleText();
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setShareOpen(false);
      },
    },
  ];

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

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="relative">
            <button
              onClick={() => setShareOpen(v => !v)}
              className="h-9 w-auto px-3 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer shadow-sm text-sm text-gray-700 shrink-0"
            >
              <Share2 className="h-4 w-4" />
              <span>{isRTL ? 'שתף' : 'Share'}</span>
            </button>
            {shareOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShareOpen(false)} />
                <div className="absolute z-20 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px] ltr" dir="ltr" style={isRTL ? {right:0} : {left:0}}>
                  {shareOptions.map((opt, i) =>
                    opt.href ? (
                      <a key={i} href={opt.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 whitespace-nowrap" onClick={() => setShareOpen(false)}>
                        {opt.icon}<span>{opt.label}</span>
                      </a>
                    ) : (
                      <button key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 whitespace-nowrap w-full text-left" onClick={opt.onClick}>
                        {opt.icon}<span>{opt.label}</span>
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
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
                          {event.studyLink && (
                            <a
                              href={event.studyLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 shrink-0 transition-colors"
                            >
                              <BookOpen className="w-4 h-4 text-white" />
                            </a>
                          )}
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