import { Fragment, useMemo, useState, type ReactNode } from 'react';
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
  he: 'גלובלי', en: 'Global', ru: 'Глобально', es: 'Global', de: 'Global', it: 'Globale',
  fr: 'Global', pt: 'Global', uk: 'Глобально', tr: 'Küresel', bg: 'Глобално',
};

const LOCAL_LABEL: Record<string, string> = {
  he: 'מקומי', en: 'Local', ru: 'Локально', es: 'Local', de: 'Lokal', it: 'Locale',
  fr: 'Local', pt: 'Local', uk: 'Локально', tr: 'Yerel', bg: 'Локално',
};

const TEN_LABEL: Record<string, string> = {
  he: 'עשיריה', en: 'Ten', ru: 'Десятка', es: 'Diez', de: 'Zehnergruppe', it: 'Decina',
  fr: 'Dizaine', pt: 'Dez', uk: 'Десятка', tr: 'Onlu Grup', bg: 'Десятка',
};

const GLOBAL_LEGEND: Record<string, string> = {
  he: 'גלובלי — מחוברים לשידור מרכזי', en: 'Global — broadcast for all groups worldwide',
  ru: 'Глобально — трансляция для всех групп по всему миру', es: 'Global — transmisión para todos los grupos del mundo',
  de: 'Global — Übertragung für alle Gruppen weltweit', it: 'Globale — trasmissione per tutti i gruppi nel mondo',
  fr: 'Global — diffusion pour tous les groupes dans le monde', pt: 'Global — transmissão para todos os grupos no mundo',
  uk: 'Глобально — трансляція для всіх груп по всьому світу', tr: 'Küresel — dünya çapındaki tüm gruplar için yayın',
  bg: 'Глобално — излъчване за всички групи по света',
};

const LOCAL_LEGEND: Record<string, string> = {
  he: 'מקומי — פעילות מקומית/איזורית', en: 'Local — run by your own group',
  ru: 'Локально — проводится вашей группой', es: 'Local — organizado por tu propio grupo',
  de: 'Lokal — von der eigenen Gruppe durchgeführt', it: 'Locale — gestito dal proprio gruppo',
  fr: 'Local — organisé par votre propre groupe', pt: 'Local — realizado pelo seu próprio grupo',
  uk: 'Локально — проводиться вашою групою', tr: 'Yerel — kendi grubunuz tarafından yürütülür',
  bg: 'Локално — провежда се от вашата собствена група',
};

const TEN_LEGEND: Record<string, string> = {
  he: 'עשיריה — פעילות בעשיריה שלך', en: 'Ten — a small ten-person group session',
  ru: 'Десятка — встреча в вашей десятке', es: 'Diez — sesión en un grupo de diez personas',
  de: 'Zehnergruppe — Treffen in einer Zehnergruppe', it: 'Decina — incontro in un gruppo di dieci persone',
  fr: 'Dizaine — session en groupe de dix personnes', pt: 'Dez — sessão em um grupo de dez pessoas',
  uk: 'Десятка — зустріч у групі з десяти осіб', tr: 'Onlu Grup — on kişilik grup oturumu',
  bg: 'Десятка — среща в група от десет души',
};

const COLUMN_LABELS: Record<string, { time: string; session: string; scope: string; materials: string }> = {
  he: { time: 'שעה', session: 'מפגש', scope: 'מסגרת', materials: 'חומרים' },
  en: { time: 'Time', session: 'Session', scope: 'Scope', materials: 'Materials' },
  ru: { time: 'Время', session: 'Сессия', scope: 'Охват', materials: 'Материалы' },
  es: { time: 'Hora', session: 'Sesión', scope: 'Alcance', materials: 'Materiales' },
  de: { time: 'Zeit', session: 'Sitzung', scope: 'Umfang', materials: 'Materialien' },
  it: { time: 'Ora', session: 'Sessione', scope: 'Ambito', materials: 'Materiali' },
  fr: { time: 'Heure', session: 'Session', scope: 'Portée', materials: 'Matériel' },
  pt: { time: 'Hora', session: 'Sessão', scope: 'Escopo', materials: 'Materiais' },
  uk: { time: 'Час', session: 'Сесія', scope: 'Охоплення', materials: 'Матеріали' },
  tr: { time: 'Saat', session: 'Oturum', scope: 'Kapsam', materials: 'Materyaller' },
  bg: { time: 'Час', session: 'Сесия', scope: 'Обхват', materials: 'Материали' },
};

