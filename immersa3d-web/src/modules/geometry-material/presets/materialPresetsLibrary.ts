// ============================================================
// Immersa 3D - Material Presets Library
// Additional material preset definitions
// ============================================================

import type { MaterialPreset, PBRMaterialParams } from '../GeometryMaterialModule';

/**
 * Default PBR parameters
 */
const DEFAULT_PBR: PBRMaterialParams = {
  color: '#ffffff',
  roughness: 0.5,
  metalness: 0.0,
  envMapIntensity: 1.0,
  normalScale: 1.0,
  displacementScale: 1.0,
  aoIntensity: 1.0,
  emissive: '#000000',
  emissiveIntensity: 0,
};

/**
 * Extended material presets
 */
export const EXTENDED_MATERIAL_PRESETS: MaterialPreset[] = [
  // Fabric
  {
    id: 'velvet',
    name: 'Velvet',
    category: 'Fabric',
    params: {
      ...DEFAULT_PBR,
      color: '#4a1a4a',
      roughness: 0.95,
      metalness: 0.0,
    },
  },
  {
    id: 'silk',
    name: 'Silk',
    category: 'Fabric',
    params: {
      ...DEFAULT_PBR,
      color: '#f0e6dc',
      roughness: 0.4,
      metalness: 0.0,
      envMapIntensity: 0.5,
    },
  },
  {
    id: 'leather',
    name: 'Leather',
    category: 'Fabric',
    params: {
      ...DEFAULT_PBR,
      color: '#6b4423',
      roughness: 0.7,
      metalness: 0.0,
    },
  },
  
  // Stone
  {
    id: 'marble-white',
    name: 'White Marble',
    category: 'Stone',
    params: {
      ...DEFAULT_PBR,
      color: '#f5f5f5',
      roughness: 0.2,
      metalness: 0.0,
      envMapIntensity: 0.5,
    },
  },
  {
    id: 'granite',
    name: 'Granite',
    category: 'Stone',
    params: {
      ...DEFAULT_PBR,
      color: '#696969',
      roughness: 0.6,
      metalness: 0.0,
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    category: 'Stone',
    params: {
      ...DEFAULT_PBR,
      color: '#0a0a0a',
      roughness: 0.1,
      metalness: 0.0,
      envMapIntensity: 1.5,
    },
  },
  
  // Wood
  {
    id: 'oak',
    name: 'Oak Wood',
    category: 'Wood',
    params: {
      ...DEFAULT_PBR,
      color: '#8b6914',
      roughness: 0.7,
      metalness: 0.0,
    },
  },
  {
    id: 'walnut',
    name: 'Walnut',
    category: 'Wood',
    params: {
      ...DEFAULT_PBR,
      color: '#5c4033',
      roughness: 0.65,
      metalness: 0.0,
    },
  },
  {
    id: 'bamboo',
    name: 'Bamboo',
    category: 'Wood',
    params: {
      ...DEFAULT_PBR,
      color: '#d4b896',
      roughness: 0.5,
      metalness: 0.0,
    },
  },
  
  // Sci-Fi
  {
    id: 'holographic',
    name: 'Holographic',
    category: 'Sci-Fi',
    params: {
      ...DEFAULT_PBR,
      color: '#00ffff',
      roughness: 0.0,
      metalness: 1.0,
      envMapIntensity: 2.0,
      emissive: '#00ffff',
      emissiveIntensity: 0.3,
    },
  },
  {
    id: 'neon-pink',
    name: 'Neon Pink',
    category: 'Sci-Fi',
    params: {
      ...DEFAULT_PBR,
      color: '#ff00ff',
      roughness: 0.2,
      metalness: 0.5,
      emissive: '#ff00ff',
      emissiveIntensity: 0.5,
    },
  },
  {
    id: 'chrome',
    name: 'Chrome',
    category: 'Sci-Fi',
    params: {
      ...DEFAULT_PBR,
      color: '#e8e8e8',
      roughness: 0.0,
      metalness: 1.0,
      envMapIntensity: 2.5,
    },
  },
  
  // Nature
  {
    id: 'jade',
    name: 'Jade',
    category: 'Gemstone',
    params: {
      ...DEFAULT_PBR,
      color: '#00a86b',
      roughness: 0.15,
      metalness: 0.0,
      envMapIntensity: 0.8,
    },
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    category: 'Gemstone',
    params: {
      ...DEFAULT_PBR,
      color: '#0f52ba',
      roughness: 0.05,
      metalness: 0.0,
      envMapIntensity: 1.5,
    },
  },
  {
    id: 'ruby',
    name: 'Ruby',
    category: 'Gemstone',
    params: {
      ...DEFAULT_PBR,
      color: '#e0115f',
      roughness: 0.05,
      metalness: 0.0,
      envMapIntensity: 1.5,
    },
  },
];

/**
 * Get all extended presets
 */
export function getExtendedPresets(): MaterialPreset[] {
  return [...EXTENDED_MATERIAL_PRESETS];
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): MaterialPreset[] {
  return EXTENDED_MATERIAL_PRESETS.filter(p => p.category === category);
}

/**
 * Get all unique categories
 */
export function getPresetCategories(): string[] {
  return [...new Set(EXTENDED_MATERIAL_PRESETS.map(p => p.category))];
}

/**
 * Find preset by ID
 */
export function findPresetById(id: string): MaterialPreset | undefined {
  return EXTENDED_MATERIAL_PRESETS.find(p => p.id === id);
}
