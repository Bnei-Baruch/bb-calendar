import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import { MessageSquare, ExternalLink, Copy, Check, Share2, Play, Pause, Loader2 } from 'lucide-react';

import { Language } from '../utils/i18n';

interface Post {
  id: number;
  text: string;
  date: string;
  mediaUrl: string | null;
}

const LABELS: Record<Language, { title: string; subtitle: string; empty: string; copied: string; share: string; whatsapp: string; telegram: string; copy: string }> = {
  he: { title: 'הודעות הערוץ', subtitle: 'עדכונים אחרונים מקבלה לעם', empty: 'אין הודעות להצגה', copied: 'הועתק!', share: 'שתף', whatsapp: 'שתף בווטסאפ', telegram: 'שתף בטלגרם', copy: 'העתק טקסט' },
  en: { title: 'Channel Posts', subtitle: 'Latest updates from Kabbalah for the People', empty: 'No posts to display', copied: 'Copied!', share: 'Share', whatsapp: 'Share on WhatsApp', telegram: 'Share on Telegram', copy: 'Copy text' },
  ru: { title: 'Посты канала', subtitle: 'Последние обновления от Каббала народу', empty: 'Нет сообщений', copied: 'Скопировано!', share: 'Поделиться', whatsapp: 'Поделиться в WhatsApp', telegram: 'Поделиться в Telegram', copy: 'Копировать текст' },
  es: { title: 'Publicaciones', subtitle: 'Últimas actualizaciones de Cabalá para el Pueblo', empty: 'No hay publicaciones', copied: '¡Copiado!', share: 'Compartir', whatsapp: 'Compartir en WhatsApp', telegram: 'Compartir en Telegram', copy: 'Copiar texto' },
};

// Rotating accent colors for cards
const CARD_ACCENTS = [
  'border-s-sky-400 dark:border-s-sky-500',
  'border-s-violet-400 dark:border-s-violet-500',
  'border-s-emerald-400 dark:border-s-emerald-500',
  'border-s-amber-400 dark:border-s-amber-500',
  'border-s-rose-400 dark:border-s-rose-500',
  'border-s-indigo-400 dark:border-s-indigo-500',
];

const DAY_BADGE_COLORS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
];

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function isKabbalahMediaUrl(url: string): boolean {
  try { return new URL(url).hostname.includes('kabbalahmedia.info'); } catch { return false; }
}

interface AudioInfo {
  audioUrl: string;
  name: string;
  duration: number;
  startSec: number | null;
  endSec: number | null;
}

function fmtSec(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function KabbalahAudioPill({ url }: { url: string; copiedLabel: string }) {
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const startSec = audioInfo?.startSec ?? 0;
  const endSec = audioInfo?.endSec ?? audioInfo?.duration ?? 0;
  const rangeDuration = endSec - startSec;
  const relativePos = Math.max(0, currentSec - startSec);
  const progress = rangeDuration > 0 ? Math.min(1, relativePos / rangeDuration) : 0;

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (audio && audioInfo) {
      if (playing) { audio.pause(); } else { audio.play(); }
      return;
    }
    setLoading(true);
    setFetchError(false);
    try {
      const resp = await fetch(`/api/resolve-audio?url=${encodeURIComponent(url)}`);
      if (!resp.ok) throw new Error('failed');
      const info: AudioInfo = await resp.json();
      setAudioInfo(info);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioInfo) return;
    const start = audioInfo.startSec ?? 0;
    const end = audioInfo.endSec ?? audioInfo.duration;
    const onLoaded = () => {
      audio.currentTime = start;
      audio.play().catch(() => {});
    };
    const onTimeUpdate = () => {
      setCurrentSec(audio.currentTime);
      if (audio.currentTime >= end) { audio.pause(); audio.currentTime = start; }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); audio.currentTime = start; };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    if (audio.readyState >= 2) onLoaded();
    return () => { audio.pause(); };
  }, [audioInfo]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !audioInfo) return;
    const start = audioInfo.startSec ?? 0;
    const t = start + parseFloat(e.target.value) * rangeDuration;
    audio.currentTime = t;
    setCurrentSec(t);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };

  return (
    <span style={{ display: 'inline-block', verticalAlign: 'top' }} className="my-1 mx-0.5">
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 text-sm font-semibold px-3 py-1.5">
        <button
          onClick={handlePlay}
          disabled={loading}
          className="p-1 rounded-lg bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors shrink-0"
          title="Play Hebrew audio"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
           fetchError ? <span className="text-xs text-red-400">✕</span> :
           playing ? <Pause className="w-4 h-4" /> :
           <Play className="w-4 h-4" />}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[160px] hover:underline" title={url}>
          kabbalahmedia.info
        </a>
        <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 rounded-lg bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors shrink-0">
          <ExternalLink className="w-4 h-4" />
        </a>
        <button onClick={handleCopy} className="p-1 rounded-lg bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors shrink-0">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </span>
      {audioInfo && (
        <div className="mt-1.5 flex items-center gap-2 px-1" style={{ minWidth: 220 }}>
          <audio ref={audioRef} src={audioInfo.audioUrl} preload="metadata" className="hidden" />
          <span className="text-xs tabular-nums text-purple-600 dark:text-purple-400 shrink-0">
            {fmtSec(relativePos)}
          </span>
          <input
            type="range" min={0} max={1} step={0.001} value={progress}
            onChange={handleSeek}
            className="flex-1 h-1.5 rounded-full accent-purple-500 cursor-pointer"
          />
          <span className="text-xs tabular-nums text-purple-600 dark:text-purple-400 shrink-0">
            {fmtSec(rangeDuration)}
          </span>
        </div>
      )}
    </span>
  );
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 30);
  }
}

