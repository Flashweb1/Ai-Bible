# 📖 Scriptura — Bible AI

A modern React-powered Bible app with reading, notes, prayer tracking, bookmarks, audio playback, and AI-powered study tools.

## Features

- 📖 **Bible Reader** with book/chapter navigation and verse highlighting
- ✨ **Scholar AI** for Bible commentary and context
- 🙏 **Prayer Journal** with streak tracking
- 🎯 **Memory Quiz** for verse review
- 📝 **Notes & Reflections** for study and journaling
- 🔖 **Bookmarks** for saved passages
- 🎧 **Audio Bible** using browser speech synthesis
- 🌙 **Dark mode** and display preferences
- 🌐 **Backend AI proxy** with secure API key handling

## Project structure

```
Bible AI/
├── backend/
│   ├── package.json
│   └── server.js
├── public/
│   ├── index.html
│   ├── sw.js
│   └── bibles/                  # Local translated Bible JSON
├── src/
│   ├── App.jsx
│   ├── AppContext.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── About.jsx
│   │   ├── AuthModal.jsx
│   │   ├── Bookmarks.jsx
│   │   ├── Drawer.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── Home.jsx
│   │   ├── Notes.jsx
│   │   ├── Pray.jsx
│   │   ├── Quiz.jsx
│   │   ├── Read.jsx
│   │   ├── Scholar.jsx
│   │   ├── Search.jsx
│   │   ├── Settings.jsx
│   │   └── VerseSheetModal.jsx
│   ├── css/
│   │   ├── components.css
│   │   ├── home.css
│   │   ├── main.css
│   │   ├── notes.css
│   │   ├── prayer.css
│   │   ├── quiz.css
│   │   ├── read.css
│   │   └── scholar.css
│   ├── js/
│   │   ├── api.js
│   │   ├── convert-bibles.js
│   │   ├── data.js
│   │   ├── navService.js
│   │   ├── preferences.js
│   │   └── storage.js
│   └── lib/
│       ├── firebase.js
│       └── sanitize.js
├── package.json
├── package-lock.json
├── vite.config.js
├── README.md
├── STRUCTURE.md
└── SECURITY.md
```

## Installation

```bash
npm install
npm run dev
```

### Backend (optional)

```bash
cd backend
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Backend configuration

The backend proxy is located at `backend/server.js`. It uses one of:

- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`

Set the key in a `.env` file inside the `backend/` folder.

If you use the backend, set `VITE_API_URL` in your frontend environment or `.env` file to point at the backend API base URL.

## Notes

- The app loads local Bible JSON files from `public/bibles/` first.
- It also supports remote Bible APIs as a fallback when a chapter is not available locally.
- Preferences are stored locally using `localStorage`.
- Bookmarks, notes, prayers, and highlights are synced locally and can back up to Firebase when signed in.

## Tech stack

- **Frontend**: React + Vite
- **Styling**: CSS and CSS variables
- **Build**: Vite
- **AI proxy**: Express backend using `openai`
- **Storage**: Browser `localStorage` with optional Firebase sync

## Contributing

1. Fork the repo
2. Follow the existing React component structure
3. Keep styling and state management consistent
4. Run `npm run build` before submitting changes

## License

MIT
