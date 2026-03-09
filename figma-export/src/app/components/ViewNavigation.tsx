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
    { path: '/', label: t.todayView, icon: Calendar },
    { path: '/upcoming', label: t.upcomingEvents, icon: MeetingIcon },
    { path: '/calendar', label: t.calendarView, icon: CalendarDays },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-6 py-4 transition-colors border-b-2
                  ${isActive 
                    ? 'border-blue-600 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                  ${isRTL ? 'flex-row-reverse' : ''}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}