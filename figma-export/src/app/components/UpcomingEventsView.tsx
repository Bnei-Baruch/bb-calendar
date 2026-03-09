import { Link, useOutletContext } from 'react-router';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Language, useTranslation } from '../utils/i18n';
import { events } from '../data/events';

export function UpcomingEventsView() {
  const { language } = useOutletContext<{ language: Language }>();
  const t = useTranslation(language);
  const isRTL = language === 'he';

  // Get upcoming conferences and special events (excluding regular daily events)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today && (event.type === 'conference' || event.type === 'holiday');
    })
    .filter(event => !event.parentEventId) // Only parent events, not individual sessions
    .sort((a, b) => a.date.localeCompare(b.date));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };
  
  const getEventDateRange = (event: typeof upcomingEvents[0]) => {
    if (!event.totalDays || event.totalDays <= 1) {
      return formatDate(event.date);
    }
    
    // Calculate end date
    const startDate = new Date(event.date);
    const endDate = new Date(event.date);
    endDate.setDate(endDate.getDate() + event.totalDays - 1);
    
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
  };

  const formatTime = (time: string) => {
    return time;
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t.upcomingEvents}</h2>
        <p className="text-gray-600">
          {language === 'he' && 'כנסים מיוחדים ואירועים קרובים של קבלה לעם'}
          {language === 'en' && 'Special congresses and upcoming events from Kabbalah for the People'}
          {language === 'ru' && 'Специальные конгрессы и предстоящие мероприятия от Каббала народу'}
          {language === 'es' && 'Congresos especiales y próximos eventos de Cabalá para el Pueblo'}
        </p>
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {language === 'he' && 'אין אירועים מיוחדים קרובים'}
            {language === 'en' && 'No upcoming special events'}
            {language === 'ru' && 'Нет предстоящих специальных событий'}
            {language === 'es' && 'No hay próximos eventos especiales'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event) => (
            <Link
              key={event.id}
              to={`/event/${event.id}?from=upcoming`}
              className={`
                block bg-white rounded-lg border-2 border-gray-200 
                hover:border-blue-500 hover:shadow-lg transition-all
                overflow-hidden group
                ${isRTL ? 'text-right' : 'text-left'}
              `}
            >
              <div className={`
                p-6 space-y-4
                ${event.type === 'conference' ? 'bg-gradient-to-br from-blue-50 to-purple-50' : 'bg-gradient-to-br from-orange-50 to-yellow-50'}
              `}>
                <div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                    event.type === 'conference' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {event.type === 'conference' 
                      ? (language === 'he' ? 'כנס' : language === 'en' ? 'Congress' : language === 'ru' ? 'Конгресс' : 'Congreso')
                      : (language === 'he' ? 'חג' : language === 'en' ? 'Holiday' : language === 'ru' ? 'Праздник' : 'Fiesta')
                    }
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {event.title[language]}
                  </h3>
                </div>

                <div className={`flex items-center gap-2 text-gray-700 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span dir="ltr">{getEventDateRange(event)}</span>
                </div>

                {/* Only show times for single-day events */}
                {(!event.totalDays || event.totalDays <= 1) && (
                  <div className={`flex items-center gap-2 text-gray-700 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span dir="ltr">{event.startTime} - {event.endTime}</span>
                  </div>
                )}

                {event.location && (
                  <div className={`flex items-center gap-2 text-gray-700 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>{event.location}</span>
                  </div>
                )}

                {event.description && (
                  <p className="text-gray-600 text-sm line-clamp-2 mt-2">
                    {event.description[language]}
                  </p>
                )}

                {event.totalDays && event.totalDays > 1 && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-purple-700">
                      {event.totalDays} {
                        language === 'he' ? 'ימים' :
                        language === 'en' ? 'days' :
                        language === 'ru' ? 'дней' :
                        'días'
                      }
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}