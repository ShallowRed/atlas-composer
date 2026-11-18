/// <reference types="vite/client" />

interface ImportMetaEnv {
  // The commit of the deployment, which keeps the cached basemaps of two deployments apart
  readonly VITE_BASEMAP_BUILD_ID?: string
}

// Baseline 2025, absent from lib.dom of TypeScript: https://developer.mozilla.org/docs/Web/API/SVGImageElement/decode
interface SVGImageElement {
  decode: () => Promise<void>
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
