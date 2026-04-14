import React from 'react';
import { Link, useLocation } from 'react-router';
import { Calendar, CalendarDays, Scroll, MessageSquare } from 'lucide-react';
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
    { path: '/',         label: t.todayView,     shortLabel: t.todayViewShort, icon: Calendar,     isMeeting: false, pill: 'bg-blue-600 text-white shadow-sm',  inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60', bottomActive: 'text-blue-600 dark:text-blue-400',   bottomInactive: 'text-gray-400 dark:text-gray-500' },
    { path: '/upcoming', label: t.upcomingEvents, shortLabel: t.upcomingShort,  icon: null,         isMeeting: true,  pill: 'bg-blue-600 text-white shadow-sm',  inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60', bottomActive: 'text-blue-600 dark:text-blue-400',   bottomInactive: 'text-gray-400 dark:text-gray-500' },
    { path: '/holidays', label: t.holidays,       shortLabel: t.holidays,       icon: Scroll,       isMeeting: false, pill: 'bg-amber-500 text-white shadow-sm', inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60', bottomActive: 'text-amber-500 dark:text-amber-400', bottomInactive: 'text-gray-400 dark:text-gray-500' },
    { path: '/calendar', label: t.calendarView,   shortLabel: t.calendarShort,  icon: CalendarDays,    isMeeting: false, pill: 'bg-blue-600 text-white shadow-sm',  inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60', bottomActive: 'text-blue-600 dark:text-blue-400',   bottomInactive: 'text-gray-400 dark:text-gray-500' },
    { path: '/posts',    label: t.posts,         shortLabel: t.postsShort,     icon: MessageSquare,   isMeeting: false, pill: 'bg-sky-500 text-white shadow-sm',   inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60', bottomActive: 'text-sky-500 dark:text-sky-400',     bottomInactive: 'text-gray-400 dark:text-gray-500' },
  ];

  return (
    <>
      {/* Desktop: top pill nav */}
      <nav className="hidden sm:block bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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

      {/* Mobile: fixed bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-area-inset-bottom">
        <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${isActive ? item.bottomActive : item.bottomInactive}`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? (item.path === '/holidays' ? 'bg-amber-100 dark:bg-amber-900/30' : item.path === '/posts' ? 'bg-sky-100 dark:bg-sky-900/30' : 'bg-blue-100 dark:bg-blue-900/30') : ''}`}>
                  {item.isMeeting
                    ? <MeetingIcon className="w-5 h-5" isActive={isActive} />
                    : item.icon && <item.icon className="w-5 h-5" />
                  }
                </div>
                <span className="text-[10px] font-semibold leading-tight text-center">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
