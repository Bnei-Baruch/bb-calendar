import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Globe, Clock } from 'lucide-react';
import { useTimezone } from '../context/TimezoneContext';
import type { Language } from '../utils/i18n';
import { tzStrings } from '../utils/tzStrings';
import { ISRAEL_TZ, resolveTz, getUtcOffsetLabel, isIsraelZone } from '../utils/timezone';

/** First-visit dialog: Israel time or the user's local time. Cannot be dismissed without choosing. */
export function TimezonePrompt({ language }: { language: Language }) {
  const { hasChosen, setTimezone } = useTimezone();
  const t = tzStrings[language] ?? tzStrings.en;
  const isRTL = language === 'he';
  const local = resolveTz('local');
  // Browsers already in Israel time have nothing to choose: keep Israel time, no popup.
  const isIsraeli = isIsraelZone(local);

  return (
    <Dialog open={!hasChosen && !isIsraeli}>
      <DialogContent
        dir={isRTL ? 'rtl' : 'ltr'}
        className="[&>button]:hidden max-w-[calc(100%-2rem)] sm:max-w-md p-5 sm:p-6"
        onEscapeKeyDown={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
      >
        <DialogHeader className={isRTL ? 'sm:text-right' : ''}>
          <DialogTitle>{t.promptTitle}</DialogTitle>
          <DialogDescription>{t.promptBody}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setTimezone(ISRAEL_TZ)}
            className="min-h-14 w-full flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-start hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Clock className="w-5 h-5 shrink-0 text-blue-700 dark:text-blue-300" />
            <span className="font-semibold">{t.israel}</span>
          </button>
          {(
            <button
              onClick={() => setTimezone('local')}
              className="min-h-14 w-full flex items-center gap-3 rounded-lg border border-blue-600 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-start hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <Globe className="w-5 h-5 shrink-0 text-blue-700 dark:text-blue-300" />
              <span className="flex flex-col">
                <span className="font-semibold">{t.local}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">{local} · {getUtcOffsetLabel(local)}</span>
              </span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
