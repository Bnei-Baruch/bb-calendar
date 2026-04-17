import { useNavigate, useSearchParams, useOutletContext } from 'react-router';
import { ChevronLeft, ChevronRight, Clock, CalendarIcon, BookOpen, Share2 } from 'lucide-react';
import { AddToCalendarButton } from './AddToCalendarButton';
import { he as heLocale, enUS, ru, es } from 'date-fns/locale';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Language, useTranslation } from '../utils/i18n';
import { getEventsByDate, getIsraelToday } from '../data/events';
import { useEvents } from '../context/EventsContext';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { useState } from 'react';

export function DayView() {
  const { language } = useOutletContext<{ language: Language }>();
  const t = useTranslation(language);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isRTL = language === 'he';

  const { events: allEvents, loading } = useEvents();
  const dateParam = searchParams.get('date') || getIsraelToday();
  const currentDate = parseISO(dateParam);

  // 7-day window starting from currentDate
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(currentDate, i), 'yyyy-MM-dd')
  );
  const endDate = parseISO(weekDates[6]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev'
      ? subDays(currentDate, 7)
      : addDays(currentDate, 7);
    setSearchParams({ date: format(newDate, 'yyyy-MM-dd') });
  };

  const goToToday = () => {
    setSearchParams({ date: getIsraelToday() });
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}?from=day&date=${dateParam}`);
  };

  const padTime = (time: string) => {
    if (!time) return time;
    const [h, m] = time.split(':');
    return `${h.padStart(2, '0')}:${m || '00'}`;
  };

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

  const formatDayHeader = (date: Date) => {
    const day = date.getDate();
    const dayName = dayNames[language][date.getDay()];
    const month = monthNames[language][date.getMonth()];
    if (language === 'he') return `${dayName}, ${day} ${month}`;
    return `${dayName}, ${month} ${day}`;
  };

  const formatWeekRange = () => {
    const startDay = currentDate.getDate();
    const endDay = endDate.getDate();
    const startMonth = monthNames[language][currentDate.getMonth()];
    const endMonth = monthNames[language][endDate.getMonth()];
    const year = endDate.getFullYear();
    if (language === 'he') {
      if (currentDate.getMonth() === endDate.getMonth()) {
        return `${startDay}–${endDay} ${startMonth} ${year}`;
      }
      return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
    }
    if (currentDate.getMonth() === endDate.getMonth()) {
      return `${startMonth} ${startDay}–${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  };

  // Color palette per day index (0 = first day of the 7-day window)
  // Alternates warm/cool for maximum contrast between adjacent days
  const dayColors = [
    { border: 'border-blue-600',   bg: 'bg-blue-50    dark:bg-blue-900/25',   text: 'text-blue-800   dark:text-blue-200',   badge: 'bg-blue-600'   },
    { border: 'border-orange-500', bg: 'bg-orange-50  dark:bg-orange-900/25', text: 'text-orange-800 dark:text-orange-200', badge: 'bg-orange-500' },
    { border: 'border-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-900/25',text: 'text-emerald-800 dark:text-emerald-200',badge: 'bg-emerald-600'},
    { border: 'border-rose-600',   bg: 'bg-rose-50    dark:bg-rose-900/25',   text: 'text-rose-800   dark:text-rose-200',   badge: 'bg-rose-600'   },
    { border: 'border-violet-600', bg: 'bg-violet-50  dark:bg-violet-900/25', text: 'text-violet-800 dark:text-violet-200', badge: 'bg-violet-600' },
    { border: 'border-amber-500',  bg: 'bg-amber-50   dark:bg-amber-900/25',  text: 'text-amber-800  dark:text-amber-200',  badge: 'bg-amber-500'  },
    { border: 'border-cyan-600',   bg: 'bg-cyan-50    dark:bg-cyan-900/25',   text: 'text-cyan-800   dark:text-cyan-200',   badge: 'bg-cyan-600'   },
  ];

  const getEventTypeColor = (type: string) => {
    const borderSide = isRTL ? 'border-r-4' : 'border-l-4';
    switch (type) {
      case 'conference':
        return `${borderSide} border-purple-700 bg-purple-50 dark:bg-purple-900/20`;
      case 'holiday':
        return `${borderSide} border-green-700 bg-green-50 dark:bg-green-900/20`;
      default:
        return `${borderSide} border-blue-900 bg-blue-50 dark:bg-blue-900/20`;
    }
  };

  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dayShareOpen, setDayShareOpen] = useState<string | null>(null);

  const buildDayScheduleText = (dateStr: string) => {
    const date = parseISO(dateStr);
    const appTitle = { he: 'לוח אירועים', en: 'Events Calendar', ru: 'Календарь событий', es: 'Calendario de Eventos' }[language];
    const siteLabel = { he: 'לאתר לוח אירועים', en: 'Events Calendar website', ru: 'Сайт календаря событий', es: 'Sitio web del calendario de eventos' }[language];
    const lines: string[] = [`*${appTitle}*`, `*${formatDayHeader(date)}*`, '──────────'];
    const dayEvents = getEventsByDate(allEvents, dateStr);
    const parentEvent = allEvents
      .filter(e => e.endDate && e.endDate !== e.date && e.date <= dateStr && e.endDate >= dateStr)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    const events = parentEvent ? dayEvents.filter(e => e.id !== parentEvent.id) : dayEvents;
    if (parentEvent) {
      const dayNumber = Math.round((parseISO(dateStr).getTime() - parseISO(parentEvent.date).getTime()) / 86400000) + 1;
      lines.push(`${parentEvent.title[language]} - ${t.day} ${dayNumber}`);
    }
    if (events.length === 0 && !parentEvent) {
      lines.push(t.noEvents);
    } else {
      const timeless = events.filter(e => !e.startTime || !e.endTime || e.startTime === e.endTime);
      const timed = events.filter(e => e.startTime && e.endTime && e.startTime !== e.endTime);
      timeless.forEach(e => lines.push(e.title[language]));
      timed.forEach(e => lines.push(`${padTime(e.startTime)} - ${padTime(e.endTime)}  ${e.title[language]}`));
    }
    lines.push('', `${siteLabel}: https://cal.kli.one`);
    return lines.join('\n');
  };

  const makeDayShareOptions = (dateStr: string) => [
    {
      label: isRTL ? 'שתף בווטסאפ' : 'Share on WhatsApp',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.549 4.076 1.504 5.786L0 24l6.395-1.682A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.388l-.36-.214-3.732.981.998-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>,
      href: `https://wa.me/?text=${encodeURIComponent(buildDayScheduleText(dateStr))}`,
    },
    {
      label: isRTL ? 'שתף בטלגרם' : 'Share on Telegram',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-500"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.772l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.787z"/></svg>,
      href: `https://t.me/share/url?url=${encodeURIComponent('https://cal.kli.one')}&text=${encodeURIComponent(buildDayScheduleText(dateStr))}`,
    },
    {
      label: isRTL ? 'העתק טקסט' : 'Copy text',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
      onClick: () => {
        const ta = document.createElement('textarea');
        ta.value = buildDayScheduleText(dateStr);
        ta.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setDayShareOpen(null);
      },
    },
  ];

  const buildWeekScheduleText = () => {
    const appTitle = { he: 'לוח אירועים', en: 'Events Calendar', ru: 'Календарь событий', es: 'Calendario de Eventos' }[language];
    const lines: string[] = [`*${appTitle}*`, `*${formatWeekRange()}*`, ''];
    weekDates.forEach(dateStr => {
      const date = parseISO(dateStr);
      const dayEvents = getEventsByDate(allEvents, dateStr);
      const parentEvent = allEvents
        .filter(e => e.endDate && e.endDate !== e.date && e.date <= dateStr && e.endDate >= dateStr)
        .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
      const events = parentEvent ? dayEvents.filter(e => e.id !== parentEvent.id) : dayEvents;

      lines.push(`*${formatDayHeader(date)}*`);
      lines.push('──────────');
      if (parentEvent) {
        const dayNumber = Math.round((parseISO(dateStr).getTime() - parseISO(parentEvent.date).getTime()) / 86400000) + 1;
        lines.push(`${parentEvent.title[language]} - ${t.day} ${dayNumber}`);
      }
      if (events.length === 0 && !parentEvent) {
        lines.push(t.noEvents);
      } else {
        const timeless = events.filter(e => !e.startTime || !e.endTime || e.startTime === e.endTime);
        const timed = events.filter(e => e.startTime && e.endTime && e.startTime !== e.endTime);
        timeless.forEach(e => lines.push(e.title[language]));
        timed.forEach(e => {
          const time = `${padTime(e.startTime)} - ${padTime(e.endTime)}`;
          lines.push(`${time}  ${e.title[language]}`);
        });
      }
      lines.push('');
    });
    const siteLabel = {
      he: 'לאתר לוח אירועים',
      en: 'Events Calendar website',
      ru: 'Сайт календаря событий',
      es: 'Sitio web del calendario de eventos',
    }[language];
    lines.push(`${siteLabel}: https://cal.kli.one`);
    return lines.join('\n');
  };

  const shareOptions = [
    {
      label: isRTL ? 'שתף בווטסאפ' : 'Share on WhatsApp',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.549 4.076 1.504 5.786L0 24l6.395-1.682A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.388l-.36-.214-3.732.981.998-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
      ),
      href: `https://wa.me/?text=${encodeURIComponent(buildWeekScheduleText())}`,
    },
    {
      label: isRTL ? 'שתף בטלגרם' : 'Share on Telegram',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-500"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.772l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.787z"/></svg>
      ),
      href: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(buildWeekScheduleText())}`,
    },
    {
      label: isRTL ? 'העתק טקסט' : 'Copy text',
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      ),
      onClick: () => {
        const text = buildWeekScheduleText();
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
        {/* Week navigation header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('prev')}
            className="h-9 w-9 sm:h-11 sm:w-11 border border-blue-200 dark:border-blue-500 bg-blue-50 dark:bg-blue-700 hover:bg-blue-100 dark:hover:bg-blue-600 shadow-sm hover:shadow-md shrink-0"
          >
            {isRTL ? <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-white" /> : <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-white" />}
          </Button>

          <div className="text-center flex-1 min-w-0">
            <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-bold truncate">
                {formatWeekRange()}
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
            onClick={() => navigateWeek('next')}
            className="h-9 w-9 sm:h-11 sm:w-11 border border-blue-200 dark:border-blue-500 bg-blue-50 dark:bg-blue-700 hover:bg-blue-100 dark:hover:bg-blue-600 shadow-sm hover:shadow-md shrink-0"
          >
            {isRTL ? <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-white" /> : <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-white" />}
          </Button>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={goToToday}
            className="h-9 px-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm text-sm text-gray-700 dark:text-gray-300"
          >
            {t.today}
          </button>
          <div className="relative">
            <button
              onClick={() => setShareOpen(v => !v)}
              className="h-9 w-auto px-3 inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm text-sm text-gray-700 dark:text-gray-300 shrink-0"
            >
              <Share2 className="h-4 w-4" />
              <span>{isRTL ? 'שתף' : 'Share'}</span>
            </button>
            {shareOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShareOpen(false)} />
                <div className="absolute z-20 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]" dir={isRTL ? 'rtl' : 'ltr'} style={isRTL ? {right:0} : {left:0}}>
                  {shareOptions.map((opt, i) =>
                    opt.href ? (
                      <a key={i} href={opt.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap" onClick={() => setShareOpen(false)}>
                        {opt.icon}<span>{opt.label}</span>
                      </a>
                    ) : (
                      <button key={i} className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap w-full ${isRTL ? 'text-right' : 'text-left'}`} onClick={opt.onClick}>
                        {opt.icon}<span>{opt.label}</span>
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 7-day sections */}
        {loading ? (
          <Card className="p-8 text-center text-gray-400">טוען...</Card>
        ) : (
          <div className="space-y-4">
            {weekDates.map((dateStr, dayIdx) => {
              const date = parseISO(dateStr);
              const todayFlag = isToday(date);
              const color = dayColors[dayIdx];
              const allDayEvents = getEventsByDate(allEvents, dateStr);
              const parentEvent = allEvents
                .filter(e => e.endDate && e.endDate !== e.date && e.date <= dateStr && e.endDate >= dateStr)
                .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
              const events = parentEvent
                ? allDayEvents.filter(e => e.id !== parentEvent.id)
                : allDayEvents;
              const dayNumber = parentEvent
                ? Math.round((parseISO(dateStr).getTime() - parseISO(parentEvent.date).getTime()) / 86400000) + 1
                : null;
              const timeless = events.filter(e => !e.startTime || !e.endTime || e.startTime === e.endTime);
              const timed = events.filter(e => e.startTime && e.endTime && e.startTime !== e.endTime);

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl shadow-sm ${color.bg} ${isRTL ? 'border-r-4' : 'border-l-4'} ${color.border} p-4`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base sm:text-lg font-bold ${color.text}`}>
                        {formatDayHeader(date)}
                      </h3>
                      {todayFlag && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${color.badge}`}>
                          {t.today}
                        </span>
                      )}
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setDayShareOpen(dayShareOpen === dateStr ? null : dateStr); }}
                        className="h-7 px-2 inline-flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-colors text-xs font-medium"
                      >
                        <Share2 className={`w-3.5 h-3.5 ${color.text}`} />
                      </button>
                      {dayShareOpen === dateStr && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDayShareOpen(null)} />
                          <div className={`absolute z-20 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]`} dir={isRTL ? 'rtl' : 'ltr'} style={isRTL ? {left:0} : {right:0}}>
                            {makeDayShareOptions(dateStr).map((opt, i) =>
                              opt.href ? (
                                <a key={i} href={opt.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap" onClick={() => setDayShareOpen(null)}>
                                  {opt.icon}<span>{opt.label}</span>
                                </a>
                              ) : (
                                <button key={i} className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap w-full ${isRTL ? 'text-right' : 'text-left'}`} onClick={opt.onClick}>
                                  {opt.icon}<span>{opt.label}</span>
                                </button>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Parent (multi-day) event banner */}
                  {parentEvent && (
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 sm:p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow mb-3"
                      onClick={() => handleEventClick(parentEvent.id)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-base sm:text-lg font-bold flex-1 text-center">
                          {parentEvent.title[language]}
                          {dayNumber && ` - ${t.day} ${dayNumber}`}
                        </h4>
                        <AddToCalendarButton event={parentEvent} language={language} isRTL={isRTL} />
                      </div>
                      {parentEvent.description && (
                        <p className="text-center text-blue-100 mt-1 text-sm">
                          {parentEvent.description[language]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Events */}
                  {events.length === 0 && !parentEvent ? (
                    <p className={`text-sm opacity-50 ${color.text}`}>{t.noEvents}</p>
                  ) : (
                    <div className="space-y-2">
                      {timeless.length > 0 && (
                        <div className="space-y-1">
                          {timeless.map((e) => (
                            <div key={e.id} className="cursor-pointer" onClick={() => handleEventClick(e.id)}>
                              <p className={`font-semibold ${color.text} ${isRTL ? 'text-right' : 'text-left'}`}>{e.title[language]}</p>
                              {e.description && (
                                <p className={`text-sm opacity-75 ${color.text} ${isRTL ? 'text-right' : 'text-left'}`}>{e.description[language]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {timed.map((event) => (
                        <div
                          key={event.id}
                          className="bg-white/70 dark:bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                          onClick={() => handleEventClick(event.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex items-center gap-1.5 text-sm min-w-[100px] ${color.text}`}>
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-medium" dir="ltr">
                                {isRTL
                                  ? `${padTime(event.endTime)} - ${padTime(event.startTime)}`
                                  : `${padTime(event.startTime)} - ${padTime(event.endTime)}`
                                }
                              </span>
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-semibold text-sm sm:text-base ${color.text}`}>
                                {event.title[language]}
                              </h4>
                              {event.description && (
                                <p className={`text-xs sm:text-sm opacity-75 mt-0.5 ${color.text}`}>
                                  {event.description[language]}
                                </p>
                              )}
                            </div>
                            {event.title.en === 'Meal' && (
                              <a
                                href={`https://pay.kli.one/${language}/Calendar-Meals`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-xs font-semibold px-2 py-1 rounded-full shrink-0 transition-colors text-white bg-orange-500 hover:bg-orange-600 whitespace-nowrap"
                              >
                                {t.registerMeal}
                              </a>
                            )}
                            {event.studyLink && (
                              <a
                                href={event.studyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                title={t.studyMaterials}
                                className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors text-white ${color.badge} opacity-90 hover:opacity-100`}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
