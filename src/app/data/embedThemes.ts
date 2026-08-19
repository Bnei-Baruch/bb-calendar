export interface EmbedTheme {
  id: 'cyan' | 'blue' | 'amber' | 'neutral' | 'dark';
  label: string;
  swatch: string;
}

export const EMBED_THEMES: EmbedTheme[] = [
  { id: 'cyan', label: "Kabbalah L'Am", swatch: '#00b6be' },
  { id: 'blue', label: 'Bnei Baruch', swatch: '#1e3a8a' },
  { id: 'amber', label: 'Arvut', swatch: '#b45309' },
  { id: 'neutral', label: 'Neutral', swatch: '#4b5563' },
  { id: 'dark', label: 'Dark', swatch: '#030712' },
];

export const DEFAULT_EMBED_THEME: EmbedTheme['id'] = 'cyan';

export function isEmbedTheme(value: string | null | undefined): value is EmbedTheme['id'] {
  return !!value && EMBED_THEMES.some(t => t.id === value);
}
