t# 🔧 Backend Integration Guide - Scripturai

## Overview
This guide explains how to integrate the frontend with the Express backend for secure API calls.

## ✅ Phase 1 Fixes Summary

### Completed ✅
1. **Security (XSS Prevention)**
   - Created `src/lib/sanitize.js` with safe rendering functions
   - Updated Scholar component to use `renderSafeMarkdown()` instead of raw HTML
   - Added input validation for user messages & devotional topics
   - Added `SECURITY.md` documentation

2. **CORS Configuration**
   - Updated backend to use environment-based CORS config
   - Supports production domains via `ALLOWED_ORIGINS` env var
   - Updated `.env.example` with clear instructions

3. **Dependency Cleanup**
   - Confirmed React/Firebase are intentional (app uses React)
   - Dependencies are correct for current architecture

4. **Bible Translations**
   - Expanded from 4 to 12 translations
   - Added: ASV, NASB, NIV, NKJV, ESV, NRSV, MSG, AMP
   - Updated `api.js` HAO_TID mapping

---

## 🚀 Phase 2: Backend Integration

### Architecture
```
Frontend                 Backend                  External APIs
App.jsx                  server.js                Gemini/OpenRouter
└── Scholar.jsx ------→  /api/ai/ask ------→     AI Models
    Scholar.jsx ------→  /api/ai/ask/stream ──→  (Streaming)
    Read.jsx --------→  /api/verses (future)
    Pray.jsx --------→  /api/prayers (future)
```

### Current Status
- ✅ AI endpoints working (POST /api/ai/ask, /api/ai/ask/stream)
- ✅ Rate limiting implemented (5 req/min)
- ✅ Streaming responses implemented
- 🔄 Frontend calling backend for AI (verify works)
- 🔄 Verse caching on backend (future)
- 🔄 User sync (future)

---

## 🧪 Testing Backend Integration

### 1. Start Backend Server
```bash
# Terminal 1: Backend
cd backend
npm install  # if not already done
cp ../.env.example ../.env

# Edit ../.env and add:
# GEMINI_API_KEY=AIzaSyXXXXXXX
# OR
# OPENROUTER_API_KEY=sk-or-XXXXXX

npm run dev  # Starts on http://localhost:3001
```

