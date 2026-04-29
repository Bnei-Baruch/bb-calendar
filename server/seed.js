#!/usr/bin/env node
// Run once: node server/seed.js
// Seeds all recurring event templates found in the spreadsheet.
import { pool, initDb } from './db.js';

const templates = [
  // ── Daily recurring ──────────────────────────────────────────
  { name: 'הכנה לשיעור',                          start: '02:40', end: '02:50', priv: false },
  { name: 'שיעור בוקר',                           start: '02:50', end: '05:30', priv: false },
  { name: 'שיעור הקבלה היומי',                    start: '02:50', end: '05:20', priv: false },
  { name: 'שיעור צוהריים',                         start: '12:00', end: '13:00', priv: false },
  { name: 'שיעור זוהר',                            start: '17:30', end: '18:30', priv: false },
  // ── Friday ───────────────────────────────────────────────────
  { name: 'סעודת חומוס',                           start: '05:35', end: '06:10', priv: false },
  { name: 'סעודה ראשונה',                          start: '14:30', end: '15:15', priv: false },
  { name: 'הכנה לשיעור שבת',                       start: '15:45', end: '16:00', priv: false },
  { name: 'סעודת שישי צוהריים',                    start: '14:30', end: '15:15', priv: false },
  // ── Shabbat ──────────────────────────────────────────────────
  { name: 'שיעור - "לומדים מהמקורות"',             start: '16:00', end: '17:30', priv: false },
  { name: 'סעודה שנייה',                           start: '05:40', end: '06:10', priv: false },
  { name: 'סעודה שלישית',                          start: '17:30', end: '18:15', priv: false },
  // ── Evening lessons ──────────────────────────────────────────
  { name: 'הכנה לשיעור "קהילת הלומדים"',           start: '18:50', end: '19:00', priv: false },
  { name: 'שיעור "קהילת הלומדים"',                 start: '19:00', end: '20:30', priv: false },
  { name: 'הכנה לשיעור "לימוד מעמיק"',             start: '18:50', end: '19:00', priv: false },
  { name: 'שיעור "לימוד מעמיק, מאמרי הרב"ש"',     start: '19:00', end: '20:30', priv: false },
  { name: 'שיעור "לימוד מעמיק, מאמרי בעל הסולם"', start: '18:00', end: '19:30', priv: false },
  { name: 'ישיבת חברים',                           start: '18:30', end: '19:30', priv: true  },
  // ── Special programs ─────────────────────────────────────────
  { name: 'קמפוס גלובלי',                          start: '12:00', end: '13:30', priv: false },
];

const titles = {
  'הכנה לשיעור':                          { he: 'הכנה לשיעור',                          en: 'Lesson Preparation',                      ru: 'Подготовка к уроку',                     es: 'Preparación para la lección' },
  'שיעור בוקר':                           { he: 'שיעור בוקר',                           en: 'Morning Lesson',                          ru: 'Утренний урок',                          es: 'Lección de la mañana' },
  'שיעור הקבלה היומי':                    { he: 'שיעור הקבלה היומי',                    en: 'Daily Kabbalah Lesson',                   ru: 'Ежедневный урок каббалы',                es: 'Lección diaria de Cabalá' },
  'שיעור צוהריים':                         { he: 'שיעור צוהריים',                        en: 'Afternoon Lesson',                        ru: 'Дневной урок',                           es: 'Lección del mediodía' },
  'שיעור זוהר':                            { he: 'שיעור זוהר',                           en: 'Zohar Lesson',                            ru: 'Урок Зоара',                             es: 'Lección del Zóhar' },
  'סעודת חומוס':                           { he: 'סעודת חומוס',                          en: 'Hummus Feast',                            ru: 'Трапеза с хумусом',                      es: 'Festín de hummus' },
  'סעודה ראשונה':                          { he: 'סעודה ראשונה',                         en: 'First Meal',                              ru: 'Первая трапеза',                         es: 'Primera comida' },
  'הכנה לשיעור שבת':                       { he: 'הכנה לשיעור שבת',                      en: 'Shabbat Lesson Preparation',              ru: 'Подготовка к уроку Шабата',             es: 'Preparación lección Shabbat' },
  'סעודת שישי צוהריים':                    { he: 'סעודת שישי צוהריים',                   en: 'Friday Lunch Feast',                      ru: 'Трапеза пятницы',                        es: 'Festín del viernes al mediodía' },
  'שיעור - "לומדים מהמקורות"':             { he: 'שיעור - "לומדים מהמקורות"',            en: 'Lesson - Learning from the Sources',      ru: 'Урок — Изучение первоисточников',        es: 'Lección - Aprendiendo de las fuentes' },
  'סעודה שנייה':                           { he: 'סעודה שנייה',                          en: 'Second Meal',                             ru: 'Вторая трапеза',                         es: 'Segunda comida' },
  'סעודה שלישית':                          { he: 'סעודה שלישית',                         en: 'Third Meal',                              ru: 'Третья трапеза',                         es: 'Tercera comida' },
  'הכנה לשיעור "קהילת הלומדים"':           { he: 'הכנה לשיעור "קהילת הלומדים"',          en: 'Preparation — Community of Learners',     ru: 'Подготовка — Сообщество учеников',       es: 'Preparación — Comunidad de Estudiantes' },
  'שיעור "קהילת הלומדים"':                 { he: 'שיעור "קהילת הלומדים"',                en: 'Community of Learners Lesson',            ru: 'Урок «Сообщество учеников»',             es: 'Lección Comunidad de Estudiantes' },
  'הכנה לשיעור "לימוד מעמיק"':             { he: 'הכנה לשיעור "לימוד מעמיק"',            en: 'Preparation — Deep Study',                ru: 'Подготовка — Углублённое изучение',      es: 'Preparación — Estudio profundo' },
  'שיעור "לימוד מעמיק, מאמרי הרב"ש"':     { he: 'שיעור "לימוד מעמיק, מאמרי הרב"ש"',    en: 'Deep Study — Articles of the Rabash',     ru: 'Углублённое изучение — статьи РАБАШа',  es: 'Estudio profundo — Artículos del Rabash' },
  'שיעור "לימוד מעמיק, מאמרי בעל הסולם"': { he: 'שיעור "לימוד מעמיק, מאמרי בעל הסולם"',en: 'Deep Study — Articles of Baal HaSulam',  ru: 'Углублённое изучение — статьи Бааль Сулама', es: 'Estudio profundo — Artículos de Baal HaSulam' },
  'ישיבת חברים':                           { he: 'ישיבת חברים',                          en: 'Friends Assembly',                        ru: 'Собрание друзей',                        es: 'Asamblea de amigos' },
  'קמפוס גלובלי':                          { he: 'קמפוס גלובלי',                         en: 'Global Campus',                           ru: 'Глобальный кампус',                      es: 'Campus Global' },
};

await initDb();

for (const t of templates) {
  const existing = await pool.query(
    'SELECT id FROM event_templates WHERE name = $1',
    [t.name]
  );
  if (existing.rows.length > 0) {
    console.log(`Skip (exists): ${t.name}`);
    continue;
  }
  await pool.query(
    `INSERT INTO event_templates (name, titles, default_start_time, default_end_time, private_by_default)
     VALUES ($1, $2, $3, $4, $5)`,
    [t.name, JSON.stringify(titles[t.name] || { he: t.name }), t.start, t.end, t.priv]
  );
  console.log(`Seeded: ${t.name}`);
}

await pool.end();
console.log('Done.');
