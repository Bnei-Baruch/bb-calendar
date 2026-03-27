import React from 'react';
import { Link } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, LayoutGrid } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { Language, useTranslation } from '../utils/i18n';

interface HeaderProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export function Header({ currentLanguage, onLanguageChange }: HeaderProps) {
  const t = useTranslation(currentLanguage);
  const isRTL = currentLanguage === 'he';

  const logoContent = {
    he: {
      mainText: 'בני ברוך',
      subText: 'קהילת לומדי קבלה'
    },
    en: {
      mainText: 'Bnei Baruch',
      subText: 'Kabbalah Learning Community'
    },
    ru: {
      mainText: 'Бней Барух',
      subText: 'Сообщество изучающих Каббалу'
    },
    es: {
      mainText: 'Bnei Baruch',
      subText: 'Comunidad de Estudiantes de Cabalá'
    }
  };

  const currentLogoText = logoContent[currentLanguage];

  const [linksOpen, setLinksOpen] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);

  const usefulLinksTitle: Record<Language, string> = {
    he: 'קישורים שימושיים', en: 'Useful Links', ru: 'Полезные ссылки', es: 'Enlaces útiles',
  };

  const usefulLinks = [
    {
      label: { he: 'חומרי לימוד', en: 'Study Materials', ru: 'Учебные материалы', es: 'Materiales de Estudio' },
      sublabel: 'study.kli.one', href: 'https://study.kli.one',
    },
    {
      label: { he: 'מערכת הערבות', en: 'Arvut System', ru: 'Система Арвут', es: 'Sistema Arvut' },
      sublabel: 'arvut.kli.one', href: 'https://arvut.kli.one',
    },
    {
      label: { he: 'אתר הכנס', en: 'Convention', ru: 'Конвенция', es: 'Convención' },
      sublabel: 'convention.kli.one', href: 'https://convention.kli.one',
    },
    {
      label: { he: 'קבלה מדיה', en: 'Kabbalah Media', ru: 'Каббала Медиа', es: 'Kabbalah Media' },
      sublabel: 'kabbalahmedia.info', href: 'https://kabbalahmedia.info',
    },
    {
      label: { he: 'תשלומי בב', en: 'BB Payments', ru: 'Платежи BB', es: 'Pagos BB' },
      sublabel: 'pay.kli.one', href: 'https://pay.kli.one',
    },
    {
      label: { he: 'הבית הוירטואלי', en: 'Virtual Home', ru: 'Виртуальный дом', es: 'Hogar Virtual' },
      sublabel: 'kli.one', href: 'https://kli.one',
    },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (linksRef.current && !linksRef.current.contains(e.target as Node)) {
        setLinksOpen(false);
      }
    }
    if (linksOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [linksOpen]);

  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  return (
    <header className="relative z-50 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900 border-b border-gray-200/80 dark:border-gray-700 shadow-sm backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-5">
        <div className={`flex items-center justify-between relative ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 sm:gap-3 group z-10"
          >
            <div className={`flex items-center gap-2 sm:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* SVG Logo */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="50 0 330 600" width="56" height="56">
                  <defs>
                    <linearGradient id="logoGrad" x1="-364.4" x2="-361.6" y1="869.3" y2="869.3" gradientTransform="matrix(0 -190 190 0 -164969.3 -68673)" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#00b6be"/>
                      <stop offset="0.3" stopColor="#00b6be"/>
                      <stop offset="1" stopColor="#fff"/>
                    </linearGradient>
                    <clipPath id="logoClip">
                      <path fill="none" d="M221.6 59.5c-.9 7.1-.8 11.3-3 18.1-1.8 5.7-3.3 8.8-6.5 13.8-3.5 3.7-5.1 6.2-9.1 5.3-2.3-.5-3.7-1.6-5-3.7-3.4-5-18.1-42-20.2-43.6 0 2.7 11.7 43.4 12.7 54.2.9 8.7-.6 15.2-1.4 23.9l-3.2 14.9c-2.3.8-7.5-9-12.1-15.9-4-6-6.1-9.5-9.6-16 1-4.6 1.8-10.1 1.3-17.6s10.6-16.1 10.2-18.6c-.1-.8-3 1.1-5.9 3.1s-5.9 3.9-6.1 3c-.5-2.3-1.2-4.6-2-7-5.2-15.1-18.5-26.8-23.5-30 2.8 7.1 11.7 15.6 15.2 27.8s5 24.6 1.9 27c-4 3.2-14.2-1-22.6-6.2-12.1-7.5-15.8-17.6-19.6-17.6s8.4 12.9 10.1 20.3S98.3 97.3 96 97c-4.1-.5-5 1.6-1.7 2.7 4.9 1.6 13.8 3.2 18.6 3.9 16.1 2.1 30.2 1.7 43.3 14.3 10.9 10.5 14.8 20.2 17.1 35.6 1.3 8.3-9.9 5.3-30.5-7.2-7.4-4.2-16.7-12.1-18-25.8-1.6-3.7-3.5 10.3-1.1 15.7.8 1.9-4.6.5-10.9-.8-5.2-1.1-11.1-2.2-14.4-1.5-4.3 1.1 21.7 3.7 33.7 14 6.4 5.5 27.4 20.9 35.4 28.3 2.3 2.1 1.1 8.1-2.4 9.1-4.2 1.3-11.8.7-19.8-.4-14.3-1.9-20.5-9-27.1-14.8-6.6-5.9-15.1-20.9-15.1-20.9 0 4.8.7 11.9 3.6 16.9 2.6 4.3 4.3 6.7 7.6 10.6 0 0-26.4-6.5-33.4-6.5 1 2.7 17.4 6.3 25.1 10.7 9.2 5.2 40.4 21.2 39.4 23.8-2.1 5.5-28.3 3.7-37.4 4.8-9.3 1.1-23.9 2.7-24 5.7-.1 1.8 5.1 1.3 11.1.8 3.8-.3 8-.6 11.2-.3 15.8 1.5 26.7 1.6 40.3 5.3 9.6 2.6 21.1 9.9 23.2 14.4 2.1 4.4 4.5 8.5 4 21.9l-.9 33c-102.7 1.3-150.2 9.8-150.2 9.8s47.5 8.5 150.2 9.8l.9 33c.4 13.4-1.9 17.5-4 21.9-2.1 4.5-13.6 11.8-23.2 14.4-13.6 3.7-24.5 3.8-40.3 5.3-3.2.3-7.4 0-11.2-.3-6-.5-11.2-1-11.1.8.2 3 14.8 4.6 24 5.7 9.1 1 35.3-.7 37.4 4.8 1 2.7-30.2 18.6-39.4 23.8-7.7 4.5-24.1 8-25.1 10.7 7 0 33.4-6.5 33.4-6.5-3.2 3.9-4.9 6.3-7.6 10.6-3 5-3.6 12.1-3.6 16.9 0 0 8.6-15 15.1-20.9 6.6-5.9 12.7-12.9 27.1-14.8 7.9-1.1 15.5-1.7 19.8-.4 3.4 1.1 4.6 7 2.4 9.1-8 7.4-29 22.9-35.4 28.3-12 10.3-38.1 12.9-33.7 14 3.4.7 9.2-.4 14.4-1.5 6.3-1.3 11.8-2.7 10.9-.8-2.4 5.4-.4 19.4 1.1 15.7 1.3-13.7 10.5-21.6 18-25.8 20.6-12.6 31.7-15.5 30.5-7.2-2.3 15.4-6.2 25.1-17.1 35.6-13.1 12.6-27.2 12.2-43.3 14.3-4.9.6-13.8 2.2-18.6 3.9-3.3 1.1-2.4 3.2 1.7 2.7 2.4-.3 28.9-5 27.2 2.3-1.7 7.4-13.9 20.3-10.1 20.3s7.5-10.2 19.6-17.6c8.4-5.2 18.6-9.4 22.6-6.2 3.1 2.5 1.6 14.8-1.9 27s-12.4 20.6-15.2 27.8c5-3.2 18.3-14.9 23.5-30 .8-2.4 1.5-4.7 2-7 .2-.9 3.2 1.1 6.1 3 2.9 2 5.8 3.9 5.9 3.1.4-2.5-10.6-11.1-10.2-18.6.5-7.5-.3-12.9-1.3-17.6 3.4-6.4 5.6-9.9 9.6-16 4.6-6.9 9.8-16.7 12.1-15.9l3.2 14.9c.8 8.7 2.3 15.3 1.4 23.9-1 10.8-12.7 51.5-12.7 54.2 2-1.6 16.8-38.6 20.2-43.6 1.3-2.1 2.7-3.2 5-3.7 4-.9 5.6 1.6 9.1 5.3 3.2 5 4.7 8.1 6.5 13.8 2.2 6.7 2.2 11 3 18.1 1.2 9.9 1.6 15.5 1.5 25.5 3-2.1 7.3-31.4 2.5-48.4s-13.2-19.9-17.1-27.6 3.2-31.3 4-35.6c1.4-7 5.7-9.8 9.4-4.9 2.9 3.9 25 40.5 28.9 51.1 4 10.6 12.4 43.5 14.9 44.6-.3-7.1-6.6-28-7.8-35-1.4-7.6-2.3-15.9-2.3-18.1s7.1 5.7 14.5 12.4 15 13.5 16 12.4c-16.1-17.5-30.7-37.1-39.3-48.8-4.1-5.6-8.8-16.3-8.8-19.1s8.9 5.3 12.7 8.2c7.6 5.8 22 16.4 22.5 12.1 0 0-27.7-24.8-35.7-35.2-8.1-10.4-3.1-14 6.9-15.6s16 3.3 24.1 8.2c8.7 5.2 17.2 14.5 24.2 21.2 7.5 7.2 11.1 11.6 17.6 19.7 3.2-1.2-6.8-16.3-13.4-22.6-6.1-5.8-12.6-13.7-8.1-18.9 2.7-3.1 18.7-2.5 31.6-2 8.9.4 16.3.7 16.6-.1 1-2.6-35.8-10.5-54-10.7-18.2-.1-41.4-16.8-37.7-23s21.6-2.2 52.4 10.4c4.8.4-8.9-8.9-12.9-12 12.4-.4 32.5-9.7 31.9-12.4-19.5 6.2-30.5 6.6-45.1 2.2s-40-13-40-15.8c0-8-.3-18.4.7-32.8l1.1-20.4c98.4-1.6 143.9-9.7 143.9-9.7s-45.5-8.1-143.9-9.7l-1.1-20.4c-1-14.4-.7-24.8-.7-32.8s25.4-11.4 40-15.8 25.5-4 45.1 2.2c.5-2.7-19.5-12-31.9-12.4 4-3.1 17.6-12.4 12.9-12-30.8 12.6-48.7 16.6-52.4 10.4s19.5-22.9 37.7-23 55-8.1 54-10.7c-.3-.8-7.7-.5-16.6 0-12.9.5-29 1-31.6-2-4.5-5.2 1.9-13.1 8.1-18.9 6.6-6.3 16.6-21.4 13.4-22.6-6.5 8-10.1 12.4-17.6 19.7-7 6.8-15.5 16.1-24.2 21.2-8.1 4.8-14.1 9.8-24.1 8.2s-15-5.2-6.9-15.6 35.7-35.2 35.7-35.2c-.5-4.3-14.9 6.3-22.5 12.1-3.7 2.9-12.6 8.7-12.7 5.9 0-2.8 4.7-11.2 8.8-16.8 8.6-11.7 23.2-31.3 39.3-48.8-1-1.1-8.6 5.7-16 12.4-7.4 6.8-14.5 13.5-14.5 12.4 0-2.2.9-10.5 2.3-18.1 1.3-7 7.5-27.9 7.8-35-2.5 1.1-10.9 33.9-14.9 44.6-3.9 10.5-26 47.2-28.9 51.1-3.7 4.9-8 2.2-9.4-4.9-.8-4.3-7.9-27.9-4-35.6s12.3-10.6 17.1-27.6.5-46.3-2.5-48.4c0 10-.3 15.6-1.5 25.5"/>
                    </clipPath>
                  </defs>
                  <g clipPath="url(#logoClip)">
                    <path fill="url(#logoGrad)" d="M22.7 34h354.7v532H22.7z"/>
                  </g>
                  <path fill="#00b6be" d="M302.3 207c3.4 3.6 8.4 5.5 13.6 4.5s9.2-4.6 10.9-9.3c-3.4-3.6-8.4-5.5-13.6-4.5s-9.2 4.6-10.9 9.3m-28-64.9c0 4.2 3.4 7.5 7.5 7.5s7.5-3.4 7.5-7.5-3.4-7.5-7.5-7.5-7.5 3.4-7.5 7.5M79.2 190.4c1.8 5.7 6.4 10.3 12.5 11.8s12.3-.4 16.6-4.5c-1.8-5.7-6.4-10.3-12.5-11.8s-12.3.4-16.6 4.5M96 160.8c.4-5.3-1.9-10.7-6.5-14.1-4.6-3.3-10.4-3.8-15.4-1.8-.4 5.3 1.9 10.7 6.5 14.1 4.6 3.3 10.4 3.8 15.4 1.8m16.1-75.3c0-3.9-3.1-7-7-7s-7 3.1-7 7 3.1 7 7 7 7-3.1 7-7m1.3 40.4c.3-4.8-1.7-9.6-5.8-12.7-4.1-3-9.4-3.4-13.8-1.6-.3 4.8 1.7 9.6 5.8 12.7 4.1 3 9.4 3.4 13.8 1.6M126.7 227c-4.4-4-10.7-5.7-16.7-4-6.1 1.7-10.5 6.5-12.1 12.2 4.4 4 10.7 5.7 16.7 4 6.1-1.7 10.5-6.5 12.1-12.2m-.5-60.7c0 4.3 3.5 7.8 7.8 7.8s7.8-3.5 7.8-7.8-3.5-7.8-7.8-7.8-7.8 3.5-7.8 7.8m23.5-81.9c.9-5.9-1-12-5.8-16.2-4.8-4.1-11.1-5.2-16.8-3.5-.9 5.9 1 12 5.8 16.2 4.8 4.1 11.1 5.2 16.8 3.5m8.9 53.8c.4-5.3-1.9-10.7-6.5-14.1-4.6-3.3-10.4-3.8-15.4-1.8-.4 5.3 1.9 10.7 6.5 14.1 4.6 3.3 10.4 3.8 15.4 1.8m14.5-80c.9-4.1-.4-8.1-3.2-10.9-3.7 1.3-6.7 4.3-7.6 8.4s.4 8.1 3.2 10.9c3.7-1.3 6.7-4.3 7.6-8.4m11.7 48.1c1.4-4.8 0-9.8-3.1-13.3-4.5 1.3-8.3 4.8-9.7 9.6s0 9.8 3.1 13.3c4.5-1.3 8.3-4.8 9.7-9.6m26-28.7c3.4-5.6 3.9-12.7.8-18.9-1.1-2.1-2.6-3.8-4.2-5.3-3.2-2.9-7.2-4.8-11.5-5.1-3.4 5.6-3.9 12.7-.8 18.9 3.2 6.2 9.2 9.9 15.7 10.5m16.4 25.6c-5.6 1.9-10.2 6.6-11.6 12.7-1.4 6.2.6 12.3 4.8 16.5 5.6-1.9 10.2-6.6 11.6-12.7 1.4-6.2-.6-12.3-4.8-16.5m10.7-18.2c-3.9 0-7 3.1-7 7s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7m9.2-32.1c2.3-4.5 1.9-9.7-.6-13.7-4.7.4-9.2 3.1-11.4 7.6-2.3 4.5-1.9 9.7.6 13.7 4.7-.4 9.2-3.1 11.4-7.6m4 14.2c-3.3-2.1-7.6-2.5-11.3-.7s-6.1 5.4-6.5 9.3c3.3 2.1 7.6 2.5 11.3.7s6.1-5.4 6.5-9.3m11.8 83.9c-4.2 1.4-7.6 4.9-8.7 9.5s.5 9.2 3.6 12.4c4.2-1.5 7.6-4.9 8.7-9.5s-.5-9.2-3.6-12.4m16.6-73.6c3.1-4 3.7-9.1 2.1-13.6-4.7-.5-9.6 1.3-12.7 5.3s-3.7 9.1-2.1 13.6c4.7.5 9.6-1.3 12.7-5.3m19.5 28.7c-4.4-4-10.7-5.7-16.7-4-6.1 1.7-10.5 6.5-12.1 12.2 4.4 4 10.7 5.7 16.7 4 6.1-1.7 10.5-6.5 12.1-12.2m.5 126.3c0-4.6-3.8-8.4-8.4-8.4s-8.4 3.8-8.4 8.4 3.8 8.4 8.4 8.4 8.4-3.7 8.4-8.4m22.6-73.6c-3.3-3-8-4.3-12.5-3-4.6 1.3-7.8 4.9-9.1 9.2 3.3 3 8 4.3 12.6 3s7.8-4.9 9.1-9.2"/>
                </svg>
              </div>
              
              {/* Text */}
              <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="text-blue-900 dark:text-blue-300 text-base sm:text-xl md:text-2xl font-bold leading-tight transition-colors duration-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                  {currentLogoText.mainText}
                </div>
                <div className="text-blue-800/80 dark:text-blue-400/80 text-xs sm:text-sm leading-tight">
                  {currentLogoText.subText}
                </div>
              </div>
            </div>
          </Link>

          {/* Title - Centered - Hidden on small screens, shown on large */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block px-4">
            <Link to="/">
              <h1 className="text-lg xl:text-2xl font-bold text-blue-900 dark:text-blue-300 transition-all duration-300 hover:text-blue-700 dark:hover:text-blue-400 whitespace-nowrap">
                {t.appName}
              </h1>
            </Link>
          </div>

          {/* Language Selector + Dark mode toggle + Links */}
          <div className={`z-10 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Useful links */}
            <div className="relative z-[9999]" ref={linksRef}>
              <button
                onClick={() => setLinksOpen(v => !v)}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                aria-label="Useful links"
                title={usefulLinksTitle[currentLanguage]}
              >
                <LayoutGrid className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              {linksOpen && (
                <div className={`absolute top-full mt-1 ${isRTL ? 'left-0' : 'right-0'} z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-2 min-w-[200px]`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <div className="px-3 pb-1 pt-0.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {usefulLinksTitle[currentLanguage]}
                  </div>
                  {usefulLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setLinksOpen(false)}
                      className="flex items-center px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{link.label[currentLanguage]}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{link.sublabel}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setDark(d => !d)}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
              title={dark
                ? (currentLanguage === 'he' ? 'מצב בהיר' : currentLanguage === 'ru' ? 'Светлый режим' : currentLanguage === 'es' ? 'Modo claro' : 'Light mode')
                : (currentLanguage === 'he' ? 'מצב כהה' : currentLanguage === 'ru' ? 'Тёмный режим' : currentLanguage === 'es' ? 'Modo oscuro' : 'Dark mode')
              }
            >
              {dark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            </button>
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
            />
          </div>
        </div>
        
        {/* Mobile Title - Below logo, only on small screens */}
        <div className="lg:hidden mt-2 text-center">
          <Link to="/">
            <h1 className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-300">
              {t.appName}
            </h1>
          </Link>
        </div>
      </div>
    </header>
  );
}
