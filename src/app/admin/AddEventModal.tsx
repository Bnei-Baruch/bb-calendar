import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, type AdminEvent, type AdminTemplate } from './adminApi';
import { Button } from '../components/ui/button';
import { type Language, languageNames } from '../utils/i18n';
import { useEvents } from '../context/EventsContext';
import { isAdmin, isAdminOrTranslator } from './AdminGuard';

const ALL_LANGS: Language[] = ['he', 'en', 'ru', 'es', 'de', 'it', 'fr', 'pt', 'uk', 'tr', 'bg'];

interface Props {
  date?: string;
  event?: AdminEvent;
  parentId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AddEventModal({ date, event, parentId, onClose, onSaved }: Props) {
  const isEdit = !!event;
  const admin = isAdmin();
  const adminOrTranslator = isAdminOrTranslator();
  const visibleLangs = admin ? ALL_LANGS : ALL_LANGS.filter(l => l !== 'he');
  const { events: allEvents } = useEvents();

  const parents = allEvents.filter(e => e.type === 'conference' || e.type === 'holiday');
  const parentEvent = event?.recurrenceId ? allEvents.find(e => e.id === event.recurrenceId) : undefined;

  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [selectedParentId, setSelectedParentId] = useState<string>(
    event?.parentId ?? parentId ?? ''
  );
  const [form, setForm] = useState({
    date: event?.date ?? date ?? '',
    endDate: event?.endDate ?? '',
    startTime: event?.startTime ?? '',
    endTime: event?.endTime ?? '',
    type: event?.type ?? 'regular',
    private: event?.private ?? false,
    scope: event?.scope,
    titles: event?.title ?? {} as Record<string, string>,
    descriptions: event?.description ?? {} as Record<string, string>,
  });
  const [activeLang, setActiveLang] = useState<Language>(admin ? 'he' : 'en');
  const [showTitles, setShowTitles] = useState(isEdit);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'custom'>(
    ((event?.recurrence || parentEvent?.recurrence) as 'daily' | 'weekly' | 'monthly' | 'custom' | undefined) ?? 'none'
  );
  const [customDays, setCustomDays] = useState<Set<number>>(() => {
    const days = event?.recurrenceDays || parentEvent?.recurrenceDays;
    if (days) return new Set(days.split(',').map(Number));
    return new Set();
  });
  const toggleDay = (d: number) => setCustomDays(prev => {
    const next = new Set(prev);
    next.has(d) ? next.delete(d) : next.add(d);
    return next;
  });
  const [recurrenceEnd, setRecurrenceEnd] = useState<string>(() => {
    const end = event?.recurrenceEnd || parentEvent?.recurrenceEnd;
    if (end) return end;
    const base = event?.date || date || new Date().toISOString().slice(0, 10);
    const d = new Date(base + 'T12:00:00Z');
    d.setUTCFullYear(d.getUTCFullYear() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [translating, setTranslating] = useState(false);
  const [translatingDescription, setTranslatingDescription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingFuture, setSavingFuture] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingFuture, setDeletingFuture] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getTemplates().then(setTemplates).catch(() => {});
  }, []);

  const applyTemplate = (id: number) => {
    const t = templates.find(t => t.id === id);
    if (!t) return;
    setSelectedTemplateId(id);
    const templateTitles = admin
      ? { ...t.titles }
      : Object.fromEntries(Object.entries(t.titles).filter(([l]) => l !== 'he'));
    const templateDescriptions = admin
      ? { ...(t.descriptions ?? {}) }
      : Object.fromEntries(Object.entries(t.descriptions ?? {}).filter(([l]) => l !== 'he'));
    setForm(f => ({
      ...f,
      type: t.type || f.type,
      startTime: t.defaultStartTime || f.startTime,
      endTime: t.defaultEndTime || f.endTime,
      private: admin ? t.privateByDefault : false,
      titles: templateTitles,
      descriptions: templateDescriptions,
    }));
  };

  const setTitle = (lang: Language, value: string) => {
    setForm(f => ({ ...f, titles: { ...f.titles, [lang]: value } }));
  };

  const setDescription = (lang: Language, value: string) => {
    setForm(f => ({ ...f, descriptions: { ...f.descriptions, [lang]: value } }));
  };

  const autoTranslate = async () => {
    const source = form.titles['he'] || form.titles['en'];
    if (!source) return;
    const sourceLang = form.titles['he'] ? 'he' : 'en';
    const missing = visibleLangs.filter(l => l !== sourceLang && !form.titles[l]);
    if (!missing.length) return;
    setTranslating(true);
    try {
      const { translations } = await adminApi.translate(source, sourceLang, missing);
      setForm(f => ({ ...f, titles: { ...f.titles, ...translations } }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTranslating(false);
    }
  };

  const autoTranslateDescription = async () => {
    const source = form.descriptions['he'] || form.descriptions['en'];
    if (!source) return;
    const sourceLang = form.descriptions['he'] ? 'he' : 'en';
    const missing = visibleLangs.filter(l => l !== sourceLang && !form.descriptions[l]);
    if (!missing.length) return;
    setTranslatingDescription(true);
    try {
      const { translations } = await adminApi.translate(source, sourceLang, missing);
      setForm(f => ({ ...f, descriptions: { ...f.descriptions, ...translations } }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTranslatingDescription(false);
    }
  };

  const buildPayload = () => ({
    type: form.type,
    date: form.date,
    endDate: form.endDate || undefined,
    startTime: form.startTime,
    endTime: form.endTime,
    titles: form.titles,
    descriptions: form.descriptions,
    private: form.private,
    parentId: selectedParentId || undefined,
    scope: selectedParentId ? form.scope : undefined,
    recurrence: recurrence !== 'none' ? recurrence : undefined,
    recurrenceEnd: recurrence !== 'none' ? recurrenceEnd : undefined,
    recurrenceDays: recurrence === 'custom' && customDays.size > 0
      ? [...customDays].sort((a, b) => a - b).join(',')
      : undefined,
  });

  const save = async () => {
    if (!form.date) { setError('Date is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await adminApi.updateEvent(event.id, buildPayload());
      } else {
        await adminApi.createEvent(buildPayload());
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveThisFuture = async () => {
    if (!event) return;
    setSavingFuture(true);
    setError('');
    try {
      await adminApi.updateEventSeries(event.id, {
        titles: form.titles,
        descriptions: form.descriptions,
        startTime: form.startTime,
        endTime: form.endTime,
        private: form.private,
        location: undefined,
        recurrence: recurrence !== 'none' ? recurrence : undefined,
        recurrenceEnd: recurrence !== 'none' ? recurrenceEnd : undefined,
        recurrenceDays: recurrence === 'custom' && customDays.size > 0
          ? [...customDays].sort((a, b) => a - b).join(',')
          : undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingFuture(false);
    }
  };

  const remove = async () => {
    if (!event || !confirm('Delete this event?')) return;
    setDeleting(true);
    try {
      await adminApi.deleteEvent(event.id);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const removeThisFuture = async () => {
    if (!event || !confirm('Delete this and all future occurrences?')) return;
    setDeletingFuture(true);
    try {
      await adminApi.deleteEventFuture(event.id);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingFuture(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-lg">{isEdit ? '✏️ Edit Event' : '+ Add Event'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          {!isEdit && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Template</label>
              <select
                value={selectedTemplateId}
                onChange={e => e.target.value && applyTemplate(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">— pick a template —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.titles['he'] || t.name}</option>
                ))}
              </select>
            </div>
          )}

          {parents.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Belongs to (convention / holiday)</label>
              <select
                value={selectedParentId}
                onChange={e => setSelectedParentId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                dir="rtl"
              >
                <option value="">— none —</option>
                {parents.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title?.he || p.title?.en || p.id} ({p.date})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedParentId && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Scope</label>
              <div className="flex gap-2">
                {([
                  { value: undefined, label: '— blank —' },
                  { value: 'global' as const, label: 'Global' },
                  { value: 'local' as const, label: 'Local' },
                ]).map(opt => (
                  <button key={opt.label} type="button"
                    onClick={() => setForm(f => ({ ...f, scope: opt.value }))}
                    className={[
                      'px-3 py-1.5 rounded-lg text-sm border',
                      form.scope === opt.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <div className="flex gap-2">
              {(['regular', 'special', 'conference', 'holiday'] as const).map(t => (
                <button key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={[
                    'px-3 py-1.5 rounded-lg text-sm border capitalize',
                    form.type === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End date (optional)</label>
              <input type="date" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start time</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End time</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
            </div>
          </div>

          {admin && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.private}
                onChange={e => setForm(f => ({ ...f, private: e.target.checked }))}
                className="rounded" />
              🔒 Private (visible to moderators only)
            </label>
          )}

          {/* Recurrence — editable for admin/translator on create or when editing recurring event */}
          {adminOrTranslator && (!isEdit || !!event?.recurrenceId) ? (
            <div className="space-y-2">
              {isEdit && event?.recurrenceId && (
                <p className="text-xs text-blue-600 dark:text-blue-400">🔁 Recurring series — recurrence changes apply when "Save future" is clicked</p>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Repeat</label>
                <select
                  value={recurrence}
                  onChange={e => setRecurrence(e.target.value as typeof recurrence)}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily (every day)</option>
                  <option value="weekly">Weekly (same day)</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom days…</option>
                </select>
              </div>
              {recurrence === 'custom' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Repeat on</label>
                  <div className="flex gap-1 flex-wrap">
                    {(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const).map((label, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={[
                          'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                          customDays.has(i)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                        ].join(' ')}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              )}
              {recurrence !== 'none' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Repeat until</label>
                  <input
                    type="date"
                    value={recurrenceEnd}
                    onChange={e => setRecurrenceEnd(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              )}
            </div>
          ) : isEdit && event?.recurrenceId ? (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
              <span>🔁</span>
              <span>Recurring ({event.recurrence || 'series'})</span>
            </div>
          ) : null}

          <div className="border rounded-lg dark:border-gray-700">
            <button
              onClick={() => setShowTitles(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
            >
              <span>▶ Titles &amp; descriptions</span>
              <span className="text-xs text-gray-400">{showTitles ? '▲' : '▼'}</span>
            </button>

            {showTitles && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex flex-wrap gap-1 pt-1">
                  {visibleLangs.map(l => (
                    <button key={l}
                      onClick={() => setActiveLang(l)}
                      className={[
                        'px-2 py-0.5 rounded text-xs border',
                        activeLang === l
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
                      ].join(' ')}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{languageNames[activeLang]} — title</label>
                  <textarea
                    value={form.titles[activeLang] ?? ''}
                    onChange={e => setTitle(activeLang, e.target.value)}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none dark:bg-gray-800 dark:border-gray-700"
                    dir={activeLang === 'he' ? 'rtl' : 'ltr'}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={autoTranslate} disabled={translating} className="w-full">
                  {translating ? 'Translating…' : '🤖 Auto-translate title from Hebrew'}
                </Button>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{languageNames[activeLang]} — description</label>
                  <textarea
                    value={form.descriptions[activeLang] ?? ''}
                    onChange={e => setDescription(activeLang, e.target.value)}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none dark:bg-gray-800 dark:border-gray-700"
                    dir={activeLang === 'he' ? 'rtl' : 'ltr'}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={autoTranslateDescription} disabled={translatingDescription} className="w-full">
                  {translatingDescription ? 'Translating…' : '🤖 Auto-translate description from Hebrew'}
                </Button>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          {isEdit && admin ? (
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={remove} disabled={deleting || deletingFuture}>
                {deleting ? 'Deleting…' : event?.recurrenceId ? 'Delete this' : '🗑 Delete'}
              </Button>
              {event?.recurrenceId && (
                <Button variant="destructive" size="sm" onClick={removeThisFuture} disabled={deleting || deletingFuture}>
                  {deletingFuture ? 'Deleting…' : 'Delete future'}
                </Button>
              )}
            </div>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {isEdit && event?.recurrenceId && (
              <Button variant="outline" onClick={saveThisFuture} disabled={saving || savingFuture}>
                {savingFuture ? 'Saving…' : 'Save future'}
              </Button>
            )}
            <Button onClick={save} disabled={saving || savingFuture}>
              {saving ? 'Saving…' : isEdit && event?.recurrenceId ? 'Save this' : '💾 Save'}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
