import React from 'react';
import { Link } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, LayoutGrid } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { Language, useTranslation } from '../utils/i18n';
import keycloak from '../../keycloak';
import { isAdmin } from '../admin/AdminGuard';
import { GenerateModal } from '../admin/GenerateModal';
import { HolidayGenerateModal } from '../admin/HolidayGenerateModal';

interface HeaderProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export function Header({ currentLanguage, onLanguageChange }: HeaderProps) {
  const t = useTranslation(currentLanguage);
  const isRTL = currentLanguage === 'he';

  const logoContent = {
    he: { mainText: 'בני ברוך', tagline: 'קבלה לעם', subText: 'קהילת לומדי קבלה' },
    en: { mainText: 'Bnei Baruch', tagline: "Kabbalah L'Am", subText: 'Kabbalah Learning Community' },
    ru: { mainText: 'Бней Барух', tagline: 'Каббала Ла-Ам', subText: 'Сообщество изучающих Каббалу' },
    es: { mainText: 'Bnei Baruch', tagline: "Cabalá La'Am", subText: 'Comunidad de Estudiantes de Cabalá' },
    de: { mainText: 'Bnei Baruch', tagline: "Kabbala L'Am", subText: 'Kabbalah-Lerngemeinschaft' },
    it: { mainText: 'Bnei Baruch', tagline: "Kabbalah L'Am", subText: 'Comunità di Studio della Kabbalah' },
    fr: { mainText: 'Bnei Baruch', tagline: "Kabbale L'Am", subText: "Communauté d'étude de la Kabbale" },
    pt: { mainText: 'Bnei Baruch', tagline: "Cabala L'Am", subText: 'Comunidade de Estudos de Cabala' },
    uk: { mainText: 'Бней Барух', tagline: 'Кабала Ла-Ам', subText: 'Спільнота тих, хто вивчає Кабалу' },
    tr: { mainText: 'Bnei Baruch', tagline: "Kabala L'Am", subText: 'Kabala Öğrenme Topluluğu' },
    bg: { mainText: 'Бней Барух', tagline: 'Кабала Ла-Ам', subText: 'Общност за изучаване на Кабала' },
  };

  const currentLogoText = logoContent[currentLanguage as keyof typeof logoContent] ?? logoContent.he;

  const [linksOpen, setLinksOpen] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [generateToast, setGenerateToast] = useState('');
  const admin = isAdmin();
  const userRef = useRef<HTMLDivElement>(null);

  const userName = [keycloak.tokenParsed?.given_name, keycloak.tokenParsed?.family_name].filter(Boolean).join(' ')
    || keycloak.tokenParsed?.preferred_username || '';
  const userInitial = userName.charAt(0).toUpperCase();

  const userMenuItems: { label: Record<Language, string>; href?: string; onClick?: () => void }[] = [
    {
      label: { he: 'איזור אישי', en: 'Personal Area', ru: 'Личный кабинет', es: 'Área personal' },
      href: keycloak.createAccountUrl(),
    },
    {
      label: { he: 'יציאה', en: 'Log out', ru: 'Выйти', es: 'Cerrar sesión' },
      onClick: () => keycloak.logout(),
    },
  ];

  const usefulLinksTitle: Record<Language, string> = {
    he: 'קישורים שימושיים', en: 'Useful Links', ru: 'Полезные ссылки', es: 'Enlaces útiles',
    de: 'Nützliche Links', it: 'Link utili', fr: 'Liens utiles', pt: 'Links úteis',
    uk: 'Корисні посилання', tr: 'Yararlı Bağlantılar', bg: 'Полезни връзки',
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    if (userOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userOpen]);

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
            <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Logo image */}
              <img
                src="/tree-logo.svg"
                alt=""
                className="h-20 sm:h-24 w-auto transition-transform duration-300 group-hover:scale-105"
              />

              {/* Text */}
              <div className={`flex flex-col gap-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="text-blue-900 dark:text-blue-200 text-xl sm:text-[22px] font-bold leading-none">
                  {currentLogoText.mainText}
                </div>
                <div className="text-blue-900 dark:text-blue-200 text-xl sm:text-[22px] font-bold leading-none">
                  {currentLogoText.tagline}
                </div>
                <div className="text-blue-800 dark:text-blue-300 text-[13px] sm:text-[14px] leading-none">
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
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{link.label[currentLanguage] ?? link.label.en}</div>
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
            {admin && (
              <>
                <Link to="/admin/templates"
                  className="hidden sm:inline-flex items-center text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                  Templates
                </Link>
                <button
                  onClick={() => setHolidaysOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                  ✡ Holidays
                </button>
                <button
                  onClick={() => setGenerateOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  ⚡ Generate
                </button>
              </>
            )}

            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
            />

            {/* User avatar dropdown — only when authenticated */}
            {keycloak.authenticated && <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen(v => !v)}
                className="w-9 h-9 rounded-full bg-blue-700 dark:bg-blue-600 flex items-center justify-center text-white font-bold text-sm hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors shadow-sm"
                title={userName}
              >
                {userInitial}
              </button>
              {userOpen && (
                <div className={`absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-2 min-w-[180px]`} dir={isRTL ? 'rtl' : 'ltr'}>
                  <div className="px-4 py-2 font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 mb-1">
                    {userName}
                  </div>
                  {userMenuItems.map((item, i) =>
                    item.href ? (
                      <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
                        onClick={() => setUserOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        {item.label[currentLanguage] ?? item.label.en}
                      </a>
                    ) : (
                      <button key={i} onClick={() => { setUserOpen(false); item.onClick?.(); }}
                        className="w-full text-start px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        {item.label[currentLanguage] ?? item.label.en}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>}
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

      {generateOpen && (
        <GenerateModal
          onClose={() => setGenerateOpen(false)}
          onCreated={count => {
            setGenerateToast(`✅ Created ${count} events`);
            setTimeout(() => setGenerateToast(''), 4000);
          }}
        />
      )}
      {holidaysOpen && (
        <HolidayGenerateModal
          onClose={() => setHolidaysOpen(false)}
          onCreated={count => {
            setGenerateToast(`✅ Added ${count} holidays`);
            setTimeout(() => setGenerateToast(''), 4000);
          }}
        />
      )}
      {generateToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {generateToast}
        </div>
      )}
    </header>
  );
}
