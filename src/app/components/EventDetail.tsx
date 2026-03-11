import { useNavigate, useParams, useOutletContext, useLocation, useSearchParams } from 'react-router';
import { ArrowRight, Clock, Calendar, MapPin } from 'lucide-react';
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
      .filter(e => e.date >= event.date && e.date <= event.endDate! && e.id !== event.id)
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
    const date = new Date(dateStr);
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
    const date = new Date(dateStr);
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

  return (
    <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => {
            if (from === 'upcoming') {
              navigate('/upcoming');
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
              <h1 className={`text-3xl font-bold mb-4 ${isRTL ? 'text-right' : ''}`}>
                {event.title[language]}
              </h1>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`flex items-center gap-3 text-gray-700 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
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
              <p className={`text-gray-700 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
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
                      <div className={`flex items-center gap-3 mb-4 pb-2 border-b-2 border-gray-200 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        {isRTL ? (
                          <>
                            <h4 className="font-bold text-lg text-gray-800">
                              {formatDateByLanguage(date)}
                            </h4>
                            <Calendar className="w-5 h-5 text-purple-600" />
                          </>
                        ) : (
                          <>
                            <Calendar className="w-5 h-5 text-purple-600" />
                            <h4 className="font-bold text-lg text-gray-800">
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
                                <div className={`bg-blue-50 ${isRTL ? 'border-r-4' : 'border-l-4'} border-blue-600 rounded-lg shadow-sm mt-2 mb-3 space-y-1`} style={isRTL ? {paddingRight: '25px', paddingTop: '5px', paddingBottom: '5px'} : {paddingLeft: '25px', paddingTop: '5px', paddingBottom: '5px'}}>
                                  {timeless.map(evt => (
                                    <div key={evt.id}>
                                      <p className={`text-blue-900 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{evt.title[language]}</p>
                                      {evt.description && (
                                        <p className={`text-blue-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{evt.description[language]}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {timed.map(evt => (
                                <div
                                  key={evt.id}
                                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all"
                                >
                                  <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap" dir="ltr">
                                    {isRTL
                                      ? `${evt.endTime} - ${evt.startTime}`
                                      : `${evt.startTime} - ${evt.endTime}`}
                                  </span>
                                  <p className="flex-1 text-gray-900">{evt.title[language]}</p>
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