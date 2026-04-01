import React from 'react';
import { Header } from './Header';
import { Language } from '../utils/i18n';
import { useLanguage } from '../context/LanguageContext';
import keycloak from '../../keycloak';

const content: Record<Language, { title: string; subtitle: string; desc: string; login: string; features: string[] }> = {
  he: {
    title: 'לוח אירועים',
    subtitle: 'קבלה לעם — בני ברוך',
    desc: 'גישה לכל האירועים, השיעורים וההתכנסויות של קהילת בני ברוך במקום אחד.',
    login: 'כניסה לאתר',
    features: ['לוח שבועי ויומי', 'אירועים מיוחדים וכנסים', 'קישורים לשיעורים', 'הודעות ועדכונים'],
  },
  en: {
    title: 'Events Calendar',
    subtitle: 'Kabbalah for the People — Bnei Baruch',
    desc: 'Access all events, lessons and gatherings of the Bnei Baruch community in one place.',
    login: 'Log in',
    features: ['Weekly & daily schedule', 'Special events & conventions', 'Links to lessons', 'News & updates'],
  },
  ru: {
    title: 'Календарь событий',
    subtitle: 'Каббала народу — Бней Барух',
    desc: 'Доступ ко всем событиям, урокам и собраниям общины Бней Барух в одном месте.',
    login: 'Войти',
    features: ['Недельное и дневное расписание', 'Особые события и конвенции', 'Ссылки на уроки', 'Новости и обновления'],
  },
  es: {
    title: 'Calendario de Eventos',
    subtitle: 'Cabalá para el Pueblo — Bnei Baruch',
    desc: 'Accede a todos los eventos, lecciones y encuentros de la comunidad Bnei Baruch en un solo lugar.',
    login: 'Entrar',
    features: ['Horario semanal y diario', 'Eventos especiales y convenciones', 'Enlaces a lecciones', 'Noticias y actualizaciones'],
  },
};

