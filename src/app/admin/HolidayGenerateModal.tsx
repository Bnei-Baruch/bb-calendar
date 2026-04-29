import { useState } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, type HolidaySuggestion } from './adminApi';
import { Button } from '../components/ui/button';

interface Props {
  onClose: () => void;
  onCreated: (count: number) => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function HolidayGenerateModal({ onClose, onCreated }: Props) {
  const currentYear = new Date().getFullYear();
  const [targetYear, setTargetYear] = useState(currentYear + 1);
  const [suggestions, setSuggestions] = useState<HolidaySuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Deduplicate by family in case AI returns the same holiday twice
  const mergeSuggestions = (raw: HolidaySuggestion[]): HolidaySuggestion[] => {
    const seen = new Set<string>();
    return [...raw]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter(s => { if (seen.has(s.family)) return false; seen.add(s.family); return true; });
  };

  const load = async () => {
    setLoading(true);
    setError('');
    setSuggestions([]);
    try {
      const { suggestions } = await adminApi.aiHolidayPreview(currentYear, targetYear);
      const merged = mergeSuggestions(suggestions);
      setSuggestions(merged);
      setSelected(new Set(merged.map(s => s.date)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (date: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const save = async () => {
    const items = suggestions.filter(s => selected.has(s.date));
    if (!items.length) return;
    setSaving(true);
    try {
      const { created } = await adminApi.createHolidays(items);
      onCreated(created);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Jewish holidays start at sunset of the previous evening
  const eveOf = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - 1));
    return dt.toISOString().slice(0, 10);
  };

  const byMonth: Record<number, HolidaySuggestion[]> = {};
  for (const s of suggestions) {
    const m = new Date(eveOf(s.date) + 'T12:00:00Z').getUTCMonth();
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(s);
  }

  const formatRange = (s: HolidaySuggestion) => {
    const d1 = new Date(eveOf(s.date) + 'T12:00:00Z').getUTCDate();
    const d2 = new Date(s.endDate + 'T12:00:00Z').getUTCDate();
    return `${d1}–${d2}`;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-lg">✡ Generate Holidays</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Based on {currentYear} → generate for</span>
            <input type="number" value={targetYear} min={currentYear} max={2099}
              onChange={e => { setTargetYear(parseInt(e.target.value)); setSuggestions([]); }}
              className="w-24 border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>

          {!suggestions.length && (
            <Button onClick={load} disabled={loading} className="w-full">
              {loading ? '🤖 Loading holidays…' : '🤖 Suggest holidays'}
            </Button>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {suggestions.length > 0 && (
            <>
              <p className="text-xs text-gray-400">
                Holidays observed in {currentYear}, mapped to {targetYear} dates. Uncheck any to skip.
              </p>
              {Object.entries(byMonth).sort(([a],[b]) => +a - +b).map(([month, items]) => (
                <div key={month}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{MONTHS[+month]}</p>
                  <div className="space-y-1">
                    {items.map(s => (
                      <label key={s.date} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input type="checkbox" checked={selected.has(s.date)} onChange={() => toggle(s.date)} className="rounded" />
                        <span className="text-xs text-gray-400 w-8 shrink-0">{formatRange(s)}</span>
                        <span className="text-sm font-medium flex-1 text-right" dir="rtl">{s.titles.he || s.nameHe}</span>
                        <span className="text-xs text-gray-400 shrink-0">{s.nameEn}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {suggestions.length > 0 && (
              <Button onClick={save} disabled={saving || selected.size === 0}>
                {saving ? 'Adding…' : `✅ Add ${selected.size}`}
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
