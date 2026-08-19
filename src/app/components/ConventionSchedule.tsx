import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { he, enUS, ru, es } from 'date-fns/locale';
import { BookOpen, Pencil, Trash2, Plus, Code2, Copy, Check, Calendar as CalendarIcon, Globe } from 'lucide-react';
import { Event, getContainerSchedule, getEventTitle } from '../data/events';
import { EMBED_THEMES, DEFAULT_EMBED_THEME, EmbedTheme } from '../data/embedThemes';
import { Language, useTranslation } from '../utils/i18n';
import { AddToCalendarButton } from './AddToCalendarButton';
import '../../styles/embedTheme.css';

const DATE_LOCALES: Partial<Record<Language, Locale>> = { he, en: enUS, ru, es };

const SCHEDULE_TITLE: Record<string, string> = {
  he: 'לוח זמנים מפורט', en: 'Detailed Schedule', ru: 'Подробное расписание', es: 'Horario detallado',
  de: 'Detaillierter Zeitplan', it: 'Programma dettagliato', fr: 'Programme détaillé', pt: 'Horário detalhado',
  uk: 'Детальний розклад', tr: 'Ayrıntılı Program', bg: 'Подробен график',
};

const ADD_EVENT_LABEL: Record<string, string> = {
  he: 'הוסף אירוע', en: 'Add event', ru: 'Добавить событие', es: 'Añadir evento',
  de: 'Ereignis hinzufügen', it: 'Aggiungi evento', fr: 'Ajouter un événement', pt: 'Adicionar evento',
  uk: 'Додати подію', tr: 'Etkinlik ekle', bg: 'Добави събитие',
};

const GLOBAL_LABEL: Record<string, string> = {
  he: 'עולמי', en: 'Global', ru: 'Глобально', es: 'Global', de: 'Global', it: 'Globale',
  fr: 'Global', pt: 'Global', uk: 'Глобально', tr: 'Küresel', bg: 'Глобално',
};

const LOCAL_LABEL: Record<string, string> = {
  he: 'אזורי', en: 'Regional', ru: 'Региональный', es: 'Regional', de: 'Regional', it: 'Regionale',
  fr: 'Régional', pt: 'Regional', uk: 'Регіональний', tr: 'Bölgesel', bg: 'Регионален',
};

const TEN_LABEL: Record<string, string> = {
  he: 'עשירייה', en: 'Ten', ru: 'Десятка', es: 'Diez', de: 'Zehnergruppe', it: 'Decina',
  fr: 'Dizaine', pt: 'Dez', uk: 'Десятка', tr: 'Onlu Grup', bg: 'Десятка',
};

const GLOBAL_LEGEND: Record<string, string> = {
  he: 'עולמי — שידור לכל האזורים בעולם', en: 'Global — broadcast to all regions worldwide',
  ru: 'Глобально — трансляция для всех регионов по всему миру', es: 'Global — transmisión para todas las regiones del mundo',
  de: 'Global — Übertragung für alle Regionen weltweit', it: 'Globale — trasmissione per tutte le regioni nel mondo',
  fr: 'Global — diffusion pour toutes les régions dans le monde', pt: 'Global — transmissão para todas as regiões no mundo',
  uk: 'Глобально — трансляція для всіх регіонів по всьому світу', tr: 'Küresel — dünya çapındaki tüm bölgeler için yayın',
  bg: 'Глобално — излъчване за всички региони по света',
};

const LOCAL_LEGEND: Record<string, string> = {
  he: 'אזורי — התכנסות אזורית', en: 'Regional — gathering at your regional venue',
  ru: 'Региональный — встреча в вашем региональном центре', es: 'Regional — reunión en tu sede regional',
  de: 'Regional — Treffen an eurem regionalen Standort', it: 'Regionale — incontro nella tua sede regionale',
  fr: 'Régional — rencontre dans votre lieu régional', pt: 'Regional — encontro no seu local regional',
  uk: 'Регіональний — зустріч у вашому регіональному осередку', tr: 'Bölgesel — bölgesel merkezinizde buluşma',
  bg: 'Регионален — среща във вашия регионален център',
};

