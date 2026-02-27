# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check (tsc -b) + production build
npm run lint      # ESLint (must pass with 0 errors)
npm run test      # Run all tests with Vitest
```

Run a single test file:
```bash
npx vitest run src/hooks/useTrimMarkers.spec.ts
```

## Architecture

All video processing happens client-side. The app is a single-page React 19 app (`src/App.tsx`) that orchestrates several custom hooks and components.

### Key hooks (`src/hooks/`)

| Hook | Purpose |
|---|---|
| `useFFmpeg` | Wraps `@ffmpeg/ffmpeg` — loads the WASM core on first use and exposes `exportClip`, `exportAllClips`. Tracks `status`, `progress`, and `exportingClipId`. |
| `useTrimMarkers` | Manages in/out points and the list of named clips. The single source of truth for `clips[]`. |
| `useExportQueue` | Sequential export queue backed by `useReducer`. Uses `dispatch` (not `setState`) inside effects to satisfy `react-hooks/set-state-in-effect`. |
| `useVideoThumbnails` | Canvas-based thumbnail strip generation for the timeline. |
| `useClipThumbnail` | Captures a single video frame as a data URL for clip list previews. |

### Component structure (`src/components/`)

- **`videoplayer/`** — `forwardRef<HTMLVideoElement>` component; the ref is passed down from `App` so other components can seek the video.
- **`timeline/`** — Interactive scrubber with draggable trim markers; calls `onSeek` to update the shared `videoRef`.
- **`cliplist/`** — Renders the clip list, per-clip export settings (`ExportOptionsPanel`), drag-to-reorder, and enqueue/instant-export controls.
- **`clippreview/`** — Modal that plays only the in→out segment of a clip.
- **`exportqueue/`** — Overlay showing queue progress.
- **`exportoptions/`** — Shared picker for format / quality / resolution.

### Types (`src/types/exportOptions.ts`)

Defines `ExportOptions`, `ExportFormat`, `ExportQuality`, `ExportResolution`, label maps, and the `isGif()` helper. FFmpeg command construction lives in `src/hooks/useFFmpeg.ts`.

### Linting rules to keep in mind

- ESLint 9 + `typescript-eslint` + `eslint-plugin-react-hooks` v7 (includes React Compiler rules).
- `react-hooks/set-state-in-effect` — do **not** call `setState` synchronously inside `useEffect` bodies; use `useReducer` + `dispatch` instead.
- `react-hooks/immutability` — declare variables before the effect that closes over them.
- No `any` types (`@typescript-eslint/no-explicit-any`, `no-unsafe-function-type`).

### Testing

Tests use Vitest + `@testing-library/react` with `jsdom`. Setup file: `src/test-setup.ts`. Test files use the `.spec.ts(x)` convention and live next to the source they test.
