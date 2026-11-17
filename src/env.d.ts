/// <reference types="vite/client" />

// Baseline 2025, absent from lib.dom of TypeScript: https://developer.mozilla.org/docs/Web/API/SVGImageElement/decode
interface SVGImageElement {
  decode: () => Promise<void>
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
