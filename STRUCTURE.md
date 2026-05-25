# 🏗️ Project Structure Guide

## Directory Overview

```
Bible AI/
├── public/
│   └── index.html                 # Main HTML entry point
├── src/
│   ├── css/
│   │   ├── main.css              # Global styles & theme
│   │   ├── components.css        # Reusable component styles
│   │   ├── home.css              # Home page styles
│   │   ├── read.css              # Bible reader styles
│   │   ├── scholar.css           # AI chat styles
│   │   ├── prayer.css            # Prayer journal styles
│   │   ├── quiz.css              # Quiz & flashcards styles
│   │   └── notes.css             # Notes page styles
│   └── js/
│       ├── main.js               # Entry point & UI rendering
│       ├── data.js               # Constants & configuration
│       ├── state.js              # Application state
│       ├── api.js                # API calls (ready for backend)
│       ├── services/
│       │   ├── bibleService.js   # Bible reading functionality
│       │   ├── versesService.js  # Verse sheet & highlighting
│       │   ├── audioService.js   # Text-to-speech
│       │   ├── aiService.js      # AI Scholar chat
│       │   ├── prayerService.js  # Prayer journal
│       │   ├── quizService.js    # Memory verse quiz
│       │   └── notesService.js   # Notes & journaling
│       └── utils/
│           ├── storage.js        # LocalStorage management
│           └── formatting.js     # Text & date formatting
├── backend/
│   ├── server.js                 # Express API (template)
│   └── package.json
├── package.json                  # Frontend dependencies
├── vite.config.js               # Build configuration
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── README.md                    # Project overview
└── STRUCTURE.md                 # This file

```

## Key Files Explained

### Frontend

- **main.js**: Core entry point. Initializes app, handles all rendering logic, manages navigation.
- **state.js**: Global application state object. Single source of truth for app data.
- **data.js**: All constants (books, verses templates, tags, etc.)
- **api.js**: Centralized API calls. Ready for backend migration - keeps frontend agnostic of API implementation.

### Services

Each service module handles a specific feature:

```
bibleService    → Load books, chapters, change translations, navigate
versesService   → Open verse detail, highlight, bookmark, share
audioService    → Text-to-speech playback control
aiService       → Send messages to Claude, manage chat history
prayerService   → Add/delete prayers, track streak
quizService     → Flashcard quiz logic
notesService    → CRUD operations for notes
```

### Utilities

```
storage.js      → LocalStorage abstraction (ready for migration to backend)
formatting.js   → HTML escaping, date formatting, streak calculation
```

## Workflow & Dataflow

```
User Action
    ↓
Event Handler (onclick, onchange)
    ↓
App.services.method()  [e.g., App.bible.selectChapter()]
    ↓
setState() updates global state
    ↓
render() triggers UI re-render with new state
    ↓
UI components mount with event handlers
```

## How to Add New Features

### 1. Add a new page/feature

**Step 1**: Create service file
```javascript
// src/js/services/newFeatureService.js
export const newFeatureService = {
  method1() { /* ... */ },
  method2() { /* ... */ },
};
```

**Step 2**: Import in main.js
```javascript
import { newFeatureService } from "./services/newFeatureService.js";
// Add to App object
newFeature: newFeatureService,
```

**Step 3**: Create render function
```javascript
function renderNewFeature() {
  return `<div>...</div>`;
}

// Add to renderers object in render()
newfeature: renderNewFeature,
```

**Step 4**: Add navigation button
```html
<button class="nb" onclick="App.nav.go('newfeature')">
  Icon Label
</button>
```

### 2. Add new state properties

Edit `src/js/state.js`:
```javascript
export const state = {
  // ... existing state
  newFeature: {
    data: [],
    loading: false,
  },
};
```

### 3. Add CSS for new component

Create `src/css/newfeature.css` and link in `public/index.html`:
```html
<link rel="stylesheet" href="../src/css/newfeature.css">
```

## Storage Architecture

Currently uses **localStorage** (browser storage). When transitioning to backend:

1. **Before**: `storage.js` writes to `localStorage`
2. **After**: `storage.js` calls backend API via `api.js`
3. **Benefit**: No frontend code changes needed

```javascript
// storage.js abstracts the implementation
export async function setStorageValue(key, value) {
  // Currently: localStorage.setItem(key, value)
  // Soon: await fetch(`/api/user/save`, { data: value })
}
```

## Environment Variables

Edit `.env` (create from `.env.example`):

```bash
VITE_API_URL=http://localhost:3001/api
VITE_CLAUDE_API_KEY=sk-ant-...
```

These are available in code via:
```javascript
import.meta.env.VITE_API_URL
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Build for production
npm run build

# Start backend API (separate terminal)
cd backend
npm run dev
```

## Next Steps: Backend Migration

1. **Implement `backend/server.js`**:
   - Bible API proxy with caching
   - Claude API proxy (secure key handling)
   - User authentication (JWT)
   - Database (PostgreSQL)

2. **Update `api.js`** to call backend endpoints

3. **Migrate storage** from localStorage to backend:
   - Prayers, notes, bookmarks sync with server
   - Cross-device reading progress

4. **Add features**:
   - User accounts
   - Reading plans
   - Social sharing
   - Advanced search

## Performance & SEO

- **Currently**: Single-page app in browser
- **Soon**: Move to full-stack with server-side rendering option
- **Caching**: Backend will cache Bible verses (expensive API calls)
- **Storage**: Use Redis for frequently accessed data

## Architecture Benefits

✅ **Modular**: Each feature in its own service file  
✅ **Scalable**: Easy to add new pages/features  
✅ **Maintainable**: Clear separation of concerns  
✅ **Testable**: Pure functions, no dependencies on DOM  
✅ **Backend-ready**: API layer abstracted, easy migration  

## Common Mistakes to Avoid

❌ Don't modify DOM directly - use render()  
❌ Don't bypass state - always use setState()  
❌ Don't hardcode API URLs - use .env  
❌ Don't store sensitive data in state - use backend  
❌ Don't forget to import services in main.js  

---

**Questions?** Review the service files - they're well-commented with clear examples.
