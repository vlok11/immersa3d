// ============================================================
// Immersa 3D - Media Enhance Module
// Public API exports
// ============================================================

// Module
export { MediaEnhanceModule, mediaEnhanceModule } from './MediaEnhanceModule';
export type {
  MediaEnhanceConfig,
  MediaEnhanceState,
  EnhancementType,
  ProcessingJob,
  JobStatus,
} from './MediaEnhanceModule';

// Processors
export { ColorEnhancer, createColorEnhancer, enhanceColors } from './processors/colorEnhancer';
export type { ColorEnhancerOptions } from './processors/colorEnhancer';

export { DetailSharpener, createDetailSharpener, sharpenImage } from './processors/detailSharpener';
export type { SharpenerOptions } from './processors/detailSharpener';

// Components
export { EnhancePreview } from './components/EnhancePreview';