function LinkPill({ url, copiedLabel }: { url: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <span className="inline-flex items-center gap-1.5 my-1 mx-0.5 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 text-sm font-semibold px-3 py-1.5 align-middle">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate max-w-[180px] hover:underline"
        title={url}
      >
        {getDomain(url)}
      </a>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1 rounded-lg bg-sky-100 dark:bg-sky-800 hover:bg-sky-200 dark:hover:bg-sky-700 transition-colors shrink-0"
        title={url}
      >
        <ExternalLink className="w-4 h-4" />
      </a>
      <button
        onClick={handleCopy}
        className="p-1 rounded-lg bg-sky-100 dark:bg-sky-800 hover:bg-sky-200 dark:hover:bg-sky-700 transition-colors shrink-0"
        title={copiedLabel}
      >
        {copied
          ? <Check className="w-4 h-4 text-green-500" />
          : <Copy className="w-4 h-4" />
        }
      </button>
    </span>
  );
}

function ShareButton({ text, isRTL, shareLabel, whatsappLabel, telegramLabel, copyLabel }: {
  text: string; isRTL: boolean; shareLabel: string; whatsappLabel: string; telegramLabel: string; copyLabel: string;
}) {
  const [open, setOpen] = useState(false);

  const shareText = `${text}\n──────────\n🗓 לוח אירועים קבלה לעם\nhttps://cal.kli.one`;

  const options = [
    {
      label: whatsappLabel,
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.549 4.076 1.504 5.786L0 24l6.395-1.682A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.388l-.36-.214-3.732.981.998-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>,
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: telegramLabel,
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-500"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.772l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.787z"/></svg>,
      href: `https://t.me/share/url?url=${encodeURIComponent('https://cal.kli.one')}&text=${encodeURIComponent(shareText)}`,
    },
    {
      label: copyLabel,
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
      onClick: () => {
        navigator.clipboard.writeText(shareText).finally(() => setOpen(false));
      },
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="h-9 px-3 inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm text-gray-700 dark:text-gray-300"
      >
        <Share2 className="w-4 h-4" />
        <span>{shareLabel}</span>
      </button>
      {open && (
        <div
          className={`absolute bottom-full mb-1 ${isRTL ? 'left-0' : 'right-0'} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]`}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {options.map((opt, i) =>
            opt.href ? (
              <a key={i} href={opt.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
                onClick={() => setOpen(false)}>
                {opt.icon}<span>{opt.label}</span>
              </a>
            ) : (
              <button key={i} onClick={opt.onClick}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
                {opt.icon}<span>{opt.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function PostText({ text, copiedLabel }: { text: string; copiedLabel: string }) {
  const parts = text.split(URL_REGEX);
  URL_REGEX.lastIndex = 0;
  return (
    <span>
      {parts.map((part, i) => {
        URL_REGEX.lastIndex = 0;
        if (!URL_REGEX.test(part)) return <span key={i} className="whitespace-pre-wrap">{part}</span>;
        return isKabbalahMediaUrl(part)
          ? <KabbalahAudioPill key={i} url={part} copiedLabel={copiedLabel} />
          : <LinkPill key={i} url={part} copiedLabel={copiedLabel} />;
      })}
    </span>
  );
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function formatDayHeader(isoDate: string, language: Language): string {
  const locale = language === 'he' ? 'he-IL' : language === 'ru' ? 'ru-RU' : language === 'es' ? 'es-ES' : 'en-US';
  return new Date(isoDate).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

function getDayKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

interface PostGroup {
  day: string;
  colorIdx: number;
  posts: Post[];
}

function groupByDay(posts: Post[]): PostGroup[] {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const key = getDayKey(p.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries()).map(([day, posts], i) => ({ day, colorIdx: i % CARD_ACCENTS.length, posts }));
}

export function PostsView() {
  const { language } = useOutletContext<{ language: Language }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const labels = LABELS[language];
  const isRTL = language === 'he';

  useEffect(() => {
    const load = () => {
      fetch('/api/posts')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) { setPosts(data); setError(null); }
          else setError(data.error || 'Unknown error');
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    };

    load();

    const interval = setInterval(load, 10 * 60 * 1000);

    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const groups = groupByDay(posts);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{labels.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{labels.subtitle}</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-lg">{labels.empty}</div>
      )}

      {/* Feed grouped by day */}
      {!loading && !error && groups.length > 0 && (
        <div className="flex flex-col gap-8">
          {groups.map(({ day, colorIdx, posts: dayPosts }) => (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className={`text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap ${DAY_BADGE_COLORS[colorIdx]}`}>
                  {formatDayHeader(day, language)}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Posts for this day */}
              <div className="flex flex-col gap-3">
                {dayPosts.map(post => (
                  <div
                    key={post.id}
                    className={`rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 border-s-4 ${CARD_ACCENTS[colorIdx]} shadow-sm px-5 py-4`}
                  >
                    {/* Time */}
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 tracking-wide" dir="ltr">
                      {formatTime(post.date)}
                    </div>

                    {/* Message body */}
                    {post.text && (
                      <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed break-words">
                        <PostText text={post.text} copiedLabel={labels.copied} />
                      </div>
                    )}

                    {/* Image */}
                    {post.mediaUrl && (
                      <div className={`${post.text ? 'mt-4' : ''} -mx-1`}>
                        <img
                          src={post.mediaUrl}
                          alt=""
                          className="w-full rounded-xl object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Footer: share */}
                    {post.text && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <ShareButton text={post.text} isRTL={isRTL} shareLabel={labels.share} whatsappLabel={labels.whatsapp} telegramLabel={labels.telegram} copyLabel={labels.copy} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