export function LoginPage() {
  const { language, setLanguage } = useLanguage();
  const isRTL = language === 'he';
  const c = content[language];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

            {/* Top gradient banner */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 pt-10 pb-12 text-white text-center relative">
              {/* Logo */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="50 0 330 600" width="44" height="44">
                    <defs>
                      <linearGradient id="lg2" x1="-364.4" x2="-361.6" y1="869.3" y2="869.3" gradientTransform="matrix(0 -190 190 0 -164969.3 -68673)" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#fff"/>
                        <stop offset="1" stopColor="#bfdbfe"/>
                      </linearGradient>
                      <clipPath id="lc2">
                        <path fill="none" d="M221.6 59.5c-.9 7.1-.8 11.3-3 18.1-1.8 5.7-3.3 8.8-6.5 13.8-3.5 3.7-5.1 6.2-9.1 5.3-2.3-.5-3.7-1.6-5-3.7-3.4-5-18.1-42-20.2-43.6 0 2.7 11.7 43.4 12.7 54.2.9 8.7-.6 15.2-1.4 23.9l-3.2 14.9c-2.3.8-7.5-9-12.1-15.9-4-6-6.1-9.5-9.6-16 1-4.6 1.8-10.1 1.3-17.6s10.6-16.1 10.2-18.6c-.1-.8-3 1.1-5.9 3.1s-5.9 3.9-6.1 3c-.5-2.3-1.2-4.6-2-7-5.2-15.1-18.5-26.8-23.5-30 2.8 7.1 11.7 15.6 15.2 27.8s5 24.6 1.9 27c-4 3.2-14.2-1-22.6-6.2-12.1-7.5-15.8-17.6-19.6-17.6s8.4 12.9 10.1 20.3S98.3 97.3 96 97c-4.1-.5-5 1.6-1.7 2.7 4.9 1.6 13.8 3.2 18.6 3.9 16.1 2.1 30.2 1.7 43.3 14.3 10.9 10.5 14.8 20.2 17.1 35.6 1.3 8.3-9.9 5.3-30.5-7.2-7.4-4.2-16.7-12.1-18-25.8-1.6-3.7-3.5 10.3-1.1 15.7.8 1.9-4.6.5-10.9-.8-5.2-1.1-11.1-2.2-14.4-1.5-4.3 1.1 21.7 3.7 33.7 14 6.4 5.5 27.4 20.9 35.4 28.3 2.3 2.1 1.1 8.1-2.4 9.1-4.2 1.3-11.8.7-19.8-.4-14.3-1.9-20.5-9-27.1-14.8-6.6-5.9-15.1-20.9-15.1-20.9 0 4.8.7 11.9 3.6 16.9 2.6 4.3 4.3 6.7 7.6 10.6 0 0-26.4-6.5-33.4-6.5 1 2.7 17.4 6.3 25.1 10.7 9.2 5.2 40.4 21.2 39.4 23.8-2.1 5.5-28.3 3.7-37.4 4.8-9.3 1.1-23.9 2.7-24 5.7-.1 1.8 5.1 1.3 11.1.8 3.8-.3 8-.6 11.2-.3 15.8 1.5 26.7 1.6 40.3 5.3 9.6 2.6 21.1 9.9 23.2 14.4 2.1 4.4 4.5 8.5 4 21.9l-.9 33c-102.7 1.3-150.2 9.8-150.2 9.8s47.5 8.5 150.2 9.8l.9 33c.4 13.4-1.9 17.5-4 21.9-2.1 4.5-13.6 11.8-23.2 14.4-13.6 3.7-24.5 3.8-40.3 5.3-3.2.3-7.4 0-11.2-.3-6-.5-11.2-1-11.1.8.2 3 14.8 4.6 24 5.7 9.1 1 35.3-.7 37.4 4.8 1 2.7-30.2 18.6-39.4 23.8-7.7 4.5-24.1 8-25.1 10.7 7 0 33.4-6.5 33.4-6.5-3.2 3.9-4.9 6.3-7.6 10.6-3 5-3.6 12.1-3.6 16.9 0 0 8.6-15 15.1-20.9 6.6-5.9 12.7-12.9 27.1-14.8 7.9-1.1 15.5-1.7 19.8-.4 3.4 1.1 4.6 7 2.4 9.1-8 7.4-29 22.9-35.4 28.3-12 10.3-38.1 12.9-33.7 14 3.4.7 9.2-.4 14.4-1.5 6.3-1.3 11.8-2.7 10.9-.8-2.4 5.4-.4 19.4 1.1 15.7 1.3-13.7 10.5-21.6 18-25.8 20.6-12.6 31.7-15.5 30.5-7.2-2.3 15.4-6.2 25.1-17.1 35.6-13.1 12.6-27.2 12.2-43.3 14.3-4.9.6-13.8 2.2-18.6 3.9-3.3 1.1-2.4 3.2 1.7 2.7 2.4-.3 28.9-5 27.2 2.3-1.7 7.4-13.9 20.3-10.1 20.3s7.5-10.2 19.6-17.6c8.4-5.2 18.6-9.4 22.6-6.2 3.1 2.5 1.6 14.8-1.9 27s-12.4 20.6-15.2 27.8c5-3.2 18.3-14.9 23.5-30 .8-2.4 1.5-4.7 2-7 .2-.9 3.2 1.1 6.1 3 2.9 2 5.8 3.9 5.9 3.1.4-2.5-10.6-11.1-10.2-18.6.5-7.5-.3-12.9-1.3-17.6 3.4-6.4 5.6-9.9 9.6-16 4.6-6.9 9.8-16.7 12.1-15.9l3.2 14.9c.8 8.7 2.3 15.3 1.4 23.9-1 10.8-12.7 51.5-12.7 54.2 2-1.6 16.8-38.6 20.2-43.6 1.3-2.1 2.7-3.2 5-3.7 4-.9 5.6 1.6 9.1 5.3 3.2 5 4.7 8.1 6.5 13.8 2.2 6.7 2.2 11 3 18.1 1.2 9.9 1.6 15.5 1.5 25.5 3-2.1 7.3-31.4 2.5-48.4s-13.2-19.9-17.1-27.6 3.2-31.3 4-35.6c1.4-7 5.7-9.8 9.4-4.9 2.9 3.9 25 40.5 28.9 51.1 4 10.6 12.4 43.5 14.9 44.6-.3-7.1-6.6-28-7.8-35-1.4-7.6-2.3-15.9-2.3-18.1s7.1 5.7 14.5 12.4 15 13.5 16 12.4c-16.1-17.5-30.7-37.1-39.3-48.8-4.1-5.6-8.8-16.3-8.8-19.1s8.9 5.3 12.7 8.2c7.6 5.8 22 16.4 22.5 12.1 0 0-27.7-24.8-35.7-35.2-8.1-10.4-3.1-14 6.9-15.6s16 3.3 24.1 8.2c8.7 5.2 17.2 14.5 24.2 21.2 7.5 7.2 11.1 11.6 17.6 19.7 3.2-1.2-6.8-16.3-13.4-22.6-6.1-5.8-12.6-13.7-8.1-18.9 2.7-3.1 18.7-2.5 31.6-2 8.9.4 16.3.7 16.6-.1 1-2.6-35.8-10.5-54-10.7-18.2-.1-41.4-16.8-37.7-23s21.6-2.2 52.4 10.4c4.8.4-8.9-8.9-12.9-12 12.4-.4 32.5-9.7 31.9-12.4-19.5 6.2-30.5 6.6-45.1 2.2s-40-13-40-15.8c0-8-.3-18.4.7-32.8l1.1-20.4c98.4-1.6 143.9-9.7 143.9-9.7s-45.5-8.1-143.9-9.7l-1.1-20.4c-1-14.4-.7-24.8-.7-32.8s25.4-11.4 40-15.8 25.5-4 45.1 2.2c.5-2.7-19.5-12-31.9-12.4 4-3.1 17.6-12.4 12.9-12-30.8 12.6-48.7 16.6-52.4 10.4s19.5-22.9 37.7-23 55-8.1 54-10.7c-.3-.8-7.7-.5-16.6 0-12.9.5-29 1-31.6-2-4.5-5.2 1.9-13.1 8.1-18.9 6.6-6.3 16.6-21.4 13.4-22.6-6.5 8-10.1 12.4-17.6 19.7-7 6.8-15.5 16.1-24.2 21.2-8.1 4.8-14.1 9.8-24.1 8.2s-15-5.2-6.9-15.6 35.7-35.2 35.7-35.2c-.5-4.3-14.9 6.3-22.5 12.1-3.7 2.9-12.6 8.7-12.7 5.9 0-2.8 4.7-11.2 8.8-16.8 8.6-11.7 23.2-31.3 39.3-48.8-1-1.1-8.6 5.7-16 12.4-7.4 6.8-14.5 13.5-14.5 12.4 0-2.2.9-10.5 2.3-18.1 1.3-7 7.5-27.9 7.8-35-2.5 1.1-10.9 33.9-14.9 44.6-3.9 10.5-26 47.2-28.9 51.1-3.7 4.9-8 2.2-9.4-4.9-.8-4.3-7.9-27.9-4-35.6s12.3-10.6 17.1-27.6.5-46.3-2.5-48.4c0 10-.3 15.6-1.5 25.5"/>
                      </clipPath>
                    </defs>
                    <g clipPath="url(#lc2)">
                      <path fill="url(#lg2)" d="M22.7 34h354.7v532H22.7z"/>
                    </g>
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold">{c.title}</h1>
              <p className="text-blue-200 text-sm mt-1">{c.subtitle}</p>
            </div>

            {/* Body */}
            <div className="px-8 py-6 -mt-4" dir={isRTL ? 'rtl' : 'ltr'}>
              <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-6 leading-relaxed">
                {c.desc}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-8">
                {c.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => keycloak.login()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md transition-colors text-base"
              >
                {c.login}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
