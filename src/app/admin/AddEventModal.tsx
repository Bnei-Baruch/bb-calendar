import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, type AdminEvent, type AdminTemplate } from './adminApi';
import { Button } from '../components/ui/button';
import { type Language, languageNames } from '../utils/i18n';
import { useEvents } from '../context/EventsContext';
import { isAdmin } from './AdminGuard';

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
  const visibleLangs = admin ? ALL_LANGS : ALL_LANGS.filter(l => l !== 'he');
  const { events: allEvents } = useEvents();

  const parents = allEvents.filter(e => e.type === 'conference' || e.type === 'holiday');

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
    titles: event?.title ?? {} as Record<string, string>,
  });
  const [activeLang, setActiveLang] = useState<Language>(admin ? 'he' : 'en');
  const [showTitles, setShowTitles] = useState(isEdit);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    setForm(f => ({
      ...f,
      type: t.type || f.type,
      startTime: t.defaultStartTime || f.startTime,
      endTime: t.defaultEndTime || f.endTime,
      private: admin ? t.privateByDefault : false,
      titles: templateTitles,
    }));
  };

  const setTitle = (lang: Language, value: string) => {
    setForm(f => ({ ...f, titles: { ...f.titles, [lang]: value } }));
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

  const save = async () => {
    if (!form.date) { setError('Date is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        type: form.type,
        date: form.date,
        endDate: form.endDate || undefined,
        startTime: form.startTime,
        endTime: form.endTime,
        titles: form.titles,
        private: form.private,
        parentId: selectedParentId || undefined,
      };
      if (isEdit) {
        await adminApi.updateEvent(event.id, payload);
      } else {
        await adminApi.createEvent(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
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

          <div className="border rounded-lg dark:border-gray-700">
            <button
              onClick={() => setShowTitles(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
            >
              <span>▶ Override titles</span>
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
                  <label className="block text-xs text-gray-400 mb-1">{languageNames[activeLang]}</label>
                  <textarea
                    value={form.titles[activeLang] ?? ''}
                    onChange={e => setTitle(activeLang, e.target.value)}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none dark:bg-gray-800 dark:border-gray-700"
                    dir={activeLang === 'he' ? 'rtl' : 'ltr'}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={autoTranslate} disabled={translating} className="w-full">
                  {translating ? 'Translating…' : '🤖 Auto-translate from Hebrew'}
                </Button>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          {isEdit && admin ? (
            <Button variant="destructive" size="sm" onClick={remove} disabled={deleting}>
              {deleting ? 'Deleting…' : '🗑 Delete'}
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save'}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
