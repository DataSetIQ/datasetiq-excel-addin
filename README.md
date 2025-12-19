# DataSetIQ Excel Add-in

**Professional Excel add-in for economic and financial data from 15+ global sources.**

## 📊 Features

### Custom Functions
- **`DSIQ(seriesId, [freq], [start])`** – Full time-series array with headers (newest-first)
- **`DSIQ_LATEST(seriesId)`** – Most recent value only
- **`DSIQ_VALUE(seriesId, date)`** – Value on or before specified date
- **`DSIQ_YOY(seriesId)`** – Year-over-year growth rate
- **`DSIQ_META(seriesId, field)`** – Metadata (title, units, frequency, etc.)

### Premium Features 🔓

**Formula Builder Wizard** (🔧 Builder tab)
- Step-by-step formula creation with guided inputs
- Supports all DSIQ function types
- Preview before inserting into cells

**Templates System** (📁 Templates tab)
- Scan current workbook for DSIQ formulas
- Save formula collections as reusable templates
- Load templates into new workbooks instantly
- Manage saved templates (view, load, delete)

**Multi-Series Insert** (Search tab)
- Select multiple series with checkboxes
- Bulk insert with single click
- Saves time on repetitive data pulls

**Enhanced Search** (🔍 Search tab)
- Search across 15 data providers
- Browse by source (FRED, BLS, IMF, OECD, etc.)
- Favorites and Recent tracking
- Live data preview with metadata
- On-demand ingestion for metadata-only datasets

### Data Sources (15 Providers)
- **FRED** – Federal Reserve Economic Data
- **BLS** – Bureau of Labor Statistics
- **BEA** – Bureau of Economic Analysis
- **Census** – US Census Bureau
- **EIA** – Energy Information Administration
- **IMF** – International Monetary Fund
- **OECD** – Organisation for Economic Co-operation
- **World Bank** – Global development data
- **ECB** – European Central Bank
- **Eurostat** – European statistics
- **BOE** – Bank of England
- **ONS** – UK Office for National Statistics
- **StatCan** – Statistics Canada
- **RBA** – Reserve Bank of Australia
- **BOJ** – Bank of Japan

## 🆓 Free vs 💎 Paid Plans

| Feature | Free (No API Key) | Paid (Valid API Key) |
|---------|------------------|----------------------|
| **Custom Functions** | ✅ All functions | ✅ All functions |
| **Observation Limit** | 100 most recent | 1,000 most recent |
| **Search & Insert** | ✅ Basic search | ✅ Enhanced search |
| **Data Preview** | ✅ Available | ✅ Available |
| **Formula Builder** | ❌ Locked | ✅ Unlocked |
| **Templates** | ❌ Locked | ✅ Unlocked |
| **Multi-Insert** | ❌ Not available | ✅ Checkboxes visible |
| **Favorites/Recent** | ✅ Available | ✅ Available |
| **Browse by Source** | ✅ Available | ✅ Available |

**Upgrade Message**: When data is truncated at 100 observations, users see:
> ⚠️ Data limited to 100 most recent observations. Upgrade to a paid plan at datasetiq.com/pricing for up to 1,000 observations per series.

## 🚀 Getting Started

### Installation
1. Download the add-in from Microsoft AppSource or sideload via `manifest.xml`
2. Open Excel → Insert → My Add-ins → DataSetIQ
3. Taskpane opens on the right side

### Connecting Your Account
1. Visit [datasetiq.com/dashboard/api-keys](https://datasetiq.com/dashboard/api-keys)
2. Create an API key (free or paid plan)
3. In Excel taskpane, enter your API key and click "Save"
4. Status shows: ✅ Connected - Premium features unlocked

### Using Custom Functions

**Basic Usage:**
```excel
=DSIQ("FRED-GDP")
// Returns full GDP time-series with Date/Value headers

=DSIQ_LATEST("BLS-CPI")
// Returns latest CPI value

=DSIQ_VALUE("IMF-NGDP", "2023-12-31")
// Returns GDP value on or before Dec 31, 2023

=DSIQ_YOY("FRED-UNRATE")
// Returns year-over-year change in unemployment rate
```

**Advanced Options:**
```excel
=DSIQ("FRED-GDP", "quarterly", "2020-01-01")
// GDP data, quarterly frequency, from 2020 onwards

=DSIQ_META("FRED-GDP", "title")
// Returns metadata field (title, units, frequency, updated, source)
```

## 📖 User Guides

### Formula Builder Wizard

**Step 1: Choose Function**
- Select from DSIQ, DSIQ_LATEST, DSIQ_VALUE, or DSIQ_YOY
- Each function has different parameters

**Step 2: Enter Series ID**
- Enter the series identifier (e.g., "FRED-GDP")
- Use Search tab to find series IDs

**Step 3: Configure Options** (DSIQ and DSIQ_VALUE only)
- **Frequency**: Optional (e.g., "quarterly", "monthly")
- **Start Date**: Optional (e.g., "2020-01-01")

**Step 4: Insert**
- Click "Insert Formula" to place in active cell
- Formula appears in cell and updates automatically

### Templates Guide

**Creating a Template:**
1. Build your workbook with DSIQ formulas
2. Click **🔧 Builder** tab → **Templates** sub-tab
3. Click "🔍 Scan Current Sheet"
4. Review found formulas (count shown)
5. Enter template name (e.g., "Q4 Report")
6. Click "💾 Save Template"

**Loading a Template:**
1. Open new workbook or sheet
2. Navigate to Templates tab
3. Find saved template in list
4. Click "📥 Load" button
5. All formulas inserted at original cell positions

**Managing Templates:**
- **View**: See all saved templates with formula count
- **Load**: Insert template into active sheet
- **Delete**: Remove template (🗑️ button)

### Multi-Series Insert

**Selecting Series:**
1. Search for series in Search tab
2. Check boxes appear next to results (paid users only)
3. Select multiple series by clicking checkboxes
4. Counter updates: "Insert X Series" button appears

**Bulk Insert:**
1. Select active cell where you want first series
2. Click "Insert X Series" button
3. Series inserted vertically (one per row)
4. Uses DSIQ_LATEST function by default

## 🛠 Technical Details

### Architecture
- **SharedRuntime** + **CustomFunctionsRuntime 1.3** for performance
- API key stored in `OfficeRuntime.storage` (10MB capacity, persists across sessions)
- LocalStorage fallback for browser testing
- Deterministic async resolution for reliable cell updates
- Single retry with exponential backoff for 429/5xx errors
- Respects `Retry-After` headers from API

### Error Handling
- **No API Key**: "Please open DataSetIQ sidebar to connect."
- **Invalid Key**: "Invalid API Key. Reconnect at datasetiq.com/dashboard/api-keys"
- **Rate Limited**: "Rate limited. Please retry shortly."
- **Free Limit**: "Free plan limit reached. Upgrade at datasetiq.com/pricing"
- **Server Error**: "Server unavailable. Please retry."

### Date Normalization
- All dates normalized to UTC `YYYY-MM-DD` format
- Handles MM/DD/YYYY, DD/MM/YYYY, ISO 8601, timestamps
- Frequency and start date parameters also normalized

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
