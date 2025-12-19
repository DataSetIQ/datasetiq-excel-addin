# Premium Features Implementation

## Overview
Added 4 premium features with free/paid tier restrictions to monetize the Excel add-in.

## Features Implemented

### ✅ Feature #6: Formula Builder Wizard
**What it does**: Step-by-step UI to construct DSIQ formulas without memorizing syntax
**Access**: Premium/Pro/Enterprise plans only
**Location**: "🔧 Builder" tab
**Implementation**:
- 3-step wizard: Select function → Enter series ID → Configure parameters
- Generates formulas for DSIQ, DSIQ_LATEST, DSIQ_VALUE, DSIQ_YOY
- Frequency selector (A, Q, M, W, D)
- Date picker for start_date parameter
- Inserts formula at active cell when complete

**Usage**:
1. Click "🔧 Builder" tab
2. Free users see upgrade prompt with 🔒 icon
3. Paid users access 3-step wizard
4. Final step inserts formula into Excel

---

### ✅ Feature #7: Rich Metadata Panel
**What it does**: Shows ALL available metadata fields for series previews
**Access**: Premium/Pro/Enterprise plans only
**Location**: Preview modal (Enhanced)
**Implementation**:
- Free users see: Latest Value, Title, Frequency, Units
- Paid users see: ALL metadata fields from API response with copy buttons
- Upgrade prompt shows: "View all X metadata fields"
- Copy button (📋) for each field

**Metadata Fields** (when available):
- source, frequency, units, title, updated, seasonal_adjustment, observation_start, observation_end, notes, methodology_url, related_series, etc.

---

### ✅ Feature #8: Multi-Series Insert
**What it does**: Select multiple series from search results and insert all at once
**Access**: Premium/Pro/Enterprise plans only
**Location**: Search results section
**Implementation**:
- Checkboxes appear next to each search result (paid users only)
- "Select All" checkbox at top
- Selected count badge: "Select All (3 selected)"
- "Insert X Series" button appears when items selected
- Inserts formulas in adjacent columns starting at active cell

**Usage**:
1. Search for series (e.g., "GDP")
2. Check multiple results
3. Click "Insert 3 Series" button
4. Formulas inserted in columns: A1 (series1), B1 (series2), C1 (series3)

---

### ✅ Feature #10: Templates Import/Export
**What it does**: Save and reuse collections of DSIQ formulas
**Access**: Premium/Pro/Enterprise plans only
**Location**: "📁 Templates" tab
**Implementation**:
- **Save Template**: Scans entire workbook for DSIQ formulas, saves as named template
- **Load Template**: Inserts saved formulas at active cell location (preserves relative positions)
- **Export**: Download all templates as JSON file
- **Import**: Upload JSON file to restore templates
- **Delete**: Remove individual templates
- Storage: `OfficeRuntime.storage` (key: `dsiq_templates`)

