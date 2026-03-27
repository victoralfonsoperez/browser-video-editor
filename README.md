# Browser Video Editor

**[Live Demo](https://browsercut.netlify.app/)**

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
- ✅ Google Drive URL loading (server-side proxy for COEP compliance, filename detection)
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
- ✅ FFmpeg WASM loading indicator (spinner during download, "Ready" confirmation)
- ✅ Loading states and progress indicators throughout
- ✅ Responsive design for mobile, tablet, and desktop
- ✅ Mobile touch-optimized interactions (larger touch targets, swipe gestures)
- ✅ ARIA attributes (`aria-expanded`, `aria-pressed`, `aria-label` on icon buttons)
- ✅ Focus-visible indicators on all interactive elements
- ✅ Keyboard-navigable timeline scrubbing (arrow keys ±1s, Shift ±5s)
- ✅ Keyboard-accessible trim marker adjustment (arrow keys ±1s, Shift ±0.1s)
- ✅ Keyboard alternative for clip/queue drag-to-reorder (▲/▼ buttons)
- ✅ Hover-only action buttons visible on keyboard focus (`focus-within`)
- ✅ Focus trap for modal dialogs (ClipPreview, GifWarning, Tour)

### Roadmap
- [ ] Horizontally scrollable timeline for very long videos
- [ ] Audio waveform visualization
- [ ] Cross-browser testing and public deployment
- [ ] Transitions between clips, text overlays, and filters/effects
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
| Node Version | 22 (see `.nvmrc`, managed with fnm) |
| Package Manager | pnpm |

> **Note:** Tailwind CSS v4 is integrated as a Vite plugin — no separate `tailwind.config` file needed.

## 🚀 Getting Started

### Prerequisites

**1. Install fnm** (Fast Node Manager)
```bash
# macOS / Linux
curl -fsSL https://fnm.vercel.app/install | bash

# macOS via Homebrew
brew install fnm

# Windows via winget
winget install Schniz.fnm
```

Then add the shell hook to your profile so fnm activates automatically when entering a directory with a `.nvmrc`:
```bash
# bash (~/.bashrc or ~/.bash_profile)
eval "$(fnm env --use-on-cd --shell bash)"

# zsh (~/.zshrc)
eval "$(fnm env --use-on-cd --shell zsh)"

# fish (~/.config/fish/config.fish)
fnm env --use-on-cd --shell fish | source
```

**2. Install pnpm**
```bash
# via corepack (bundled with Node.js)
corepack enable pnpm

# or via standalone installer
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Installation
```bash
# Clone the repository
git clone https://github.com/victoralfonsoperez/browsercut.git

cd browsercut

# Install and use the correct Node version
fnm install
fnm use

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview the production build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests with Vitest |

## 🧪 Testing

Tests use **Vitest** with **@testing-library/react**. Test files live alongside their components using the `.spec.tsx` convention.

```bash
pnpm test
```

## 🔒 Security

Dependency vulnerabilities are checked automatically via the [Security workflow](.github/workflows/security.yml) on every push, pull request, and weekly on Mondays (`pnpm audit --audit-level high`).

The workflow also runs:
- **Gitleaks** — scans for accidentally committed secrets
- **Semgrep** — static analysis with `p/react`, `p/typescript`, and `p/secrets` rulesets

Run the audit locally:
```bash
pnpm audit
```

### Production headers (`public/_headers`)

- [x] `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` — required for FFmpeg WASM multithreading
- [x] `Content-Security-Policy` — restricts scripts, styles, images, and connections to trusted origins
- [x] `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` — standard hardening headers

### Recommendations

- Consider installing the [Socket.dev GitHub App](https://socket.dev) for supply-chain monitoring of pnpm dependencies

## 📊 Project Status

**Version:** 0.1.0
**Started:** February 2026
**Deployed:** [Netlify](https://browsercut.netlify.app/)

---

Built with ❤️ by [Victor Pérez](https://github.com/victoralfonsoperez)
