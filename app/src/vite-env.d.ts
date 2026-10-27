/// <reference types="vite/client" />

/** Bridge from electron/preload.cjs. Undefined when running in a plain browser. */
interface XeaHost {
  quit: () => void;
  toggleFullscreen: () => void;
}

interface Window {
  host?: XeaHost;
}
