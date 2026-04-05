# Roadmap

BrowserCut is a client-side video editor. This document tracks planned features and improvements in rough priority order.

---

## Phase 1 — Timeline depth

Features that make the timeline richer and more precise.

### ✅ Audio waveform visualizer

Decode the audio track using the Web Audio API (`AudioContext.decodeAudioData`) and render the waveform directly on the timeline canvas alongside the thumbnail strip. This gives users a visual reference for cuts — especially useful for interview footage, podcasts, or any audio-driven content.

- Render waveform below (or overlaid on) the thumbnail strip
- Respect the current zoom level and scroll position
- Subtle color that does not compete with trim markers

### ✅ Timeline zoom and scroll

For long videos the current fixed-width timeline loses precision. Add horizontal zoom (pinch-to-zoom / scroll wheel + modifier) and a scrollable viewport so users can scrub frame-accurately.

- Zoom range: 1× (full video) → ~64× (≈1 s visible)
- Keyboard: `+` / `-` or `Ctrl + scroll`
- Minimap / scroll thumb showing the visible window
- Thumbnail pool (4× density) generated once — no re-capture on zoom

### Precise timecode input

Let users type an exact time (`mm:ss.fff`) to jump to or set in/out points — useful when timestamps come from an external source (e.g. a transcript).

---

## Phase 2 — Clip editing

Features applied per-clip before export.

### Speed / rate control

Change the playback speed of a clip during export via FFmpeg's `setpts` + `atempo` filters. Common presets plus a free input field.

- Slow motion: 0.25×, 0.5×, 0.75×
- Fast forward: 1.25×, 1.5×, 2×, 4×
- Audio pitch correction at non-1× rates

### Audio controls per clip

Fine-grained audio options beyond the current mute-via-GIF path.

- Volume adjustment (0 – 200 %)
- Explicit mute toggle (keep video, strip audio track)
- Fade in / fade out (duration in seconds)

### Video filters

Simple color-correction and visual effects applied via FFmpeg `vf` filters.

- Brightness / contrast / saturation sliders
- Grayscale, sepia presets
- Blur (useful for faces or sensitive content)

### Text overlays

Burn captions or titles into the exported video using FFmpeg's `drawtext` filter.

- Position picker (top, center, bottom — left / center / right)
- Font size, color, background opacity
- Time range (show overlay only between T1 and T2 within the clip)

---

## Phase 3 — Project workflow

Features that improve the authoring session itself.

### Undo / Redo

A command history (limited to the last ~50 actions) covering clip creation, removal, rename, in/out edits, and reorder operations. Keyboard: `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z`.

### Project save and load

Serialize the full editing session — source file reference, clips, highlights, per-clip export settings, and global preferences — to a `.browsercut.json` file the user can save locally and reopen later.

- Save: `Cmd/Ctrl + S`
- Load: file picker or drag-and-drop onto the app
- Warn before unloading if there are unsaved changes

### Frame export

Export a single video frame as a PNG/JPG image directly from the player (no FFmpeg queue required).

- "Snapshot" button in the player controls
- Keyboard shortcut: `S`
- File named `{source}_{timecode}.png`

---

## Phase 4 — Multi-clip output

Features that treat the clip list as a sequence, not just individual files.

### Clip merge / concatenate export

Export the entire clip list as a single video file in order, with optional transitions between clips. Uses FFmpeg's `concat` demuxer or filter graph.

- "Export All as One File" button alongside "Export All"
- Gap / silence handling between clips
- Transition types: cut (default), fade-to-black, crossfade

### Chapter markers in export

Embed chapter metadata into the MP4/WebM output so media players (e.g. VLC, browser `<video>`) can jump to named sections.

- Source: existing Highlights or the clip list
- Written as FFmpeg metadata (`-metadata_global`)

---

## Phase 5 — Quality of life

Smaller improvements with high usability impact.

### FFmpeg preload on file open

Currently FFmpeg WASM loads on first export (2–3 s delay). Preload it in the background as soon as a video file is successfully opened so the first export starts instantly.

### Keyboard shortcut reference overlay

A `?` key (or help button) that shows all keyboard shortcuts in a modal, grouped by category. Replaces the current static text in the clip list.

### Drag-and-drop video onto player

Allow users to drag a video file directly onto the player area to load it, in addition to the file picker.

### Clip notes / description field

An optional text field per clip (stored in project JSON) for production notes — shot description, review status, etc.

---

## Considered but not planned

| Idea | Why deferred |
|---|---|
| Multi-track timeline | Significant architectural complexity; out of scope for a clip extractor |
| Real-time preview filters | Browser Canvas API too slow for live FFmpeg-quality filters |
| Cloud storage write-back | Requires OAuth flows and server-side state; breaks the privacy model |
| Collaborative editing | Requires a sync server; out of scope |
