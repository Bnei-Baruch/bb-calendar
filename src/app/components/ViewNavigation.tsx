import { Link, useLocation } from 'react-router';
import { Calendar, CalendarDays, Scroll } from 'lucide-react';
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
    { path: '/',         label: t.todayView,      icon: Calendar,     isMeeting: false, pill: 'bg-blue-600 text-white shadow-sm',  inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60' },
    { path: '/upcoming', label: t.upcomingEvents,  icon: null,         isMeeting: true,  pill: 'bg-blue-600 text-white shadow-sm',  inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60' },
    { path: '/holidays', label: t.holidays,        icon: Scroll,       isMeeting: false, pill: 'bg-amber-500 text-white shadow-sm', inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60' },
    { path: '/calendar', label: t.calendarView,    icon: CalendarDays, isMeeting: false, pill: 'bg-blue-600 text-white shadow-sm',  inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-3 sm:px-4 py-2 flex justify-center">
        <div className={`inline-flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-lg transition-all duration-150 whitespace-nowrap
                  ${isActive ? item.pill : item.inactive}
                  ${isRTL ? 'flex-row-reverse' : ''}
                `}
              >
                {item.isMeeting
                  ? <MeetingIcon className="w-5 h-5 shrink-0" isActive={isActive} />
                  : item.icon && <item.icon className="w-5 h-5 shrink-0" />
                }
                <span className="font-semibold text-sm sm:text-base leading-tight truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
