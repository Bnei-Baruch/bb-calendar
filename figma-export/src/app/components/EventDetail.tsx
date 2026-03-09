import { useNavigate, useParams, useOutletContext, useLocation, useSearchParams } from 'react-router';
import { ArrowRight, Clock, Calendar, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Language, useTranslation } from '../utils/i18n';
import { getEventById, events } from '../data/events';

export function EventDetail() {
  const { language } = useOutletContext<{ language: Language }>();
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const t = useTranslation(language);
  const isRTL = language === 'he';

  if (!eventId) {
    return null;
  }

  const event = getEventById(eventId);

  // Get the referrer from URL query params (where user came from)
  const from = searchParams.get('from') || 'day';
  const fromDate = searchParams.get('date') || (event ? event.date : undefined);
  
  // Get parent event if this is a child event, or use current event if it's a parent
  const parentEvent = event?.parentEventId ? getEventById(event.parentEventId) : event;
  
  // Get all child events for this parent event
  const childEvents = parentEvent ? events.filter(e => e.parentEventId === parentEvent.id) : [];
  
  // Group child events by date
  const eventsByDate = childEvents.reduce((acc, evt) => {
    if (!acc[evt.date]) {
      acc[evt.date] = [];
    }
    acc[evt.date].push(evt);
    return acc;
  }, {} as Record<string, typeof childEvents>);
  
  // Sort dates
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
    // If it's a multi-day event, show date range
    if (parentEvent && parentEvent.totalDays && parentEvent.totalDays > 1) {
      const startDate = new Date(parentEvent.date);
      const endDate = new Date(parentEvent.date);
      endDate.setDate(endDate.getDate() + parentEvent.totalDays - 1);
      
      const startDay = startDate.getDate();
      const startMonth = startDate.getMonth() + 1;
      const startYear = startDate.getFullYear();
      
      const endDay = endDate.getDate();
      const endMonth = endDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      
      // Same month and year: "19-21.3.2026"
      if (startMonth === endMonth && startYear === endYear) {
        return `${startDay}-${endDay}.${startMonth}.${startYear}`;
      }
      
      // Different months, same year: "28.2-3.3.2026"
      if (startYear === endYear) {
        return `${startDay}.${startMonth}-${endDay}.${endMonth}.${startYear}`;
      }
      
      // Different years: "28.12.2025-3.1.2026"
      return `${startDay}.${startMonth}.${startYear}-${endDay}.${endMonth}.${endYear}`;
    }
    
    // Otherwise show single date
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

          {/* Show all child events grouped by date if this is a parent event or has parent event */}
          {childEvents.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className={`font-semibold text-xl mb-6 ${isRTL ? 'text-right' : ''}`}>
                {language === 'he' ? 'לוח זמנים מפורט' : 
                 language === 'en' ? 'Detailed Schedule' :
                 language === 'ru' ? 'Подробное расписание' :
                 'Horario detallado'}
              </h3>
              <div className="space-y-6">
                {sortedDates.map(date => {
                  const dateEvents = eventsByDate[date].sort((a, b) => 
                    a.startTime.localeCompare(b.startTime)
                  );
                  
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
                        {dateEvents.map(evt => {
                          const isAllDay = evt.startTime === evt.endTime;
                          const isCurrentEvent = evt.id === event.id;
                          
                          return (
                            <div
                              key={evt.id}
                              className={`
                                flex items-start gap-4 p-3 rounded-lg transition-all
                                ${isCurrentEvent ? 'bg-blue-100 border-2 border-blue-500' : 'hover:bg-gray-50'}
                              `}
                            >
                              {isRTL ? (
                                <>
                                  <div className="flex items-center gap-2 min-w-[140px] flex-row-reverse">
                                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                      {isAllDay ? (
                                        language === 'he' ? 'כל היום' :
                                        language === 'en' ? 'All day' :
                                        language === 'ru' ? 'Весь день' :
                                        'Todo el día'
                                      ) : (
                                        `${evt.startTime} - ${evt.endTime}`
                                      )}
                                    </span>
                                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  </div>
                                  <div className="flex-1 text-right">
                                    <p className={`text-gray-900 ${isCurrentEvent ? 'font-semibold' : ''}`}>
                                      {evt.title[language]}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 min-w-[140px]">
                                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                      {isAllDay ? (
                                        language === 'he' ? 'כל היום' :
                                        language === 'en' ? 'All day' :
                                        language === 'ru' ? 'Весь день' :
                                        'Todo el día'
                                      ) : (
                                        `${evt.startTime} - ${evt.endTime}`
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className={`text-gray-900 ${isCurrentEvent ? 'font-semibold' : ''}`}>
                                      {evt.title[language]}
                                    </p>
                                  </div>
                                </>
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
          )}
        </Card>
      </div>
    </div>
  );
}