**Template Format**:
```json
{
  "id": "1234567890",
  "name": "My GDP Analysis",
  "formulas": [
    {"sheet": "Sheet1", "formula": "=DSIQ(\"FRED-GDP\")", "row": 0, "col": 0},
    {"sheet": "Sheet1", "formula": "=DSIQ_LATEST(\"BLS-CPI\")", "row": 1, "col": 0}
  ],
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Usage**:
1. Build dashboard with DSIQ formulas
2. Click "📁 Templates" tab
3. Enter template name, click "💾 Save Current Formulas"
4. Add-in scans all sheets, finds all DSIQ formulas
5. Later: Load template to recreate dashboard structure

---

## Tier Detection

### Code Location
`src/shared/api.ts`:
```typescript
export const PAID_PLANS = ['premium', 'pro', 'enterprise', 'Premium', 'Pro', 'Enterprise'];
export function isPaidPlan(plan?: string): boolean {
  return plan ? PAID_PLANS.includes(plan) : false;
}
```

### Plan Field
Fetched from: `GET /api/public/sheets/me`
Response: `{ email, plan, usage }`

### Access Control
Every premium feature calls `checkPremiumAccess(PREMIUM_FEATURES.XXX)` before executing:
```typescript
function checkPremiumAccess(feature: string): boolean {
  if (!profile || !isPaidPlan(profile.plan)) {
    setMessage(getUpgradeMessage(feature));
    return false;
  }
  return true;
}
```

### Upgrade Messages
Free users see:
- 🔒 icon next to premium tabs
- "Premium Feature" badge
- Upgrade prompt: "🔒 Formula Builder Wizard is a Premium feature. Upgrade at datasetiq.com/pricing to unlock."
- Clickable link: "View Plans →"

---

## Testing

### Test Suite Updates
File: `test.html`
- Fixed www redirect issue (changed `datasetiq.com` → `www.datasetiq.com`)
- Fixed API Integration Test (now uses correct URL)
- Fixed Search Functionality Test
- Fixed Browse by Source Test

### Test Results (Expected)
After deployment to Vercel:
1. ✅ Manifest loads
2. ✅ Icons load (32x32, 64x64)
3. ✅ Functions files load (JS, JSON, HTML)
4. ✅ Taskpane files load
5. ✅ API responds correctly
6. ✅ Search returns results
7. ✅ Browse by source works
8. ✅ Storage mock works
9. ✅ Preview shows data
10. ✅ UI features work

---

## User Experience

### Free Plan Users
- See all 6 tabs: Search, Browse, Favorites, Recent, 🔧 Builder 🔒, 📁 Templates 🔒
- Can use: Search, Browse, Favorites (50 max), Recent (20 max), Preview (basic metadata)
- Premium tabs show 🔒 icon
- Clicking premium features shows upgrade message with link

### Paid Plan Users
- Full access to all features
- No 🔒 icons
- Premium tabs fully functional
- Premium badge (✨) highlights advanced features
- Copy buttons on all metadata fields
- Multi-select checkboxes in search results

---

## Deployment

### Auto-Deploy (Vercel)
- Pushes to `main` branch trigger automatic deployment
- URL: `https://plugins.datasetiq.com`
- Manifest URL: `https://plugins.datasetiq.com/manifest.xml`

### Latest Deploy
Commit: `feat: Add premium features (Formula Builder, Rich Metadata, Multi-Insert, Templates) with tier restrictions + fix www redirect`
Changes:
- 4 files modified
- 533 insertions, 34 deletions
- Premium features implemented
- www redirect fixed

---

## Next Steps (Optional)

### Google Sheets Add-on
Implement equivalent features in `datasetiq-sheets-addon`:
1. Formula Builder (Apps Script UI)
2. Rich Metadata Panel (HTML sidebar)
3. Multi-Series Insert (batch insert via Apps Script)
4. Templates (PropertiesService storage)

### Analytics
Track premium feature usage:
- Log when users click premium features (free users)
- Track conversion: upgrade link clicks
- Monitor template saves/loads
- Track multi-insert usage

### Premium Feature Ideas (Future)
- **Formula Library**: Pre-built formulas for common analysis patterns
- **Data Refresh Scheduler**: Auto-refresh on schedule
- **Advanced Charting**: One-click visualization builder
- **Export to PDF**: Generate reports from templates
- **Collaboration**: Share templates with team
- **Custom Functions**: User-defined transformations

---

## Support

### Common Issues

**Q: Premium features not appearing?**
A: Check API key is valid. Profile must include `plan` field. Verify with test: `GET /api/public/sheets/me`

**Q: Templates not saving?**
A: Check browser console for OfficeRuntime.storage errors. Ensure add-in has storage permissions.

**Q: Multi-insert not working?**
A: Verify paid plan. Check Excel Online vs Desktop (both should work).

**Q: Test failures?**
A: Clear browser cache. Verify www redirect is configured. Check CORS headers at `/functions.js`.

### Contact
- Email: support@datasetiq.com
- Docs: datasetiq.com/docs
- Pricing: datasetiq.com/pricing
