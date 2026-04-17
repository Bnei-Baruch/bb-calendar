import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus } from 'lucide-react';
import { Event } from '../data/events';
import { Language, useTranslation } from '../utils/i18n';
import { getICSUrl, getGoogleCalendarUrl } from '../utils/calendar';

interface Props {
  event: Event;
  language: Language;
  isRTL: boolean;
}

export function AddToCalendarButton({ event, language, isRTL }: Props) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslation(language);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 90;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      const style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 50,
        minWidth: 180,
      };

      if (openUpward) {
        style.bottom = window.innerHeight - rect.top + 4;
      } else {
        style.top = rect.bottom + 4;
      }

      if (isRTL) {
        style.left = rect.left;
      } else {
        style.right = window.innerWidth - rect.right;
      }

      setDropdownStyle(style);
    }
  }, [open, isRTL]);

  const dropdown = open ? (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div
        className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
        style={dropdownStyle}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <a
          href={getGoogleCalendarUrl(event, language)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap"
          onClick={e => { e.stopPropagation(); setOpen(false); }}
        >
          <svg viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
            <path fill="#4285F4" d="M45.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h12.1c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.7-9.5 6.7-16.3z"/>
            <path fill="#34A853" d="M24 46c6 0 11.1-2 14.8-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.7 2.1-5.9 0-10.9-4-12.7-9.4H4v5.7C7.7 41.1 15.4 46 24 46z"/>
            <path fill="#FBBC05" d="M11.3 27.8A13.7 13.7 0 0 1 10.8 24c0-1.3.2-2.6.5-3.8V14.5H4A22 22 0 0 0 2 24c0 3.5.8 6.8 2 9.8l7.3-6z"/>
            <path fill="#EA4335" d="M24 10.8c3.3 0 6.3 1.1 8.6 3.3l6.5-6.5C35.1 4 29.9 2 24 2 15.4 2 7.7 6.9 4 14.5l7.3 5.7c1.8-5.4 6.8-9.4 12.7-9.4z"/>
          </svg>
          {t.googleCalendar}
        </a>
        <a
          href={getICSUrl(event, language)}
          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap`}
          onClick={e => { e.stopPropagation(); setOpen(false); }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
          </svg>
          {t.icsCalendar}
        </a>
      </div>
    </>
  ) : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors text-white bg-blue-500 hover:bg-blue-600 whitespace-nowrap"
      >
        <CalendarPlus className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{t.addToCalendar}</span>
      </button>
      {createPortal(dropdown, document.body)}
    </div>
  );
}
