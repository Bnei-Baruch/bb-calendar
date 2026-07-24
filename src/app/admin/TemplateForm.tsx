import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { adminApi } from './adminApi';
import { Button } from '../components/ui/button';
import { type Language, languageNames } from '../utils/i18n';

const ALL_LANGS: Language[] = ['he', 'en', 'ru', 'es', 'de', 'it', 'fr', 'pt', 'uk', 'tr', 'bg'];

export function TemplateForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    titles: {} as Record<string, string>,
    defaultStartTime: '',
    defaultEndTime: '',
    privateByDefault: false,
    type: 'regular',
  });
  const [activeLang, setActiveLang] = useState<Language>('he');
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNew && id) {
      adminApi.getTemplate(Number(id))
        .then(t => setForm({
          name: t.name,
          titles: { ...t.titles },
          defaultStartTime: t.defaultStartTime,
          defaultEndTime: t.defaultEndTime,
          privateByDefault: t.privateByDefault,
          type: t.type || 'regular',
        }))
        .catch(e => setError(e.message));
    }
  }, [id, isNew]);

  const setTitle = (lang: Language, value: string) => {
    setForm(f => ({ ...f, titles: { ...f.titles, [lang]: value } }));
  };

  const autoTranslate = async () => {
    const source = form.titles['he'] || form.titles['en'];
    if (!source) { setError('Fill in Hebrew first'); return; }
    const sourceLang = form.titles['he'] ? 'he' : 'en';
    const missing = ALL_LANGS.filter(l => l !== sourceLang && !form.titles[l]);
    if (!missing.length) return;
    setTranslating(true);
    setError('');
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
    if (!form.name) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        titles: form.titles,
        defaultStartTime: form.defaultStartTime,
        defaultEndTime: form.defaultEndTime,
        privateByDefault: form.privateByDefault,
        type: form.type,
      };
      if (isNew) {
        await adminApi.createTemplate(payload);
      } else {
        await adminApi.updateTemplate(Number(id), payload);
      }
      navigate('/admin/templates');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !confirm('Delete this template?')) return;
    try {
      await adminApi.deleteTemplate(Number(id));
      navigate('/admin/templates');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/templates')}
          className="text-gray-400 hover:text-gray-600">← Templates</button>
        <h1 className="text-xl font-semibold">{isNew ? 'New Template' : 'Edit Template'}</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Internal name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Morning Lesson"
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Event type</label>
          <div className="flex gap-2">
            {(['regular', 'special', 'conference', 'holiday'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.type === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >{t}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Default start time</label>
            <input type="time" value={form.defaultStartTime}
              onChange={e => setForm(f => ({ ...f, defaultStartTime: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Default end time</label>
            <input type="time" value={form.defaultEndTime}
              onChange={e => setForm(f => ({ ...f, defaultEndTime: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.privateByDefault}
            onChange={e => setForm(f => ({ ...f, privateByDefault: e.target.checked }))}
            className="rounded" />
          🔒 Private by default
        </label>

        <div className="border rounded-xl p-4 space-y-3 dark:border-gray-700">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Titles & descriptions</p>

          <div className="flex flex-wrap gap-1">
            {ALL_LANGS.map(l => (
              <button key={l}
                onClick={() => setActiveLang(l)}
                className={[
                  'px-2 py-0.5 rounded text-xs border',
                  activeLang === l
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
                ].join(' ')}
              >
                {l} {form.titles[l] ? '✓' : ''}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">{languageNames[activeLang]}</label>
            <textarea
              value={form.titles[activeLang] ?? ''}
              onChange={e => setTitle(activeLang, e.target.value)}
              rows={2}
              placeholder={`Title in ${languageNames[activeLang]}…`}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none dark:bg-gray-800 dark:border-gray-700"
              dir={activeLang === 'he' ? 'rtl' : 'ltr'}
            />
          </div>

          <Button variant="outline" size="sm" onClick={autoTranslate} disabled={translating} className="w-full">
            {translating ? 'Translating…' : '🤖 Auto-translate all from Hebrew'}
          </Button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {!isNew ? (
            <Button variant="destructive" size="sm" onClick={remove}>🗑 Delete</Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/templates')}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : '💾 Save'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