const TEN_LEGEND: Record<string, string> = {
  he: 'עשירייה — עבודה בעשירייה', en: 'Ten — work in your ten',
  ru: 'Десятка — работа в вашей десятке', es: 'Diez — trabajo en tu grupo de diez',
  de: 'Zehnergruppe — Arbeit in eurer Zehnergruppe', it: 'Decina — lavoro nella tua decina',
  fr: 'Dizaine — travail dans votre dizaine', pt: 'Dez — trabalho no seu grupo de dez',
  uk: 'Десятка — робота у вашій десятці', tr: 'Onlu Grup — onlu grubunuzda çalışma',
  bg: 'Десятка — работа във вашата десятка',
};

const COLUMN_LABELS: Record<string, { time: string; session: string; scope: string; materials: string }> = {
  he: { time: 'שעה', session: 'מפגש', scope: 'מסגרת', materials: 'חומרים' },
  en: { time: 'Time', session: 'Session', scope: 'Format', materials: 'Materials' },
  ru: { time: 'Время', session: 'Сессия', scope: 'Формат', materials: 'Материалы' },
  es: { time: 'Hora', session: 'Sesión', scope: 'Formato', materials: 'Materiales' },
  de: { time: 'Zeit', session: 'Sitzung', scope: 'Format', materials: 'Materialien' },
  it: { time: 'Ora', session: 'Sessione', scope: 'Formato', materials: 'Materiali' },
  fr: { time: 'Heure', session: 'Session', scope: 'Format', materials: 'Matériel' },
  pt: { time: 'Hora', session: 'Sessão', scope: 'Formato', materials: 'Materiais' },
  uk: { time: 'Час', session: 'Сесія', scope: 'Формат', materials: 'Матеріали' },
  tr: { time: 'Saat', session: 'Oturum', scope: 'Format', materials: 'Materyaller' },
  bg: { time: 'Час', session: 'Сесия', scope: 'Формат', materials: 'Материали' },
};

type ScopeStyle = { rowBg: string; stripe: string; badgeBg: string; badgeText: string };

function getScopeStyle(scope: Event['scope']): ScopeStyle | null {
  if (!scope) return null;
  const key = scope === 'local' ? 'local' : scope;
  return {
    rowBg: `var(--embed-row-${key})`,
    stripe: `var(--embed-cat-${key})`,
    badgeBg: `var(--embed-pill-${key}-bg)`,
    badgeText: `var(--embed-pill-${key}-fg)`,
  };
}

function getScopeLabel(scope: Event['scope'], language: Language): string | null {
  if (scope === 'global') return GLOBAL_LABEL[language] ?? GLOBAL_LABEL.en;
  if (scope === 'local') return LOCAL_LABEL[language] ?? LOCAL_LABEL.en;
  if (scope === 'ten') return TEN_LABEL[language] ?? TEN_LABEL.en;
  return null;
}

function formatDateRange(startStr: string, endStr: string | undefined, locale: Locale): string {
  const start = new Date(`${startStr}T00:00:00`);
  if (!endStr || endStr === startStr) return format(start, 'd MMMM yyyy', { locale });
  const end = new Date(`${endStr}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${format(start, 'd', { locale })}–${format(end, 'd MMMM yyyy', { locale })}`;
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) return `${format(start, 'd MMMM', { locale })} – ${format(end, 'd MMMM yyyy', { locale })}`;
  return `${format(start, 'd MMMM yyyy', { locale })} – ${format(end, 'd MMMM yyyy', { locale })}`;
}

interface ConventionScheduleProps {
  event: Event;
  allEvents: Event[];
  language: Language;
  chrome: boolean;
  theme?: EmbedTheme['id'];
  showMaterials?: boolean;
  canEdit?: boolean;
  isAdmin?: boolean;
  onAddSession?: (date: string) => void;
  onEditSession?: (session: Event) => void;
  onDeleteSession?: (session: Event) => void;
  headerExtra?: ReactNode;
  shareButton?: ReactNode;
  children?: ReactNode;
}

