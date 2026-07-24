# API Reference

Base URL: `http://localhost:3001` (dev) / `https://cal.kli.one` (prod)

All `/api/admin/*` routes require a Keycloak Bearer token:
```
Authorization: Bearer <token>
```

---

## Authentication

| Role | Access |
|------|--------|
| *(none)* | Public events only (`private: false`) |
| `events_moderator` | All events including private, no edit |
| `events_translator` | Create/edit events (non-Hebrew fields only) |
| `events_admin` | Full access |

---

## Public Endpoints

### `GET /api/events`
Returns all events sorted by date + start time. Authenticated requests with `events_admin` or `events_moderator` role also receive private events.

**Response** — array of Event objects:
```json
[
  {
    "id": "adm-123",
    "type": "regular",
    "date": "2026-05-19",
    "endDate": "2026-05-21",
    "startTime": "02:50",
    "endTime": "05:20",
    "title": { "he": "שיעור בוקר", "en": "Morning Lesson", "ru": "Утренний урок" },
    "description": { "he": "...", "en": "..." },
    "location": "Online",
    "private": false,
    "studyLink": "https://study.kli.one/event/abc",
    "_db": true
  }
]
```

---

### `GET /api/ics/:eventId`
Downloads an `.ics` calendar file for a single event.

**Query params:**
- `lang` — language code for title/description (default: `en`)

**Response:** `text/calendar` file.

---

### `GET /api/posts`
Returns recent Telegram channel posts.

---

### `GET /api/posts/media/:id`
Serves a cached media image (JPEG) by numeric ID.

---

### `GET /api/resolve-audio?url=<study_url>`
Resolves a `study.kli.one` content unit URL to a direct Hebrew audio stream.

**Response:**
```json
{
  "audioUrl": "https://cdn.kabbalahmedia.info/...",
  "name": "Morning Lesson",
  "duration": 9240,
  "startSec": 120,
  "endSec": 600
}
```

---

## Admin Events — `/api/admin/events`

### `GET /api/admin/events` 🔒 admin
Returns all DB events including private ones.

### `GET /api/admin/events/:id` 🔒 admin/translator
Returns a single event by ID.

### `POST /api/admin/events` 🔒 admin/translator
Creates a new event.

**Body:**
```json
{
  "type": "regular",
  "date": "2026-06-01",
  "endDate": "2026-06-03",
  "startTime": "02:50",
  "endTime": "05:20",
  "titles": { "he": "שיעור בוקר", "en": "Morning Lesson" },
  "descriptions": { "he": "...", "en": "..." },
  "location": "Online",
  "private": false,
  "generationTag": "2026-06",
  "parentId": "adm-100"
}
```

> **Translator note:** `titles.he`, `descriptions.he`, and `private` are silently stripped/forced for `events_translator` role.

**Response:** Created event object (`201`).

### `PUT /api/admin/events/:id` 🔒 admin/translator
Updates an existing event. Same body as POST. Translators cannot change Hebrew fields or the private flag.

**Response:** Updated event object.

### `DELETE /api/admin/events/:id` 🔒 admin
- `adm-*` events: hard deleted
- `ev-*` events (legacy Sheets): soft-deleted (`suppressed = true`)

**Response:** `{ "ok": true }`

---

## Admin Templates — `/api/admin/templates`

All template routes require `events_admin`.

