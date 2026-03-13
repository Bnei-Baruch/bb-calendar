import { Link, useLocation } from 'react-router';
import { Calendar, CalendarDays } from 'lucide-react';
import { MeetingIcon } from './icons/MeetingIcon';
import { Language, useTranslation } from '../utils/i18n';

interface ViewNavigationProps {
  currentLanguage: Language;
}

export function ViewNavigation({ currentLanguage }: ViewNavigationProps) {
  const t = useTranslation(currentLanguage);
  const location = useLocation();
  const isRTL = currentLanguage === 'he';

  const navItems = [
    { path: '/', label: t.todayView, icon: Calendar, isMeeting: false },
    { path: '/upcoming', label: t.upcomingEvents, icon: null, isMeeting: true },
    { path: '/calendar', label: t.calendarView, icon: CalendarDays, isMeeting: false },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="container mx-auto px-1 sm:px-4">
        <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-6 py-3 sm:py-4 transition-colors border-b-2 min-w-0
                  ${isActive 
                    ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                  ${isRTL ? 'flex-row-reverse' : ''}
                `}
              >
                {item.isMeeting
                  ? <MeetingIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" isActive={isActive} />
                  : item.icon && <item.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                }
                <span className="font-medium text-xs sm:text-sm leading-tight text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}