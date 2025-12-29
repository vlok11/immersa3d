// ============================================================
// Immersa 3D - Geometry Material Module
// Public API exports
// ============================================================

// Module
export { GeometryMaterialModule, geometryMaterialModule } from './GeometryMaterialModule';
export type {
  GeometryMaterialConfig,
  GeometryMaterialState,
  PBRMaterialParams,
  MaterialPreset,
  SubdivisionAlgorithm,
} from './GeometryMaterialModule';

// Components
export { MeshSubdivisionController, estimateSubdividedVertexCount, getRecommendedMaxLevel } from './components/MeshSubdivisionController';
export { VertexDisplacer, useDisplacement } from './components/VertexDisplacer';
export { PBRMaterialEditor } from './components/PBRMaterialEditor';

// Utils
export { 
  NormalMapGenerator, 
  getNormalMapGenerator, 
  generateNormalMapFromDepth 
} from './utils/normalMapGenerator';
export type { NormalMapQuality, NormalMapOptions } from './utils/normalMapGenerator';

// Presets
export { 
  EXTENDED_MATERIAL_PRESETS, 
  getExtendedPresets,
  getPresetsByCategory,
  getPresetCategories,
  findPresetById,
} from './presets/materialPresetsLibrary';
