# 📖 Scriptura — The Living Word

A modern, AI-powered Bible reading app with prayer journal, memory verse quiz, and scholarly insights.

## Features

- 📖 **Read Scripture** - 66 books, 4 translations, audio support
- ✨ **AI Scholar** - Gemini-powered explanations & devotions
- 🙏 **Prayer Journal** - Track prayers with streaks
- 🎯 **Memory Quiz** - Flashcards for key verses
- 📝 **Study Notes** - Organize reflections by tags
- 🎨 **Dark Mode** - Eye-friendly interface
- 📱 **Responsive** - Works on mobile & desktop

## Project Structure

```
scriptura/
├── src/
│   ├── js/
│   │   ├── main.js              # Entry point
│   │   ├── data.js              # Constants & book data
│   │   ├── state.js             # Global state management
│   │   ├── api.js               # API calls
│   │   ├── ui.js                # Main render functions
│   │   ├── services/
│   │   │   ├── bibleService.js
│   │   │   ├── aiService.js
│   │   │   ├── prayerService.js
│   │   │   ├── quizService.js
│   │   │   ├── notesService.js
│   │   │   └── storageService.js
│   │   └── utils/
│   │       ├── formatting.js
│   │       ├── storage.js
│   │       └── helpers.js
│   └── css/
│       ├── main.css
│       ├── theme.css
│       ├── components.css
│       └── mobile.css
├── public/
│   └── index.html               # Main HTML file
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   └── package.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start dev server
npm run dev

# Build for production
npm run build
```

## API Keys

Get your Gemini API key from Google AI Studio

## Tech Stack

- **Frontend**: Vanilla JS (no framework weight)
- **Styling**: CSS3 with CSS Variables
- **State**: Simple object-based state
- **Build**: Vite (fast bundling)
- **AI**: Gemini API (Google)
- **Storage**: LocalStorage + IndexedDB

## Contributing

Contributions welcome! Please follow the code structure and maintain consistency.

## License

MIT
