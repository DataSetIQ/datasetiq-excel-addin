# 🚀 Vercel Deployment Guide for Excel Add-in

**Target URL**: `https://plugins.datasetiq.com`  
**Platform**: Vercel (Static Site Hosting)  
**DNS**: Cloudflare (with Grey Cloud OFF)

---

## Step 1: Create Vercel Project

### Option A: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository**: Select `datasetiq-excel-addin` from GitHub
3. **Configure Project**:
   - Framework Preset: **Other** (Static)
   - Root Directory: `./` (leave default)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Environment Variables**: None required (public add-in)

5. Click **Deploy**

### Option B: Via Vercel CLI

```bash
cd /Users/darshil/Desktop/DataSetIQ/Code/datasetiq-excel-addin

# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Answer prompts:
# - Set up and deploy? Y
# - Scope: Your account
# - Link to existing project? N
# - Project name: datasetiq-excel-addin
# - Directory: ./ (default)
# - Override build settings? N

# Production deployment
vercel --prod
```

---

## Step 2: Configure Custom Domain (Cloudflare)

### A. Add Domain to Vercel Project

1. In Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter: `plugins.datasetiq.com`
4. Vercel will provide a CNAME target (e.g., `cname.vercel-dns.com`)

### B. Configure DNS in Cloudflare

**CRITICAL**: Must use DNS Only mode (Grey Cloud) to avoid SSL errors.

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select domain: `datasetiq.com`
3. Go to **DNS** → **Records**
4. Click **Add record**

**Record Configuration:**
```
Type: CNAME
Name: plugins
Target: cname.vercel-dns.com
Proxy status: DNS only (Grey Cloud) ⚠️ CRITICAL
TTL: Auto
```

**Why Grey Cloud?**
- Prevents Cloudflare from proxying requests
- Avoids SSL certificate conflicts
- Lets Vercel manage the certificate directly
- Prevents infinite redirect loops

### C. Verify SSL Certificate

1. Wait 5-10 minutes for DNS propagation
2. Vercel will automatically issue Let's Encrypt certificate
3. Check status in Vercel Dashboard → Domains
4. Test: `https://plugins.datasetiq.com/functions.json`

---

## Step 3: Verify Deployment

### Test Endpoints

```bash
# Functions metadata
curl https://plugins.datasetiq.com/functions.json

# Functions JavaScript
curl https://plugins.datasetiq.com/functions.js

# Functions HTML page
curl https://plugins.datasetiq.com/functions.html

# Taskpane UI
curl https://plugins.datasetiq.com/taskpane/index.html

# Check CORS headers
curl -I https://plugins.datasetiq.com/functions.js | grep -i "access-control"
```

**Expected CORS Headers:**
```
access-control-allow-origin: *
access-control-allow-methods: GET,POST,OPTIONS
access-control-allow-headers: Content-Type, Authorization
```

### Test from Excel

1. Open Excel Online: [office.live.com/start/Excel.aspx](https://office.live.com/start/Excel.aspx)
2. Insert → Office Add-ins → **Upload My Add-in**
3. Upload `manifest.xml` from repo
4. Test function: `=DSIQ.DSIQ("FRED-GDP")`
5. Check browser console for any CORS errors

---

## Step 4: Continuous Deployment Setup

### Automatic Deployments (Recommended)

Vercel automatically deploys on every push to `main`:

```bash
cd /Users/darshil/Desktop/DataSetIQ/Code/datasetiq-excel-addin

# Make changes
git add .
git commit -m "Update add-in"
git push origin main

# Vercel auto-deploys in ~30 seconds
# Check status: https://vercel.com/dashboard
```

### Branch Previews

Every PR gets a preview URL:
- Push to branch: `git push origin feature-branch`
- Vercel creates: `https://datasetiq-excel-addin-abc123.vercel.app`
- Test before merging to production

### Deploy Hooks (Optional)

Create webhook for manual deployments:

1. Vercel Dashboard → Settings → **Git**
2. Create **Deploy Hook**
3. Trigger via:
   ```bash
   curl -X POST https://api.vercel.com/v1/integrations/deploy/YOUR_HOOK_ID
   ```

---

## Step 5: Production Checklist

Before submitting to AppSource:

- [ ] `https://plugins.datasetiq.com` resolves correctly
- [ ] All files accessible (functions.js, functions.json, taskpane/)
- [ ] CORS headers present on all responses
- [ ] SSL certificate valid (green lock in browser)
- [ ] Icons load: `/assets/icon-32.png`, `/assets/icon-64.png`
- [ ] Manifest validation passes: `office-addin-manifest validate manifest.xml`
- [ ] Test in Excel Web, Windows, Mac
- [ ] No console errors in browser dev tools
- [ ] Functions calculate correctly
- [ ] Taskpane connects and displays profile

---

## Troubleshooting

### Issue: "Mixed Content" Error

**Symptom**: Excel blocks loading of add-in assets  
**Fix**: Ensure all URLs in `manifest.xml` use `https://`

### Issue: CORS Error in Console

**Symptom**: `Access-Control-Allow-Origin` missing  
**Fix**: 
1. Verify `vercel.json` is in repo root
2. Redeploy: `vercel --prod`
3. Clear browser cache

### Issue: 404 on `/functions.js`

**Symptom**: Vercel returns 404 for built files  
**Fix**:
1. Check `vercel.json` outputDirectory: `"dist"`
2. Verify `npm run build` creates `dist/functions.js`
3. Commit `vercel.json` and redeploy

### Issue: SSL Certificate Pending

**Symptom**: "Invalid certificate" warning  
**Fix**:
1. Verify Cloudflare DNS is **Grey Cloud** (DNS only)
2. Wait 10 minutes for propagation
3. Check Vercel Domains tab for certificate status
4. If stuck, remove domain and re-add

### Issue: Infinite Redirect

**Symptom**: Browser loops between redirects  
**Fix**: **Turn off Orange Cloud** in Cloudflare (must be Grey)

---

## Monitoring & Maintenance

### Vercel Analytics

Enable in Dashboard → Analytics:
- Page views
- Function invocations
- Geographic distribution
- Performance metrics

### Custom Error Pages (Optional)

Create `dist/404.html` and `dist/500.html` for better UX.

### CDN Purge

Vercel auto-purges CDN on deploy. Manual purge:
```bash
vercel --force
```

---

## Cost Estimate

**Vercel Free Tier Limits:**
- 100 GB bandwidth/month
- Unlimited deployments
- Automatic SSL
- Free custom domains

**Expected Usage:**
- Excel add-in: ~10KB per load
- 10,000 users × 20 loads/month = 2GB/month
- **Well within free tier** ✅

---

## Next Steps

After successful Vercel deployment:

1. **Update Manifest URLs**: Ensure `manifest.xml` points to `https://plugins.datasetiq.com`
2. **Submit to AppSource**: Use Partner Center
3. **Monitor Vercel Logs**: Check for errors/traffic spikes
4. **Set up Alerts**: Vercel can notify on deployment failures

---

**Deployment Time Estimate**: 15-30 minutes  
**Status**: Ready to deploy  
**Last Updated**: December 18, 2025
