import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, type PreviewEvent, type Holiday } from './adminApi';
import { Button } from '../components/ui/button';

interface Props {
  onClose: () => void;
  onCreated: (count: number) => void;
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function currentYearMonth(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

export function GenerateModal({ onClose, onCreated }: Props) {
  const [targetMonth, setTargetMonth] = useState(currentYearMonth);
  const [referenceMonth, setReferenceMonth] = useState(() => prevMonth(currentYearMonth()));
  const [preview, setPreview] = useState<{ events: PreviewEvent[]; holidays: Holiday[] } | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    setSkipped(new Set());
    try {
      const result = await adminApi.generatePreview(targetMonth, referenceMonth);
      setPreview({ events: result.previewEvents, holidays: result.holidayDates });
      setSkipped(new Set());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [targetMonth, referenceMonth]);

  const toggleSkip = (date: string) => {
    setSkipped(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const confirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const toCreate = preview.events.filter(e => !skipped.has(e.date));
      const { created } = await adminApi.generateConfirm(toCreate, targetMonth);
      onCreated(created);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  const holidaySet = new Set(preview?.holidays.map(h => h.date) ?? []);
  const holidayByDate = Object.fromEntries((preview?.holidays ?? []).map(h => [h.date, h.nameEn]));

  const previewDates = preview
    ? [...new Set(preview.events.map(e => e.date))].sort()
    : [];
  const toCreate = preview ? preview.events.filter(e => !skipped.has(e.date)).length : 0;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-lg">⚡ Generate Schedule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target month</label>
              <input type="month" value={targetMonth}
                onChange={e => { setTargetMonth(e.target.value); setPreview(null); }}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Based on</label>
              <input type="month" value={referenceMonth}
                onChange={e => { setReferenceMonth(e.target.value); setPreview(null); }}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
            </div>
          </div>

          {!preview && (
            <Button onClick={loadPreview} disabled={loading} className="w-full">
              {loading ? 'Loading preview…' : 'Preview schedule'}
            </Button>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {preview && (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Click a day to skip it. 🟠 = holiday detected.
              </p>
              <div className="flex flex-wrap gap-2">
                {previewDates.map(date => {
                  const isHoliday = holidaySet.has(date);
                  const isSkipped = skipped.has(date);
                  const count = preview.events.filter(e => e.date === date).length;
                  const dayNum = new Date(date + 'T12:00:00Z').getUTCDate();
                  return (
                    <button
                      key={date}
                      onClick={() => toggleSkip(date)}
                      title={isHoliday ? holidayByDate[date] : date}
                      className={[
                        'relative flex flex-col items-center justify-center w-12 h-14 rounded-lg border-2 text-xs transition-all',
                        isSkipped
                          ? 'border-red-300 bg-red-50 text-red-400 dark:bg-red-900/20 line-through'
                          : isHoliday
                            ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/20'
                            : 'border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20',
                      ].join(' ')}
                    >
                      <span className="font-semibold text-sm">{dayNum}</span>
                      <span className="opacity-70">{count}ev</span>
                      {isHoliday && !isSkipped && <span className="absolute -top-1 -right-1 text-xs">🟠</span>}
                    </button>
                  );
                })}
              </div>

              {preview.holidays.length > 0 && (
                <div className="mt-3 text-xs text-orange-600 dark:text-orange-400">
                  ⚠ Holidays in {monthLabel(targetMonth)}:{' '}
                  {preview.holidays.map(h => `${h.nameEn} (${h.date.slice(5)})`).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">
            {preview ? `Will create ${toCreate} events` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {preview && (
              <Button onClick={confirm} disabled={confirming || toCreate === 0}>
                {confirming ? 'Creating…' : `✅ Create ${toCreate} events`}
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
