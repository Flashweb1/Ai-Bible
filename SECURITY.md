# 🔐 Security Practices - Scripturai

## Overview
This document outlines security measures implemented in Scripturai to protect user data and prevent attacks.

---

## 🛡️ Security Measures

### 1. **XSS Protection (Cross-Site Scripting)**

**Issue:** AI responses displayed with `dangerouslySetInnerHTML` could allow code injection.

**Solution:** 
- Created `src/lib/sanitize.js` with `renderSafeMarkdown()` function
- Escapes all HTML special characters before applying formatting
- Only safe formatting allowed: `**bold**`, `> quotes`, `\n` line breaks
- All user input sanitized before API submission

```javascript
// Before (Vulnerable ❌)
<div dangerouslySetInnerHTML={{__html: renderMsg(m.content)}} />

// After (Safe ✅)
<div dangerouslySetInnerHTML={{__html: renderSafeMarkdown(m.content)}} />
```

### 2. **Input Validation**

**Frontend:**
- User messages limited to 3000 characters
- Suspicious patterns detected (script tags, event handlers)
- Devotional inputs validated before API submission

**Backend:**
- Rate limiting (5 requests/min per IP for AI queries)
- Message length validation

### 3. **CORS (Cross-Origin Resource Sharing)**

**Frontend Domain:** http://localhost:5173

**Backend CORS Policy:**
```javascript
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

**Production:** Set `ALLOWED_ORIGINS` to your domain
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4. **API Key Security**

**Never hardcode API keys in code!**

**Frontend:**
- Doesn't contain API keys
- Calls backend for AI responses
- Backend proxies requests to Gemini/OpenRouter

**Backend:**
- API keys stored in `.env` file (not committed to git)
- Keys read from environment at startup
- Never logged or exposed in responses

### 5. **Rate Limiting**

**AI Endpoints:** 5 requests per minute per IP
- Prevents abuse
- Protects API quota

```javascript
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
});
```

---

## 🔑 Environment Setup

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3001/api
VITE_FIREBASE_PROJECT_ID=your_id
```

### Backend (.env)
```bash
# Choose ONE:
GEMINI_API_KEY=AIzaSyXXXXXXX          # Free tier: https://aistudio.google.com
OPENROUTER_API_KEY=sk-or-XXXXXXX      # Free tier: https://openrouter.ai

PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
SITE_URL=http://localhost:5173
```

---

## ✅ Checklist Before Production

- [ ] Remove `.env` from git history: `git rm --cached .env`
- [ ] `.env` is in `.gitignore`
- [ ] All API keys moved to environment variables
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] HTTPS enabled (not HTTP)
- [ ] Security headers added (CSP, X-Frame-Options, etc.)
- [ ] Error messages don't expose sensitive info
- [ ] Database credentials not in code

---

## 🚨 Common Vulnerabilities Prevented

| Vulnerability | Prevention | Status |
|---------------|-----------|--------|
| XSS | HTML escaping, safe markdown | ✅ Fixed |
| CSRF | SameSite cookies (if auth added) | 🔄 When needed |
| SQL Injection | Parameterized queries | ✅ Not applicable (no DB yet) |
| Hardcoded Secrets | Environment variables | ✅ Fixed |
| CORS Abuse | Whitelist domains | ✅ Fixed |
| Rate Limiting | Implement limits | ✅ AI endpoints limited |
| DDoS | Rate limiting, CDN | 🔄 Deploy with CDN |

---

## 🔐 Future Improvements

- [ ] Content Security Policy (CSP) headers
- [ ] HTTPS/TLS certificate
- [ ] Database encryption at rest
- [ ] API authentication (OAuth2/JWT)
- [ ] Audit logging
- [ ] Penetration testing
- [ ] OWASP Top 10 security audit

---

## 📝 Security Review Log

| Date | Issue | Status | Notes |
|------|-------|--------|-------|
| 2025-01-15 | XSS in AI responses | Fixed | renderSafeMarkdown() implemented |
| 2025-01-15 | CORS too permissive | Fixed | Dynamic CORS config added |
| 2025-01-15 | API keys hardcoded | Fixed | Moved to .env |
| 2025-01-15 | Input validation missing | Fixed | Sanitization added |

---

## 🆘 Report a Security Issue

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. **Email:** [security contact when deployed]
3. Include: description, steps to reproduce, impact

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Last Updated:** 2025-01-15  
**Reviewed By:** Security Team  
**Status:** ✅ Ready for Beta
