# Browser Video Editor

A browser-based video clip editor for creating and exporting clips from video files. Built with React and powered by client-side video processing — no server required.

## 🎯 Project Overview

This tool allows users to:
- Upload video files locally (file picker)
- Visualize videos with an interactive timeline and thumbnail previews
- Create and manage multiple named clips from a single video
- Preview clips in real-time before exporting
- Export clips as downloadable video files in multiple formats and quality settings

All processing happens directly in the browser. No data is ever sent to a server.

## ✨ Features

### Implemented
- ✅ Local file upload with format and size validation
- ✅ Google Drive URL loading (server-side proxy for COEP compliance)
- ✅ Multi-format video playback (MP4, WebM, MOV, and more)
- ✅ Interactive timeline with auto-generated thumbnail strip
- ✅ Draggable in/out point markers with keyboard shortcuts (I / O)
- ✅ Multiple clip management — add, rename, reorder, remove
- ✅ Highlights / markers — add, rename, import/export JSON, show on timeline
- ✅ In-browser clip preview modal with loop support
- ✅ FFmpeg.wasm export: MP4, WebM, MOV, GIF
- ✅ Per-clip and global export settings (format, quality, resolution)
- ✅ Export settings persistence across page refresh (localStorage)
- ✅ Export queue with start/pause/retry and real-time progress
- ✅ Web Worker for thumbnail generation (performance)
- ✅ Keyboard shortcuts (Space/K, J/L, ←/→, ,/., I/O, M, Home/End)
- ✅ Guided onboarding tour for first-time users
- ✅ Toast notifications for errors, warnings, and feedback
- ✅ Loading states and progress indicators throughout
- ✅ Responsive design for mobile, tablet, and desktop

### Roadmap
- [ ] Mobile touch-optimized interactions (larger touch targets, swipe gestures)
- [ ] Horizontally scrollable timeline for very long videos
- [ ] Audio waveform visualization
- [ ] Cross-browser testing and public deployment (Phase 6)
- [ ] Transitions, text overlays, and video filters (future)
- [ ] Keyboard-navigable timeline scrubbing (arrow keys)
- [ ] Keyboard-accessible trim marker adjustment
- [ ] Keyboard alternative for clip/queue drag-to-reorder
- [ ] Focus-visible indicators on all interactive elements
- [ ] ARIA attributes (`aria-expanded`, `aria-pressed`, `aria-label` on icon buttons)
- [ ] Make hover-only action buttons accessible to keyboard users
- [ ] Focus trap for modal dialogs

### Future Enhancements (Post-MVP)
- [ ] Audio waveform visualization
- [ ] Transitions between clips
- [ ] Text overlays
- [ ] Filters and effects
- [ ] Multi-track editing
- [ ] Cloud storage integration
- [ ] Collaborative editing

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Video Processing | `@ffmpeg/ffmpeg` (WebAssembly) |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 + typescript-eslint |
| Video / Canvas | HTML5 Video API + Canvas API |
| Node Version | 22 (see `.nvmrc`) |

> **Note:** Tailwind CSS v4 is integrated as a Vite plugin — no separate `tailwind.config` file needed.

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

**Current Phase:** 5 of 6 — Polish & UX (~85% complete)
**Overall Progress:** ~80%
**Started:** February 2026
**Target Completion:** May–June 2026 (on track, likely to finish early)

---

Built with ❤️ by [Victor Pérez](https://github.com/victoralfonsoperez)