export function ConventionSchedule({
  event, allEvents, language, chrome, theme, showMaterials = true,
  canEdit, isAdmin, onAddSession, onEditSession, onDeleteSession,
  headerExtra, shareButton, children,
}: ConventionScheduleProps) {
  const t = useTranslation(language);
  const isRTL = language === 'he';
  const locale = DATE_LOCALES[language] ?? enUS;
  const isContainerType = event.type === 'conference' || event.type === 'holiday';
  const typeLabel = event.type === 'conference'
    ? (language === 'he' ? 'כנס' : 'Conference')
    : (language === 'he' ? 'חג' : 'Holiday');

  const scheduleByDate = useMemo(() => getContainerSchedule(allEvents, event), [allEvents, event]);
  const sortedDates = useMemo(() => Object.keys(scheduleByDate).sort(), [scheduleByDate]);
  const [activeDate, setActiveDate] = useState(sortedDates[0] ?? '');
  const currentDate = sortedDates.includes(activeDate) ? activeDate : sortedDates[0];

  const [embedOpen, setEmbedOpen] = useState(false);
  const [appDarkMode, setAppDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [userPickedTheme, setUserPickedTheme] = useState<EmbedTheme['id'] | null>(null);
  const [previewShowMaterials, setPreviewShowMaterials] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!chrome) return;
    const observer = new MutationObserver(() => {
      setAppDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [chrome]);

  const pickedTheme = userPickedTheme ?? (chrome ? (appDarkMode ? 'dark' : DEFAULT_EMBED_THEME) : (theme ?? DEFAULT_EMBED_THEME));
  const setPickedTheme = (id: EmbedTheme['id']) => setUserPickedTheme(id);
  const activeTheme = chrome ? pickedTheme : (theme ?? DEFAULT_EMBED_THEME);

  const isMultiDay = sortedDates.length > 1;
  const sessions = currentDate ? scheduleByDate[currentDate] ?? [] : [];
  const columnLabels = COLUMN_LABELS[language] ?? COLUMN_LABELS.en;

  const embedUrl = `https://events.kli.one/embed/${event.id}?theme=${pickedTheme}${previewShowMaterials ? '' : '&materials=0'}`;
  const snippet = `<iframe id="bb-schedule" src="${embedUrl}" width="100%" height="800" style="border:0;border-radius:12px" loading="lazy" title="${getEventTitle(event, language)}"></iframe>
<script>
  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "bb-schedule-height") return;
    var f = document.querySelectorAll('iframe[src*="events.kli.one/embed"]');
    for (var i = 0; i < f.length; i++)
      if (f[i].contentWindow === e.source) f[i].style.height = e.data.height + "px";
  });
</script>`;

  const copySnippet = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet).then(done).catch(() => {});
      return;
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = snippet;
      ta.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch {
      // clipboard unavailable; nothing more we can do
    }
  };

  const scheduleTitle = SCHEDULE_TITLE[language] ?? SCHEDULE_TITLE.en;
  const addEventLabel = ADD_EVENT_LABEL[language] ?? ADD_EVENT_LABEL.en;

  const embedToggleButton = chrome && (
    <button
      type="button"
      onClick={() => setEmbedOpen(v => !v)}
      aria-pressed={embedOpen}
      className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
      style={embedOpen
        ? { borderColor: 'var(--embed-accent)', background: 'var(--embed-accent)', color: 'var(--embed-btn-ink)' }
        : { borderColor: 'var(--embed-border-strong)', color: 'var(--embed-fg-muted)' }}
    >
      <Code2 className="w-3.5 h-3.5" />
      {t.embed}
    </button>
  );

  return (
    <div className={`bb-embed ${(!chrome || isContainerType) ? 'px-4 py-4 sm:px-6 sm:py-6' : ''}`} data-embed-theme={activeTheme} dir={isRTL ? 'rtl' : 'ltr'}>
      {isContainerType ? (
        <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
          <div className="flex-1 min-w-[240px]">
            {chrome && (
              <div
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide mb-2"
                style={{ background: 'var(--embed-bg-muted)', color: 'var(--embed-fg-heading)' }}
              >
                {typeLabel}
              </div>
            )}
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--embed-fg-heading)' }}>
              {getEventTitle(event, language)}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2" style={{ color: 'var(--embed-fg-muted)' }}>
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                {formatDateRange(event.date, event.endDate, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {t.timezoneLabel}
              </span>
            </div>
            {event.description?.[language] && (
              <p className="text-sm max-w-prose" style={{ color: 'var(--embed-fg-muted)' }}>
                {event.description[language]}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AddToCalendarButton event={event} language={language} isRTL={isRTL} />
            {shareButton}
            {embedToggleButton}
            {headerExtra}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold text-xl" style={{ color: 'var(--embed-fg-heading)' }}>{scheduleTitle}</h3>
          <div className="flex items-center gap-2">
            {embedToggleButton}
            {headerExtra}
          </div>
        </div>
      )}

      {chrome && embedOpen && (
        <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--embed-bg-tabs)', borderColor: 'var(--embed-border)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="text-sm font-semibold" style={{ color: 'var(--embed-fg-heading)' }}>{t.embedPanelTitle}</div>
            <button
              type="button"
              onClick={copySnippet}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5"
              style={{ borderColor: 'var(--embed-border-strong)', background: 'var(--embed-bg-surface)', color: 'var(--embed-fg-muted)' }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t.copied : t.copyCode}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {EMBED_THEMES.map(themeOpt => (
              <button
                key={themeOpt.id}
                type="button"
                onClick={() => setPickedTheme(themeOpt.id)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border-2"
                style={{
                  borderColor: pickedTheme === themeOpt.id ? 'var(--embed-fg-heading)' : 'var(--embed-border)',
                  background: 'var(--embed-bg-surface)',
                  color: pickedTheme === themeOpt.id ? 'var(--embed-fg-heading)' : 'var(--embed-fg-muted)',
                }}
              >
                <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: themeOpt.swatch }} />
                {themeOpt.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold mb-3 cursor-pointer" style={{ color: 'var(--embed-fg-muted)' }}>
            <input
              type="checkbox"
              checked={previewShowMaterials}
              onChange={e => setPreviewShowMaterials(e.target.checked)}
            />
            {t.showMaterialsToggle}
          </label>
          <pre
            className="text-xs leading-relaxed rounded-lg p-3 whitespace-pre-wrap break-all"
            style={{ background: 'var(--embed-bg-surface)', border: '1px solid var(--embed-border)', color: 'var(--embed-fg-muted)' }}
          >
            {snippet}
          </pre>
          <div className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--embed-fg-subtle)' }}>{t.embedHelp}</div>
        </div>
      )}

      {children}

      {isMultiDay && (
        <div className="flex flex-wrap gap-3 p-4 mb-6 rounded-lg" style={{ background: 'var(--embed-bg-tabs)', border: '1px solid var(--embed-border)' }}>
          {sortedDates.map(date => {
            const active = date === currentDate;
            const d = new Date(`${date}T00:00:00`);
            return (
              <button
                key={date}
                type="button"
                onClick={() => setActiveDate(date)}
                className="flex-1 min-w-[110px] max-w-[220px] text-start px-5 py-3.5 rounded-[10px] transition-colors"
                style={active
                  ? { border: '1px solid var(--embed-tab-active-bg)', background: 'var(--embed-tab-active-bg)', color: 'var(--embed-tab-active-fg)' }
                  : { border: '1px solid var(--embed-border)', background: 'var(--embed-bg-surface)', color: 'var(--embed-fg-heading)' }}
              >
                <div className="text-xs font-semibold" style={{ color: active ? 'var(--embed-tab-active-sub)' : 'var(--embed-fg-subtle)' }}>{format(d, 'EEEE', { locale })}</div>
                <div className="text-lg font-bold mt-0.5 whitespace-nowrap">{format(d, 'd MMM', { locale })}</div>
              </button>
            );
          })}
        </div>
      )}

      {!isMultiDay && currentDate && (
        <div
          className="mb-6 px-7 py-4 rounded-lg font-bold text-lg"
          style={event.type === 'holiday'
            ? { background: '#fed7aa', color: '#7c2d12' }
            : { background: 'var(--embed-bg-tabs)', color: 'var(--embed-fg-heading)' }}
        >
          {format(new Date(`${currentDate}T00:00:00`), 'EEEE, d MMMM yyyy', { locale })}
        </div>
      )}

      {!isContainerType && (
        <div className="text-xs mb-3" style={{ color: 'var(--embed-fg-subtle)' }}>{t.timezoneLabel}</div>
      )}

      {sessions.length === 0 && (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--embed-fg-subtle)' }}>{t.noEvents}</div>
      )}

      {sessions.length > 0 && (() => {
        const headerCellStyle = { color: 'var(--embed-fg-subtle)', borderBottom: '1px solid var(--embed-border)' };

        function sessionActions(session: Event) {
          const hasActions = (showMaterials && (session.title.en === 'Meal' || !!session.studyLink)) || (chrome && canEdit && session._db);
          if (!hasActions) return null;
          return (
            <div className="flex items-center gap-1.5">
              {showMaterials && session.title.en === 'Meal' && (
                <a
                  href={`https://pay.kli.one/${language}/Calendar-Meals`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 transition-colors text-orange-900 bg-orange-200 hover:bg-orange-300 whitespace-nowrap"
                >
                  {t.registerMeal}
                </a>
              )}
              {showMaterials && session.studyLink && (
                <a
                  href={session.studyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t.studyMaterials}
                  className="flex items-center justify-center w-7 h-7 rounded-full border flex-shrink-0 transition-colors"
                  style={{ borderColor: 'var(--embed-border-strong)', background: 'var(--embed-bg-surface)', color: 'var(--embed-fg-link)' }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </a>
              )}
              {chrome && canEdit && session._db && (
                <div className="flex items-center gap-1 opacity-0 group-hover/session:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onEditSession?.(session)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onDeleteSession?.(session)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }

        const materialsColumnEnabled = showMaterials || (chrome && !!canEdit);
        const wideGridColumns = ['175px', '4px', '1fr', '150px', ...(materialsColumnEnabled ? ['120px'] : [])].join(' ');

        return (
          <>
            {/* Wide layout (sm and up): grid with time / stripe / session / format-pill / materials columns */}
            <div className="hidden sm:grid" style={{ gridTemplateColumns: wideGridColumns }}>
              <div className="px-3 pb-3 text-[12.5px] font-semibold" style={headerCellStyle}>{columnLabels.time}</div>
              <div style={headerCellStyle} />
              <div className="px-3 pb-3 text-[12.5px] font-semibold" style={headerCellStyle}>{columnLabels.session}</div>
              <div className="px-3 pb-3 text-[12.5px] font-semibold" style={headerCellStyle}>{columnLabels.scope}</div>
              {materialsColumnEnabled && <div className="px-3 pb-3 text-[12.5px] font-semibold" style={headerCellStyle}>{columnLabels.materials}</div>}

              {sessions.map((session, index) => {
                const isTimeless = !session.startTime || !session.endTime || session.startTime === session.endTime;
                const rowBorder = index === 0 ? {} : { borderTop: '1px solid var(--embed-border)' };
                const scopeStyle = getScopeStyle(session.scope);
                const scopeLabel = getScopeLabel(session.scope, language);
                const cellStyle = scopeStyle ? { ...rowBorder, background: scopeStyle.rowBg } : rowBorder;
                return (
                  <Fragment key={session.id}>
                    <div className="flex items-center ps-3 pe-14 py-4" style={cellStyle}>
                      {!isTimeless && (
                        <div
                          className="text-[15px] font-bold whitespace-nowrap"
                          style={{ color: 'var(--embed-fg-heading)', fontVariantNumeric: 'tabular-nums' }}
                          dir="ltr"
                        >
                          {session.startTime} – {session.endTime}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center" style={cellStyle}>
                      <span className="w-full" style={{ height: 32, borderRadius: 2, background: scopeStyle ? scopeStyle.stripe : 'transparent' }} />
                    </div>
                    <div className="ps-5 pe-3 py-4 flex items-center" style={cellStyle}>
                      <div>
                        <p className="text-[15.5px] font-semibold" style={{ color: 'var(--embed-fg)' }}>{getEventTitle(session, language)}</p>
                        {session.description?.[language] && (
                          <p className="text-[13px] mt-0.5" style={{ color: 'var(--embed-fg-subtle)' }}>{session.description[language]}</p>
                        )}
                      </div>
                    </div>
                    <div className="px-3 py-4 flex items-center" style={cellStyle}>
                      {scopeStyle && scopeLabel && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap"
                          style={{ background: scopeStyle.badgeBg, color: scopeStyle.badgeText }}
                        >
                          <span className="w-1.5 h-1.5 flex-shrink-0" style={{ borderRadius: 2, background: scopeStyle.stripe }} />
                          {scopeLabel}
                        </span>
                      )}
                    </div>
                    {materialsColumnEnabled && (
                      <div className="px-3 py-4 flex items-center group/session" style={cellStyle}>
                        {sessionActions(session)}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>

            {/* Narrow layout (below sm): stacked cards with a leading stripe */}
            <div className="sm:hidden">
              {sessions.map((session, index) => {
                const isTimeless = !session.startTime || !session.endTime || session.startTime === session.endTime;
                const scopeStyle = getScopeStyle(session.scope);
                const scopeLabel = getScopeLabel(session.scope, language);
                return (
                  <div
                    key={session.id}
                    className="flex flex-col gap-1.5 px-4 py-3.5"
                    style={{
                      borderTop: index === 0 ? undefined : '1px solid var(--embed-border)',
                      borderInlineStart: `4px solid ${scopeStyle ? scopeStyle.stripe : 'transparent'}`,
                      background: scopeStyle ? scopeStyle.rowBg : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {!isTimeless && (
                        <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--embed-fg-heading)', fontVariantNumeric: 'tabular-nums' }} dir="ltr">
                          {session.startTime} – {session.endTime}
                        </span>
                      )}
                      {scopeStyle && scopeLabel && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold whitespace-nowrap"
                          style={{ background: scopeStyle.badgeBg, color: scopeStyle.badgeText }}
                        >
                          <span className="w-1.5 h-1.5 flex-shrink-0" style={{ borderRadius: 2, background: scopeStyle.stripe }} />
                          {scopeLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 flex-wrap group/session">
                      <p className="text-[15px] font-semibold" style={{ color: 'var(--embed-fg)' }}>{getEventTitle(session, language)}</p>
                      {sessionActions(session)}
                    </div>
                    {session.description?.[language] && (
                      <p className="text-[12.5px]" style={{ color: 'var(--embed-fg-subtle)' }}>{session.description[language]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {sessions.some(s => s.scope) && (
        <div className="flex flex-wrap gap-4 mt-4 pt-4 text-xs" style={{ borderTop: '1px solid var(--embed-border)', color: 'var(--embed-fg-muted)' }}>
          {sessions.some(s => s.scope === 'global') && (
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 flex-shrink-0" style={{ borderRadius: 2, background: 'var(--embed-cat-global)' }} />
              {GLOBAL_LEGEND[language] ?? GLOBAL_LEGEND.en}
            </span>
          )}
          {sessions.some(s => s.scope === 'local') && (
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 flex-shrink-0" style={{ borderRadius: 2, background: 'var(--embed-cat-local)' }} />
              {LOCAL_LEGEND[language] ?? LOCAL_LEGEND.en}
            </span>
          )}
          {sessions.some(s => s.scope === 'ten') && (
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 flex-shrink-0" style={{ borderRadius: 2, background: 'var(--embed-cat-ten)' }} />
              {TEN_LEGEND[language] ?? TEN_LEGEND.en}
            </span>
          )}
        </div>
      )}

      {chrome && canEdit && currentDate && (
        <button
          type="button"
          onClick={() => onAddSession?.(currentDate)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
          style={{ background: 'var(--embed-accent)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          {addEventLabel}
        </button>
      )}
    </div>
  );
}
