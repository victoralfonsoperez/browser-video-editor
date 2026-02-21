// Isolated file for Vite ?url imports so vitest can mock this module cleanly
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

export { coreURL, wasmURL };