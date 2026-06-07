# Vercel Deployment Guide for Scripturai

This guide explains how to deploy Scripturai to Vercel with both frontend and backend.

## Prerequisites

- [Vercel account](https://vercel.com)
- GitHub repository with your code pushed
- API keys (Gemini or OpenRouter)

## Step 1: Prepare Your Repository

1. Ensure all code is committed and pushed to GitHub:
   ```bash
   git add -A
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. The `vercel.json` file is already configured in the repo with:
   - Security headers (CSP, X-Frame-Options, etc.)
   - Correct build and output directories
   - CORS rewrites for API calls

## Step 2: Deploy Frontend + Backend to Vercel

### Option A: Deploy as Monorepo (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure the project:
   - **Project name**: `scripturai`
   - **Root directory**: `./` (or leave blank)
   - **Framework**: Auto-detect or select "Vite"
   - **Build command**: `npm run build`
   - **Output directory**: `dist`

4. **Add Environment Variables** (in Vercel project settings):
   ```
   VITE_API_URL = https://your-deployment.vercel.app/api
   GEMINI_API_KEY = (your Gemini API key)
   OPENROUTER_API_KEY = (your OpenRouter API key)
   ALLOWED_ORIGINS = https://your-deployment.vercel.app
   SITE_URL = https://your-deployment.vercel.app
   ```

5. Deploy and Vercel will automatically:
   - Install dependencies (`npm install`)
   - Build the frontend (`npm run build`)
   - Serve the dist folder

### Option B: Deploy Backend Separately (Advanced)

If you want the backend on a separate Vercel instance:

1. Create a new Vercel project for `backend/`
2. In that project settings:
   - Root directory: `backend`
   - Build command: (leave empty)
   - Start command: `npm start`
3. Set the same environment variables as above
4. Update frontend `.env` with backend URL: `VITE_API_URL = https://your-backend.vercel.app/api`

## Step 3: Configure Environment Variables

In Vercel project settings → Environment Variables, add these exact values:

### Frontend Variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-deployment.vercel.app/api` (replace with your Vercel domain) |
| `VITE_FIREBASE_API_KEY` | `AIzaSyBI1ewkDF1DlHr6aRr0BL9GL1SCMcELQhE` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `ai-bible-2faa5.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `ai-bible-2faa5` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `ai-bible-2faa5.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `683396759678` |
| `VITE_FIREBASE_APP_ID` | `1:683396759678:web:1b573dbbd183d17282982f` |

### Backend Variables

| Variable | Value |
|----------|-------|
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `SITE_URL` | `https://your-deployment.vercel.app` (replace with your Vercel domain) |
| `GEMINI_API_KEY` | Copy from your local `backend/.env` file |
| `OPENROUTER_API_KEY` | Copy from your local `backend/.env` file |

> **⚠️ Tip:** Copy these values directly from your local `backend/.env` and `.env` files into the Vercel dashboard. **Never commit API keys to a public repository.**

## Step 4: Test the Deployment

After deployment:

1. Visit your Vercel URL
2. Test Bible reading (loads local Bible data first, then remote APIs)
3. Test AI Scholar (requires API keys configured)
4. Open DevTools Console — check for CORS errors or CSP violations
5. Check that Service Worker installs (PWA ready)

## Step 5: Custom Domain (Optional)

In Vercel project settings → Domains:
- Add your custom domain (e.g., scripturai.com)
- Update DNS records as instructed
- Update `ALLOWED_ORIGINS` and `SITE_URL` to use the new domain

## Troubleshooting

### "Could not load chapter" Error
- Check that **Vercel is serving local Bible JSON** from `public/bibles/`
- Ensure build output includes the `public/` folder
- Verify in Vercel Deployments → Logs

### AI Features Not Working
- Verify API keys are set in Vercel environment
- Check **backend logs** in Vercel (not the frontend logs)
- Ensure `VITE_API_URL` points to correct backend

### CORS Errors in Browser
- Check `vercel.json` headers are deployed
- Verify `ALLOWED_ORIGINS` includes your domain
- Clear browser cache and redeploy

### Service Worker Issues
- SW requires **HTTPS** (automatic with Vercel)
- Check browser DevTools → Application → Service Workers

## Monitoring & Logs

In Vercel dashboard:
- **Functions**: View backend logs (API requests)
- **Deployments**: See build logs and errors
- **Analytics**: Track page views and errors (if enabled)

## Optional: Add Sentry Error Tracking

1. Create a [Sentry account](https://sentry.io)
2. Install in frontend:
   ```bash
   npm install @sentry/react
   ```
3. Initialize in `src/main.jsx`:
   ```javascript
   import * as Sentry from "@sentry/react";
   Sentry.init({
     dsn: "YOUR_SENTRY_DSN",
     environment: import.meta.env.MODE,
   });
   ```
4. Add `VITE_SENTRY_DSN` to Vercel env

## Optional: Add Plausible Analytics

1. Create a [Plausible account](https://plausible.io)
2. Add script to `index.html` (in `public/` or `src/`):
   ```html
   <script async defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
   ```

## Rollback to Previous Deployment

In Vercel dashboard → Deployments:
- Find the previous working version
- Click the three dots → "Promote to Production"

---

**You're ready!** Your Scripturai is now live on Vercel with security headers, CORS protection, and optional backend integration. 🚀
