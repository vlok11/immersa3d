/// <reference types="vite/client" />

declare module '*.glsl' {
  const value: string;
  export default value;
}

declare module '*.vert' {
  const value: string;
  export default value;
}

declare module '*.frag' {
  const value: string;
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_GEMINI_BASE_URL?: string;
  readonly VITE_GEMINI_API_VERSION?: string;
  readonly VITE_TF_DEPTH_MODEL_URL?: string;
  readonly VITE_TF_SEGMENTATION_MODEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@tensorflow/tfjs' {
  export function setBackend(backend: string): Promise<boolean>;
  export function ready(): Promise<void>;
  export const version: { tfjs: string };
}
