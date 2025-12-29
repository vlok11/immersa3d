// ============================================================
// Immersa 3D - Hologram Module
// Public API exports
// ============================================================

// Module
export { HologramModule, hologramModule } from './HologramModule';
export type {
  HologramConfig,
  HologramState,
  HologramDisplayType,
  LayoutMode,
} from './HologramModule';

// Components
export { PyramidViewGenerator } from './components/PyramidViewGenerator';
export { PeppersGhostSimulator, PeppersGhostDisplay } from './components/PeppersGhostSimulator';

// Utils
export { 
  HologramVideoEncoder, 
  createHologramEncoder,
  isWebCodecsAvailable,
} from './utils/hologramVideoEncoder';
export type { EncoderConfig, EncoderStatus } from './utils/hologramVideoEncoder';
