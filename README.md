# Baby Management Counter

Installable PWA that logs point shifts across six self-management categories.
No backend — data lives in your own Google Sheet; the app talks to the Sheets
API directly from the browser via Google OAuth. On first sign-in the app
creates a new spreadsheet in your Google Drive (normal Drive file, fully
visible/openable there) and seeds it with the tabs it needs.

## Categories

| Category | Emoji | Tracks |
|---|---|---|
| Mental | 🧠 | Mental capacity, staying grounded, emotional control |
| Capable | 🧩 | Handling basic tasks self-sufficiently |
| Tidy | 🧹 | Hygiene, clean environment, order vs. mess |
| Listening | 👂 | Holding a real conversation, not self-centered |
| Aware | 👀 | Noticing what's happening around you |
| Compliant | ✅ | Following through on what's asked |

Each starts the day at a base of 50 points (editable per category in the
`Config` sheet tab).

## Point scale

| Type | Value | Reason required |
|---|---|---|
| Minor | ±1 | no |
| Stronger | ±2 | no |
| Major | ±5 | yes |
| Massive | ±10 | yes |

## Tabs

- **Main** — today's standing per category, log buttons, recent entries
- **Log** — full log for any day, date-navigable
- **Dynamics** — trend chart, calendar heatmap, average end-of-day standing, most significant shifts

## Stack

Vite + React + TypeScript + Tailwind v4, `vite-plugin-pwa`, `idb` (offline
cache + pending write queue), `recharts`. Sync is append-only: logs push to
Sheets as they're created and pull back on load/focus/interval, so hand-edits
made directly in the Sheet are picked up too.

## Develop

```
npm install
cp .env.example .env   # fill in after following SETUP.md
npm run dev
```

Works without Google credentials too — pick "Continue without sync" on the
sign-in screen for a local-only IndexedDB mode.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. Add `VITE_GOOGLE_CLIENT_ID` as a repo secret first
(Settings → Secrets and variables → Actions).

See [SETUP.md](./SETUP.md) for the one-time Google Cloud setup.
