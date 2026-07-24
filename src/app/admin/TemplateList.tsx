import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import * as XLSX from 'xlsx';
import { adminApi, type AdminTemplate } from './adminApi';
import { Button } from '../components/ui/button';

const ALL_LANGS = ['he', 'en', 'ru', 'es', 'de', 'it', 'fr', 'pt', 'uk', 'tr', 'bg'];

function exportToExcel(templates: AdminTemplate[]) {
  const rows = templates.map(t => ({
    name: t.name,
    type: t.type || 'regular',
    startTime: t.defaultStartTime,
    endTime: t.defaultEndTime,
    private: t.privateByDefault ? 'yes' : 'no',
    ...Object.fromEntries(ALL_LANGS.map(l => [l, t.titles[l] ?? ''])),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 30 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    ...ALL_LANGS.map(l => ({ wch: l === 'he' ? 30 : 28 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Templates');
  XLSX.writeFile(wb, 'templates.xlsx');
}

export function TemplateList() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    adminApi.getTemplates()
      .then(setTemplates)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await adminApi.deleteTemplate(id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const importFromSheets = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportResult('');
    setError('');
    try {
      const { created, updated } = await adminApi.importTemplatesFromSheets(importUrl.trim());
      setImportResult(`✅ Created: ${created}, updated: ${updated}`);
      setImportUrl('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Templates</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToExcel(templates)} disabled={templates.length === 0}>
            ↓ Export Excel
          </Button>
          <Button onClick={() => navigate('/admin/templates/new')}>+ New template</Button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="url"
          value={importUrl}
          onChange={e => setImportUrl(e.target.value)}
          placeholder="Paste Google Sheets URL to import templates…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
        />
        <Button variant="outline" onClick={importFromSheets} disabled={importing || !importUrl.trim()}>
          {importing ? 'Importing…' : '↑ Import'}
        </Button>
      </div>
      {importResult && <p className="text-sm text-green-600 mb-3">{importResult}</p>}

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading && <p className="text-gray-400">Loading…</p>}

      {!loading && (
        <div className="border rounded-xl overflow-hidden dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Name (Hebrew)</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="px-4 py-3">Private</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium" dir="rtl">{t.titles['he'] || t.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {t.type || 'regular'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.defaultStartTime && t.defaultEndTime
                      ? `${t.defaultStartTime}–${t.defaultEndTime}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">{t.privateByDefault ? '🔒' : '—'}</td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <button onClick={() => navigate(`/admin/templates/${t.id}`)}
                      className="text-blue-500 hover:text-blue-700">✏️</button>
                    <button onClick={() => remove(t.id, t.titles['he'] || t.name)}
                      className="text-red-400 hover:text-red-600">🗑</button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No templates yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
