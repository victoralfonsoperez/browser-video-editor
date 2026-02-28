# Browser Video Editor

A browser-based video clip editor for creating and exporting clips from video files. Built with React and powered by client-side video processing — no server required.

## 🎯 Project Overview

This tool allows users to:
- Upload video files locally (drag & drop or file picker)
- Visualize videos with an interactive timeline and thumbnail previews
- Create and manage multiple clips from a single video
- Preview clips in real-time
- Export clips as downloadable video files

All processing happens directly in the browser.

## ✨ Features

### Implemented
- ✅ Local file upload with drag & drop
- ✅ Multi-format video playback (MP4, WebM, MOV)
- ✅ Interactive timeline with thumbnail strip generation
- ✅ Draggable trim markers (in/out points)
- ✅ Multiple clip management via clip list
- ✅ In-browser clip preview

### Planned
- Clip export as video files (FFmpeg.wasm)
- Audio waveform visualization
- Transitions between clips
- Text overlays and titles
- Video filters and effects

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 + typescript-eslint |
| Video / Canvas | HTML5 Video API + Canvas API |
| Node Version | 22 (see `.nvmrc`) |

> **Note:** Tailwind CSS v4 is integrated as a Vite plugin — no separate `tailwind.config` file needed.

## 📁 Folder Structure
```
browser-video-editor/
├── public/                     # Static assets
├── src/
│   ├── components/
│   │   ├── cliplist/
│   │   │   └── ClipList.tsx        # Clip management panel
│   │   ├── timeline/
│   │   │   ├── timeline.tsx        # Interactive video timeline
│   │   │   └── timeline.spec.tsx   # Timeline unit tests
│   │   ├── videoplayer/            # Video playback component
│   │   ├── videouploader/
│   │   │   └── videouploader.tsx   # File upload / drag & drop
│   │   ├── VideoTimeline.tsx       # Legacy timeline (being refactored)
│   │   └── VideoTimeline.css
│   ├── hooks/
│   │   ├── useTrimMarkers.ts       # Draggable in/out point logic
│   │   └── useVideoThumbnails.ts   # Canvas-based thumbnail generation
│   ├── assets/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css                   # Tailwind base import
│   └── test-setup.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 22+ (see `.nvmrc`)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/victoralfonsoperez/browser-video-editor.git

cd browser-video-editor

# Use the correct Node version (if using nvm)
nvm use

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |

## 🧪 Testing

Tests use **Vitest** with **@testing-library/react**. Test files live alongside their components using the `.spec.tsx` convention.
```bash
npm run test
```

## 🔒 Security

Dependency vulnerabilities are checked automatically via the [Security workflow](.github/workflows/security.yml) on every push, pull request, and weekly on Mondays (`npm audit --audit-level=high`).

Run the audit locally:
```bash
npm audit
```

### Pending security tasks

- [ ] Configure `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers for the production host (currently dev-only in `vite.config.ts`) — required for FFmpeg WASM multithreading in production
- [ ] Add a `Content-Security-Policy` header for production
- [ ] Evaluate adding [Semgrep](https://semgrep.dev) static analysis to the Security workflow (`p/react`, `p/typescript`, `p/secrets` rulesets)
- [ ] Consider installing the [Socket.dev GitHub App](https://socket.dev) for supply-chain monitoring

## 📊 Project Status

**Current Phase:** 3 of 6 — Clip Creation Interface (~50% complete)  
**Overall Progress:** ~40%  
**Started:** February 2026  
**Target Completion:** May–June 2026

---

Built with ❤️ by [Victor Pérez](https://github.com/victoralfonsoperez)