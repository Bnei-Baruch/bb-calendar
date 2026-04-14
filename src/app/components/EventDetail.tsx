import { useNavigate, useParams, useOutletContext, useLocation, useSearchParams } from 'react-router';
import { useState, useEffect } from 'react';
import { ArrowRight, Clock, Calendar, MapPin, BookOpen, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Language, useTranslation } from '../utils/i18n';
import { getEventById } from '../data/events';
import { useEvents } from '../context/EventsContext';

export function EventDetail() {
  const { language } = useOutletContext<{ language: Language }>();
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const t = useTranslation(language);
  const isRTL = language === 'he';

  const { events: allEvents } = useEvents();
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [eventId]);

  if (!eventId) {
    return null;
  }

  const event = getEventById(allEvents, eventId);

  // Get the referrer from URL query params (where user came from)
  const from = searchParams.get('from') || 'day';
  const fromDate = searchParams.get('date') || (event ? event.date : undefined);

  const isMultiDay = !!(event?.endDate && event.endDate !== event.date);

  // For multi-day events: collect all events within the date range, grouped by day
  const eventsByDate: Record<string, typeof allEvents> = {};
  if (event && isMultiDay) {
    // Pre-populate all days in range so every day shows even if empty
    let d = event.date;
    while (d <= event.endDate!) {
      eventsByDate[d] = [];
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      d = next.toISOString().split('T')[0];
    }

    const toMin = (t: string) => { if (!t) return -1; const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    allEvents
      .filter(e =>
        e.date >= event.date &&
        e.date <= event.endDate! &&
        e.id !== event.id &&
        !(e.endDate && e.endDate !== e.date)
      )
      .forEach(e => {
        if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
        eventsByDate[e.date].push(e);
      });
    Object.keys(eventsByDate).forEach(d => {
      eventsByDate[d].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    });
  }

  const sortedDates = Object.keys(eventsByDate).sort();

  if (!event) {
    return (
      <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">Event not found</p>
          <Button onClick={() => navigate('/')}>
            {t.backToToday}
          </Button>
        </Card>
      </div>
    );
  }

  const formatDateByLanguage = (dateStr: string) => {
    const [y, mo, da] = dateStr.split('-').map(Number);
    const date = new Date(y, mo - 1, da);
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
  
  const formatShortDateByLanguage = (dateStr: string) => {
    const [y, mo, da] = dateStr.split('-').map(Number);
    const date = new Date(y, mo - 1, da);
    const monthNames = {
      he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
      es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    };

    const day = date.getDate();
    const month = monthNames[language][date.getMonth()];
    const year = date.getFullYear();

    if (language === 'he') {
      return `${day} ${month} ${year}`;
    }
    return `${month} ${day}, ${year}`;
  };
  
  const getEventDateRange = () => {
    if (isMultiDay && event.endDate) {
      const [sy, sm, sd] = event.date.split('-').map(Number);
      const [ey, em, ed] = event.endDate.split('-').map(Number);
      if (sm === em && sy === ey) return `${sd}-${ed}.${sm}.${sy}`;
      if (sy === ey) return `${sd}.${sm}-${ed}.${em}.${sy}`;
      return `${sd}.${sm}.${sy}-${ed}.${em}.${ey}`;
    }
    return formatDateByLanguage(event.date);
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'conference':
        return <Badge className="bg-purple-500">{language === 'he' ? 'כנס' : 'Conference'}</Badge>;
      case 'holiday':
        return <Badge className="bg-green-500">{language === 'he' ? 'חג' : 'Holiday'}</Badge>;
      default:
        return <Badge className="bg-blue-500">{language === 'he' ? 'רגיל' : 'Regular'}</Badge>;
    }
  };

  const calculateDuration = () => {
    const [startHour, startMin] = event.startTime.split(':').map(Number);
    const [endHour, endMin] = event.endTime.split(':').map(Number);
    const durationMin = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    
    if (hours > 0 && mins > 0) {
      return language === 'he' 
        ? `${hours} שעות ו-${mins} דקות`
        : `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return language === 'he' ? `${hours} שעות` : `${hours}h`;
    } else {
      return language === 'he' ? `${mins} דקות` : `${mins}min`;
    }
  };

  const padTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    return `${(h || '0').padStart(2, '0')}:${(m || '0').padStart(2, '0')}`;
  };

  const buildScheduleText = () => {
    const appTitle = { he: 'לוח אירועים', en: 'Events Calendar', ru: 'Календарь событий', es: 'Calendario de Eventos' }[language];
    const siteLabel = { he: 'לאתר לוח אירועים', en: 'Events Calendar website', ru: 'Сайт календаря событий', es: 'Sitio web del calendario de eventos' }[language];
    const lines: string[] = [`*${appTitle}*`, `*${event.title[language]}*`, ''];
    if (isMultiDay && event.endDate) lines.push(getEventDateRange());
    else lines.push(formatDateByLanguage(event.date));
    if (event.description?.[language]) { lines.push(''); lines.push(event.description[language]!); }
    sortedDates.forEach(date => {
      lines.push('');
      lines.push(`*${formatDateByLanguage(date)}*`);
      lines.push('──────────');
      const toMin = (tt: string) => { if (!tt) return -1; const [h, m] = tt.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
      const dateEvents = [...eventsByDate[date]].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
      const timeless = dateEvents.filter(e => !e.startTime || !e.endTime || e.startTime === e.endTime);
      const timed = dateEvents.filter(e => e.startTime && e.endTime && e.startTime !== e.endTime);
      timeless.forEach(e => lines.push(e.title[language]));
      timed.forEach(e => {
        const time = `${padTime(e.startTime)} - ${padTime(e.endTime)}`;
        lines.push(`${time}  ${e.title[language]}`);
      });
    });
    lines.push('');
    lines.push(`${siteLabel}: https://cal.kli.one`);
    return lines.join('\n');
  };

  const shareOptions = [
    {
      label: isRTL ? 'שתף בווטסאפ' : 'Share on WhatsApp',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.549 4.076 1.504 5.786L0 24l6.395-1.682A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.388l-.36-.214-3.732.981.998-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>,
      href: `https://wa.me/?text=${encodeURIComponent(buildScheduleText())}`,
    },
    {
      label: isRTL ? 'שתף בטלגרם' : 'Share on Telegram',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-500"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.772l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.787z"/></svg>,
      href: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(buildScheduleText())}`,
    },
    {
      label: isRTL ? 'העתק טקסט' : 'Copy text',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
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
    <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => {
            if (from === 'upcoming') {
              navigate('/upcoming');
            } else if (from === 'holidays') {
              navigate('/holidays');
            } else if (from === 'year') {
              navigate('/calendar');
            } else {
              navigate(`/?date=${fromDate}`);
            }
          }}
          className="mb-6"
        >
          <ArrowRight className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
          <span className={isRTL ? 'mr-2' : 'ml-2'}>{t.backToCalendar}</span>
        </Button>

        <Card className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className={`text-3xl font-bold mb-4 dark:text-gray-100 ${isRTL ? 'text-right' : ''}`}>
                {event.title[language]}
              </h1>
            </div>
            {sortedDates.length > 0 && (
              <div className="relative shrink-0 ms-4">
                <button
                  onClick={() => setShareOpen(v => !v)}
                  className="h-9 w-auto px-3 inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm text-sm text-gray-700 dark:text-gray-300"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{isRTL ? 'שתף' : 'Share'}</span>
                </button>
                {shareOpen && (
                  <div className={`absolute top-full mt-1 ${isRTL ? 'left-0' : 'right-0'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {shareOptions.map((opt, i) =>
                      opt.href ? (
                        <a key={i} href={opt.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300" onClick={() => setShareOpen(false)}>
                          {opt.icon}<span>{opt.label}</span>
                        </a>
                      ) : (
                        <button key={i} onClick={opt.onClick} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                          {opt.icon}<span>{opt.label}</span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className={`flex items-center gap-3 text-gray-700 dark:text-gray-300 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              {isRTL ? (
                <>
                  <span className="text-lg">{getEventDateRange()}</span>
                  <Calendar className="w-5 h-5 text-blue-600" />
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-lg">{getEventDateRange()}</span>
                </>
              )}
            </div>
          </div>

          {event.description && (
            <div className="mt-8 pt-6 border-t">
              <h3 className={`font-semibold text-lg mb-3 ${isRTL ? 'text-right' : ''}`}>{t.description}</h3>
              <p className={`text-gray-700 dark:text-gray-300 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                {event.description[language]}
              </p>
            </div>
          )}

          {sortedDates.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className={`font-semibold text-xl mb-6 ${isRTL ? 'text-right' : ''}`}>
                {language === 'he' ? 'לוח זמנים מפורט' : 
                 language === 'en' ? 'Detailed Schedule' :
                 language === 'ru' ? 'Подробное расписание' :
                 'Horario detallado'}
              </h3>
              <div className="space-y-6">
                {sortedDates.map(date => {
                  const toMin = (t: string) => { if (!t) return -1; const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
                  const dateEvents = eventsByDate[date].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
                  
                  return (
                    <div key={date}>
                      <div className={`flex items-center gap-3 mb-4 pb-2 border-b-2 border-purple-300 dark:border-purple-700 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        {isRTL ? (
                          <>
                            <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                              {formatDateByLanguage(date)}
                            </h4>
                            <Calendar className="w-5 h-5 text-purple-600" />
                          </>
                        ) : (
                          <>
                            <Calendar className="w-5 h-5 text-purple-600" />
                            <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                              {formatDateByLanguage(date)}
                            </h4>
                          </>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const timeless = dateEvents.filter(e => !e.startTime || !e.endTime || e.startTime === e.endTime);
                          const timed = dateEvents.filter(e => e.startTime && e.endTime && e.startTime !== e.endTime);
                          return (
                            <>
                              {timeless.length > 0 && (
                                <div className={`bg-blue-50 dark:bg-blue-900/20 ${isRTL ? 'border-r-4' : 'border-l-4'} border-blue-600 rounded-lg shadow-sm mt-2 mb-3 space-y-1`} style={isRTL ? {paddingRight: '25px', paddingTop: '5px', paddingBottom: '5px'} : {paddingLeft: '25px', paddingTop: '5px', paddingBottom: '5px'}}>
                                  {timeless.map(evt => (
                                    <div key={evt.id}>
                                      <p className={`text-blue-900 dark:text-blue-200 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{evt.title[language]}</p>
                                      {evt.description && (
                                        <p className={`text-blue-700 dark:text-blue-300 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{evt.description[language]}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {timed.map(evt => (
                                <div
                                  key={evt.id}
                                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap" dir="ltr">
                                    {isRTL
                                      ? `${evt.endTime} - ${evt.startTime}`
                                      : `${evt.startTime} - ${evt.endTime}`}
                                  </span>
                                  <p className="flex-1 text-gray-900 dark:text-gray-100">{evt.title[language]}</p>
                                  {evt.studyLink && (
                                    <a
                                      href={evt.studyLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 shrink-0 transition-colors"
                                    >
                                      <BookOpen className="w-4 h-4 text-white" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}