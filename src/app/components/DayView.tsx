import { useNavigate, useSearchParams, useOutletContext } from 'react-router';
import { ChevronLeft, ChevronRight, Clock, CalendarIcon } from 'lucide-react';
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
  const events = getEventsByDate(allEvents, dateParam);

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
    <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDay('prev')}
            className="h-11 w-11 border border-blue-200 bg-blue-50 hover:bg-blue-100 shadow-sm hover:shadow-md"
          >
            {isRTL ? <ChevronRight className="w-6 h-6 text-blue-600" /> : <ChevronLeft className="w-6 h-6 text-blue-600" />}
          </Button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-3xl font-bold">
                {formatDateByLanguage(currentDate)}
              </h2>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer shadow-sm hover:shadow-md"
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
            className="h-11 w-11 border border-blue-200 bg-blue-50 hover:bg-blue-100 shadow-sm hover:shadow-md"
          >
            {isRTL ? <ChevronLeft className="w-6 h-6 text-blue-600" /> : <ChevronRight className="w-6 h-6 text-blue-600" />}
          </Button>
        </div>

        <div className="space-y-5">
          {loading ? (
            <Card className="p-8 text-center text-gray-400">טוען...</Card>
          ) : events.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              {t.noEvents}
            </Card>
          ) : (
            events.map((event) => (
              <Card
                key={event.id}
                className={`border-0 ${getEventTypeColor(event.type)} p-4 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => handleEventClick(event.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 min-w-[120px]">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">
                      {event.startTime} - {event.endTime}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}