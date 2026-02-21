/// <reference types="vite/client" />

// Allows TypeScript to resolve *.wasm?url imports
declare module '*.wasm?url' {
  const url: string;
  export default url;
}