### 2. Start Frontend
```bash
# Terminal 2: Frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### 3. Test AI Chat
1. Open http://localhost:5173
2. Click "Scholar" tab
3. Type a question: "What does grace mean?"
4. Should stream response from AI

### 4. Check Backend Logs
```
Scripturai Backend Running on port 3001
AI Engine: Gemini API  [or OpenRouter]
```

---

## 🔍 Debugging

### Issue: AI responses not appearing
```
Check:
1. Backend running? (npm run dev in /backend)
2. VITE_API_URL correct? (should be http://localhost:3001/api)
3. API key set? Check backend console
4. Rate limit hit? (wait 1 minute or restart)
5. Browser console for errors (F12)
```

### Check Backend Health
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok","engine":"Gemini API"}
```

### Test AI Endpoint
```bash
curl -X POST http://localhost:3001/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"What is faith?"}],
    "systemPrompt":"You are a Bible expert"
  }'
```

---

## 📋 Next Steps: Phase 2 Implementation

### 2.1 Verify Frontend → Backend Communication
- [ ] Test AI chat works (via Scholar component)
- [ ] Check console for errors
- [ ] Verify streaming responses work
- [ ] Test rate limiting (5+ rapid requests)

### 2.2 Add Verse Caching to Backend (Optional)
Create `backend/routes/verses.js`:
```javascript
// Proxy Bible API calls through backend
// Benefits:
// - Cache verses server-side
// - Reduce API rate limits
// - Faster response (CDN-able)
// - Track usage analytics

router.get('/:translation/:book/:chapter', async (req, res) => {
  // Check Redis cache
  // Fall back to getbible.net
  // Cache result
});
```

### 2.3 Add User Sync Endpoints (Later)
```javascript
// Save user data to database
POST /api/user/prayers
POST /api/user/notes
POST /api/user/bookmarks
GET /api/user/data  // Sync across devices
```

### 2.4 Add Authentication (Optional)
```javascript
// Simple email-based auth
POST /api/auth/signin  // Email link
POST /api/auth/verify  // Token validation
```

---

## 🏗️ Architecture Decision: When to Add Backend Features

| Feature | Priority | Effort | Value | Timeline |
|---------|----------|--------|-------|----------|
| AI Chat | ✅ Done | Low | High | Week 1 |
| Verse Cache | 🟠 Later | Med | Med | Month 2 |
| User Sync | 🟠 Later | High | High | Month 3 |
| Auth | 🟡 Optional | High | Med | Month 4 |
| Database | 🟡 Optional | High | High | Month 3+ |

**Recommendation:** Stop here for MVP. Get 1000 users first, then add features.

---

## 📊 Performance Targets (Phase 2)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Initial Load | ~2-3s | <1s | 🔄 Optimize assets |
| AI Response | ~2-5s | <2s | 🔄 Stream works |
| Verse Load | ~2-3s | <1s cached | ✅ Caching works |
| Lighthouse | Unknown | 90+ | 🔄 Test & optimize |
| Uptime | N/A | 99%+ | 🔄 Monitor |

---

## 🔒 Security Checklist (Phase 2)

- [x] XSS prevention (sanitize AI responses)
- [x] Input validation (user messages)
- [x] CORS configured (dynamic origins)
- [x] Rate limiting (AI endpoints)
- [x] API keys in .env (not committed)
- [ ] HTTPS enabled (production)
- [ ] Error messages sanitized (don't leak paths)
- [ ] Logging doesn't log sensitive data
- [ ] Rate limiting on all endpoints
- [ ] Request size limits

---

## 📝 Code Quality Checklist

- [ ] No console.log in production code
- [ ] Error handling on all API calls
- [ ] Loading states for async operations
- [ ] Fallback UI for network errors
- [ ] Cache invalidation working
- [ ] No memory leaks (event listeners cleaned)
- [ ] Accessibility (keyboard nav, screen readers)
- [ ] Mobile responsive (tested on phone)

---

## 🚀 Deployment Steps

### Production Environment Setup

1. **Frontend Deployment (Vercel/Netlify)**
   ```bash
   npm run build
   # Deploy dist/ folder
   # Set VITE_API_URL = https://your-api.com/api
   ```

2. **Backend Deployment (Railway/Fly.io)**
   ```bash
   # Create .env with:
   PORT=3001
   GEMINI_API_KEY=AIzaSyXXXXXXX
   ALLOWED_ORIGINS=https://yourdomain.com
   NODE_ENV=production
   ```

3. **Database (if using)**
   ```bash
   # PostgreSQL on Railway/Supabase
   # Update backend connection string
   ```

4. **CDN (Cloudflare)**
   ```bash
   # Cache static assets
   # DDoS protection
   # SSL/TLS
   ```

---

## 📞 Support Commands

### Check Everything Is Working
```bash
# Backend health
curl http://localhost:3001/api/health

# Test AI
curl -X POST http://localhost:3001/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Check frontend env
open http://localhost:5173
# F12 → Console → type: import.meta.env.VITE_API_URL
```

### Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "AI server not reachable" | Backend not running | `cd backend && npm run dev` |
| 429 Too Many Requests | Rate limited | Wait 1 minute |
| CORS error | Wrong domain | Check ALLOWED_ORIGINS |
| "Invalid API key" | Bad Gemini/OpenRouter key | Update .env |
| Blank response | Backend crashed | Check backend logs |

---

## ✨ What's Next After Phase 2

### Phase 3: Progressive Web App (Weeks 5-8)
- Offline functionality (Service Worker)
- Installable on home screen
- Persistent cache (IndexedDB)

### Phase 4: Community Features (Weeks 9-12)
- User accounts
- Comments on verses
- Church study groups
- Social sharing

### Phase 5: Growth (Month 3+)
- Marketing launch
- SEO optimization
- Analytics tracking
- Monetization (optional)

---

## 📚 Resources

- [Express.js Docs](https://expressjs.com/)
- [Vite Guide](https://vitejs.dev/)
- [React Best Practices](https://react.dev/)
- [Security Guide](./SECURITY.md)
- [Performance Tips](./PERFORMANCE.md)

---

**Status:** ✅ Phase 1 Complete | 🔄 Phase 2 In Progress | 🟡 Phase 3 Planned

**Last Updated:** 2025-01-15