### `GET /api/admin/templates`
Returns all templates.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Morning Lesson",
    "titles": { "he": "שיעור בוקר", "en": "Morning Lesson", "ru": "Утренний урок" },
    "type": "regular",
    "defaultStartTime": "02:50",
    "defaultEndTime": "05:20",
    "privateByDefault": false
  }
]
```

### `GET /api/admin/templates/:id`
Returns a single template.

### `POST /api/admin/templates`
Creates a template.

**Body:**
```json
{
  "name": "Morning Lesson",
  "titles": { "he": "שיעור בוקר", "en": "Morning Lesson" },
  "defaultStartTime": "02:50",
  "defaultEndTime": "05:20",
  "privateByDefault": false,
  "type": "regular"
}
```

### `PUT /api/admin/templates/:id`
Updates a template.

### `DELETE /api/admin/templates/:id`
Deletes a template.

---

## Schedule Generation — `/api/admin/generate`

All generation routes require `events_admin`.

### `POST /api/admin/generate/preview`
Generates a preview schedule for a target month by analyzing the pattern from a reference month.

**Body:**
```json
{ "targetMonth": "2026-06", "referenceMonth": "2026-05" }
```

**Response:**
```json
{
  "previewEvents": [ { "date": "2026-06-01", "startTime": "02:50", "endTime": "05:20", "type": "regular", "titles": {...}, "private": false } ],
  "holidayDates": [ { "date": "2026-06-02", "nameHe": "שבועות", "nameEn": "Shavuot", "category": "major-holiday" } ],
  "existingDates": ["2026-06-15"],
  "referenceMonth": "2026-05",
  "targetMonth": "2026-06"
}
```

### `POST /api/admin/generate/confirm`
Bulk-inserts previewed events into the DB.

**Body:**
```json
{ "events": [ ...previewEvents ], "targetMonth": "2026-06" }
```

**Response:** `{ "created": 87, "generationTag": "2026-06" }`

### `DELETE /api/admin/generate/:tag`
Deletes all events with a given `generationTag` (e.g. `"2026-06"`).

**Response:** `{ "deleted": 87 }`

---

## Holidays — `/api/admin/holidays`

All holiday routes require `events_admin`.

### `GET /api/admin/holidays/:year`
Returns all Hebrew calendar holidays for a given Gregorian year (cached in DB).

### `GET /api/admin/holidays/year/:year`
Returns holidays grouped by family (multi-day holidays merged), filtered to major ones only.

### `POST /api/admin/holidays/ai-preview`
Uses Claude to select and translate holidays for a target year based on the current year's pattern.

**Body:** `{ "currentYear": 2026, "targetYear": 2027 }`

**Response:** `{ "suggestions": [...], "targetYear": 2027, "currentYear": 2026 }`

### `POST /api/admin/holidays/create`
Creates holiday events in the DB from the AI-preview suggestions.

**Body:** `{ "items": [ { "date": "2027-09-21", "endDate": "2027-09-23", "titles": {...}, "type": "holiday" } ] }`

---

## AI Translation — `/api/admin/translate`

🔒 admin/translator

### `POST /api/admin/translate`
Translates a short event title into multiple languages using Claude.

**Body:**
```json
{
  "text": "שיעור בוקר",
  "sourceLang": "he",
  "targetLangs": ["en", "ru", "de", "fr"]
}
```

**Response:**
```json
{
  "translations": {
    "en": "Morning Lesson",
    "ru": "Утренний урок",
    "de": "Morgenstunde",
    "fr": "Cours du matin"
  }
}
```

---

## Import from Google Sheets — `/api/admin`

Both routes require `events_admin`.

### `POST /api/admin/events/import-sheets`
Imports events for a specific congress/holiday from a Google Sheet (CSV export). Upserts by `(parentId, date, startTime)`. Auto-translates missing language titles via Claude.

**Body:**
```json
{
  "url": "https://docs.google.com/spreadsheets/d/.../edit?gid=0",
  "parentId": "adm-100"
}
```

**Response:** `{ "created": 12, "updated": 3 }`

### `POST /api/admin/templates/import-sheets`
Imports or updates templates from a Google Sheet. Sheet columns: `name, startTime, endTime, he, en, ru, es, de, it, fr, pt, uk, tr, bg`. Upserts by `name`.

**Body:** `{ "url": "https://docs.google.com/spreadsheets/d/..." }`

**Response:** `{ "created": 2, "updated": 9 }`

---

## Language Codes

| Code | Language |
|------|----------|
| `he` | Hebrew |
| `en` | English |
| `ru` | Russian |
| `es` | Spanish |
| `de` | German |
| `it` | Italian |
| `fr` | French |
| `pt` | Portuguese |
| `uk` | Ukrainian |
| `tr` | Turkish |
| `bg` | Bulgarian |
