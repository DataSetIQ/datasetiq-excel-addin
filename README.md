# DataSetIQ Excel Add-in (`datasetiq-excel-addin`)

Excel add-in using Office.js with custom functions and a React taskpane.

## Features
- Custom functions: `DSIQ` (spill with headers, newest-first), `DSIQ_LATEST`, `DSIQ_VALUE` (on-or-before), `DSIQ_YOY`, `DSIQ_META`.
- SharedRuntime + CustomFunctionsRuntime 1.3; API key stored in `OfficeRuntime.storage` (10MB cap).
- Deterministic async resolution; single retry with exponential backoff for 429/5xx using `Retry-After` when provided.
- Sidebar React app to connect API key, view entitlements (`/api/public/sheets/me`), search series, and manage disconnect.
- Fallback: if `OfficeRuntime` is unavailable, functions resolve with `Please open DataSetIQ sidebar to connect.` rather than throwing.
- Date normalization to UTC `YYYY-MM-DD`; frequency/start normalization.

## Scripts
- `npm run start` – Vite dev server for taskpane.
- `npm run build:functions` – bundle custom functions to `dist/functions.js`.
- `npm run build:copy` – copy `functions.html` and `functions.json` to `dist/`.
- `npm run build:taskpane` – build React taskpane to `dist/taskpane`.
- `npm run build` – all of the above.
- `npm run lint` / `npm run typecheck` / `npm run test` / `npm run format`.

## Structure
- `src/functions` – custom functions runtime + metadata and host page.
- `src/taskpane` – React UI (App.tsx) + styles.
- `src/shared` – shared fetch/error/date helpers and storage wrapper.
- `dist/` – publishable bundle (`functions.js/html/json`, `taskpane/`).

## Manifest
- `manifest.xml` declares `SharedRuntime` 1.1 and `CustomFunctionsRuntime` 1.3, points to hosted assets at `https://plugins.datasetiq.com/`.
- Update icon URLs and ids as needed before submission. Validate with `office-addin-manifest validate manifest.xml`.

## Entitlement QA (manual)
- Anonymous: returns limited data (no key) or shows connect prompt if storage unsupported.
- Invalid key: cell error “Invalid API Key. Please reconnect.”
- Free limit: server-enforced truncation.
- Quota exceeded: cell error “Daily Quota Exceeded.” and sidebar upgrade CTA.
- Shared file: API key not persisted in workbook; each user connects separately.
