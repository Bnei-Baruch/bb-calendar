# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Run frontend (Vite on :5173) + backend (Express on :3001) concurrently
npm run server       # Backend API only
npm run build        # Production build (Vite)
```

The Vite dev server proxies `/api/*` requests to `http://localhost:3001`, so both processes must run together during development.

## Architecture Overview

**Full-stack app:** React frontend (Vite) + Express backend (port 3001).

### Data Flow

1. `EventsContext` fetches `/api/events` on mount
2. `server.js` checks a 10-minute disk cache (`data/events.json`)
3. On cache miss: fetches from **Google Sheets** (service account auth), parses multilingual event rows, saves to cache
4. Enriches events with study links from `study.kli.one` API (separate 10-min cache)
5. Returns enriched events array to frontend

The service account key file (`bb-calendar-488901-6a4730c846cc.json`) must be present in the project root for the backend to work.

### Frontend Structure

Entry: `src/main.tsx` → `App.tsx` wraps everything in `<LanguageProvider>` → `<EventsProvider>` → `<RouterProvider>`.

`Root.tsx` provides the layout (Header + ViewNavigation + Outlet). Routes:
- `/` → `DayView` (default)
- `/calendar` → `CalendarView`
- `/upcoming` → `UpcomingEventsView`
- `/event/:eventId` → `EventDetail`

State lives in two contexts:
- **EventsContext** — events array + loading state
- **LanguageContext** — current language (`he`/`en`/`ru`/`es`), persisted to localStorage, defaults to Hebrew

### Event Data Model

```typescript
{
  id: string          // "ev-1", "ev-2", ...
  type: "regular" | "conference"  // conference = multi-day
  date: string        // YYYY-MM-DD
  endDate?: string
  startTime: string   // HH:mm
  endTime: string
  title: { he, en, ru, es }
  description?: { he, en, ru, es }
  location?: string
  studyLink?: string
}
```

Helper functions (`src/app/data/events.ts`): `getEventsByDate`, `getMonthEvents`, `getEventById`.

### Styling

Tailwind CSS v4 (via `@tailwindcss/vite` — no separate PostCSS config needed), MUI, and Emotion. Path alias `@` → `src/`. Dark mode and RTL (Hebrew) are both supported; direction is set based on the active language.

### Translations

All UI strings are in `src/utils/i18n.ts` keyed by language code. Components use the `LanguageContext` hook and look up translations there.

## Deployment

Production is at `cal.kli.one`. Deployment uses rsync + `npm run build` + PM2 (`serve` for static files on :5173, `node server.js` on :3001) behind nginx with SSL on the DNS machine.