const ROW_GRID = '145px 1fr 130px 70px';

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
  event, allEvents, language, chrome, theme,
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
  const [pickedTheme, setPickedTheme] = useState<EmbedTheme['id']>(theme ?? DEFAULT_EMBED_THEME);
  const [copied, setCopied] = useState(false);
  const activeTheme = chrome ? pickedTheme : (theme ?? DEFAULT_EMBED_THEME);

  const isMultiDay = sortedDates.length > 1;
  const sessions = currentDate ? scheduleByDate[currentDate] ?? [] : [];
  const columnLabels = COLUMN_LABELS[language] ?? COLUMN_LABELS.en;

  const embedUrl = `https://events.kli.one/embed/${event.id}?theme=${pickedTheme}`;
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
      className="text-xs font-semibold px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
      style={embedOpen
        ? { borderColor: 'var(--embed-accent)', background: 'var(--embed-accent)', color: 'var(--embed-btn-ink)' }
        : { borderColor: 'var(--embed-border-strong)', color: 'var(--embed-fg-muted)' }}
    >
      <Code2 className="w-3.5 h-3.5" />
      {t.embed}
    </button>
  );

  return (
    <div className="bb-embed px-4 py-4 sm:px-6 sm:py-6" data-embed-theme={activeTheme} dir={isRTL ? 'rtl' : 'ltr'}>
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
        <div className="mb-6 p-4 rounded-lg border" style={{ background: 'var(--embed-bg-muted)', borderColor: 'var(--embed-border)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="text-sm font-semibold" style={{ color: 'var(--embed-fg-heading)' }}>{t.embedPanelTitle}</div>
            <button
              type="button"
              onClick={copySnippet}
              className="px-3 py-1.5 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5"
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
                  borderColor: pickedTheme === themeOpt.id ? 'var(--embed-accent)' : 'var(--embed-border)',
                  background: 'var(--embed-bg-surface)',
                  color: pickedTheme === themeOpt.id ? 'var(--embed-fg-heading)' : 'var(--embed-fg-muted)',
                }}
              >
                <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: themeOpt.swatch }} />
                {themeOpt.label}
              </button>
            ))}
          </div>
          <pre
            className="text-xs leading-relaxed rounded-md p-3 whitespace-pre-wrap break-all"
            style={{ background: 'var(--embed-bg-surface)', border: '1px solid var(--embed-border)', color: 'var(--embed-fg-muted)' }}
          >
            {snippet}
          </pre>
        </div>
      )}

      {children}

      {isMultiDay && (
        <div className="flex flex-wrap gap-2 mb-6">
          {sortedDates.map(date => {
            const active = date === currentDate;
            const d = new Date(`${date}T00:00:00`);
            return (
              <button
                key={date}
                type="button"
                onClick={() => setActiveDate(date)}
                className="flex-1 min-w-[110px] max-w-[220px] px-4 py-3 rounded-lg border-2 transition-colors"
                style={{
                  borderColor: active ? 'var(--embed-accent)' : 'var(--embed-border)',
                  background: active ? 'var(--embed-accent)' : 'var(--embed-bg-surface)',
                  color: active ? 'var(--embed-btn-ink)' : 'var(--embed-fg-muted)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">{format(d, 'EEE', { locale })}</div>
                <div className="text-lg font-bold">{format(d, 'd MMM', { locale })}</div>
              </button>
            );
          })}
        </div>
      )}

      {!isMultiDay && currentDate && (
        <div className="mb-6 px-4 py-3 rounded-lg font-bold text-lg" style={{ background: 'var(--embed-bg-muted)', color: 'var(--embed-fg-heading)' }}>
          {format(new Date(`${currentDate}T00:00:00`), 'EEEE, d MMMM yyyy', { locale })}
        </div>
      )}

      {!isContainerType && (
        <div className="text-xs mb-3" style={{ color: 'var(--embed-fg-subtle)' }}>{t.timezoneLabel}</div>
      )}

      {sessions.length === 0 && (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--embed-fg-subtle)' }}>{t.noEvents}</div>
      )}

      {sessions.length > 0 && (
        <div className="grid gap-x-6" style={{ gridTemplateColumns: ROW_GRID }}>
          <div className="px-3 pb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--embed-fg-subtle)', borderBottom: '1px solid var(--embed-border)' }}>{columnLabels.time}</div>
          <div className="px-3 pb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--embed-fg-subtle)', borderBottom: '1px solid var(--embed-border)' }}>{columnLabels.session}</div>
          <div className="px-3 pb-3 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--embed-fg-subtle)', borderBottom: '1px solid var(--embed-border)' }}>{columnLabels.scope}</div>
          <div className="px-3 pb-3 text-sm font-bold uppercase tracking-wide text-end" style={{ color: 'var(--embed-fg-subtle)', borderBottom: '1px solid var(--embed-border)' }}>{columnLabels.materials}</div>

          {sessions.map((session, index) => {
            const isTimeless = !session.startTime || !session.endTime || session.startTime === session.endTime;
            const rowBorder = index === 0 ? {} : { borderTop: '1px solid var(--embed-border)' };
            const timePillColors = session.scope === 'global' ? { background: '#ccfbf1', color: '#0f766e' }
              : session.scope === 'local' ? { background: '#fef3c7', color: '#92400e' }
              : session.scope === 'ten' ? { background: '#ede9fe', color: '#6d28d9' }
              : { background: '#f3f4f6', color: '#4b5563' };
            return (
              <Fragment key={session.id}>
                <div className="flex items-start px-3 py-4" style={rowBorder}>
                  {!isTimeless && (
                    <div
                      className="inline-flex items-center px-3 py-1.5 rounded-full whitespace-nowrap"
                      style={{ ...timePillColors }}
                      dir="ltr"
                    >
                      {session.startTime} - {session.endTime}
                    </div>
                  )}
                </div>
                <div className="px-3 py-4" style={rowBorder}>
                  <p style={{ color: 'var(--embed-fg)' }}>{getEventTitle(session, language)}</p>
                  {session.description?.[language] && (
                    <p className="text-sm mt-0.5" style={{ color: 'var(--embed-fg-subtle)' }}>{session.description[language]}</p>
                  )}
                </div>
                <div className="flex items-start px-3 py-4" style={rowBorder}>
                  {session.scope === 'global' && (
                    <span
                      className="inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap text-white"
                      style={{ background: 'var(--embed-accent)' }}
                    >
                      {GLOBAL_LABEL[language] ?? GLOBAL_LABEL.en}
                    </span>
                  )}
                  {session.scope === 'local' && (
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap text-white bg-amber-500">
                      {LOCAL_LABEL[language] ?? LOCAL_LABEL.en}
                    </span>
                  )}
                  {session.scope === 'ten' && (
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap text-white bg-purple-600">
                      {TEN_LABEL[language] ?? TEN_LABEL.en}
                    </span>
                  )}
                </div>
                <div className="group/session flex items-start gap-2 justify-end px-3 py-4" style={rowBorder}>
                  {session.title.en === 'Meal' && (
                    <a
                      href={`https://pay.kli.one/${language}/Calendar-Meals`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 transition-colors text-white bg-orange-500 hover:bg-orange-600 whitespace-nowrap"
                    >
                      {t.registerMeal}
                    </a>
                  )}
                  {session.studyLink && (
                    <a
                      href={session.studyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t.studyMaterials}
                      className="flex items-center justify-center w-9 h-9 rounded-full border flex-shrink-0 transition-colors"
                      style={{ borderColor: 'var(--embed-border-strong)', background: 'var(--embed-bg-surface)', color: 'var(--embed-fg-link)' }}
                    >
                      <BookOpen className="w-4 h-4" />
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
              </Fragment>
            );
          })}
        </div>
      )}

      {sessions.some(s => s.scope) && (
        <div className="flex flex-wrap gap-4 mt-4 pt-4 text-xs" style={{ borderTop: '1px solid var(--embed-border)', color: 'var(--embed-fg-subtle)' }}>
          {sessions.some(s => s.scope === 'global') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--embed-accent)' }} />
              {GLOBAL_LEGEND[language] ?? GLOBAL_LEGEND.en}
            </span>
          )}
          {sessions.some(s => s.scope === 'local') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block bg-amber-500" />
              {LOCAL_LEGEND[language] ?? LOCAL_LEGEND.en}
            </span>
          )}
          {sessions.some(s => s.scope === 'ten') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block bg-purple-500" />
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
