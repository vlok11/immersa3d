// ============================================================
// Immersa 3D - Naked 3D Module
// Public API exports
// ============================================================

// Module
export { Naked3DModule, naked3DModule } from './Naked3DModule';
export type {
  Naked3DConfig,
  Naked3DState,
  ParallaxOffset,
  ParallaxInputSource,
  DeviceType,
} from './Naked3DModule';

// Trackers
export { GyroscopeTracker, createGyroscopeTracker } from './trackers/gyroscopeTracker';
export type { GyroscopeTrackerOptions } from './trackers/gyroscopeTracker';

export { MouseTracker, createMouseTracker } from './trackers/mouseTracker';
export type { MouseTrackerOptions } from './trackers/mouseTracker';

// Components
export { ParallaxProcessor } from './components/ParallaxProcessor';
export { DepthLayerSeparator } from './components/DepthLayerSeparator';

// Utils
export { 
  DeviceAdapter, 
  getDeviceAdapter, 
  detectDevice, 
  getDeviceRecommendations 
} from './utils/deviceAdapter';
export type { DeviceCapabilities, DeviceRecommendations } from './utils/deviceAdapter';
