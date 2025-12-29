// ============================================================
// Immersa 3D - Geometry Material Module
// Mesh geometry and PBR material editing
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';

/**
 * Subdivision algorithm type
 */
export type SubdivisionAlgorithm = 'catmullClark' | 'loop' | 'simple';

/**
 * PBR material parameters
 */
export interface PBRMaterialParams {
  color: string;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  normalScale: number;
  displacementScale: number;
  aoIntensity: number;
  emissive: string;
  emissiveIntensity: number;
}

/**
 * Material preset
 */
export interface MaterialPreset {
  id: string;
  name: string;
  category: string;
  params: PBRMaterialParams;
  thumbnail?: string;
}

/**
 * Geometry Material Module Configuration
 */
export interface GeometryMaterialConfig {
  /** Default subdivision level */
  defaultSubdivision: number;
  /** Maximum subdivision level */
  maxSubdivision: number;
  /** Default displacement scale */
  defaultDisplacementScale: number;
  /** Enable auto normal map generation */
  autoGenerateNormals: boolean;
  /** Normal map quality (low, medium, high) */
  normalMapQuality: 'low' | 'medium' | 'high';
  /** Enable wireframe overlay in edit mode */
  showWireframe: boolean;
}

/**
 * Geometry Material Module State
 */
export interface GeometryMaterialState {
  /** Current subdivision level */
  subdivisionLevel: number;
  /** Is mesh being processed */
  isProcessing: boolean;
  /** Current material preset ID */
  currentPresetId: string | null;
  /** Normal map generation status */
  normalMapGenerated: boolean;
  /** Current PBR parameters */
  pbrParams: PBRMaterialParams;
}

/**
 * Default PBR parameters
 */
const DEFAULT_PBR_PARAMS: PBRMaterialParams = {
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
 * Default configuration
 */
const DEFAULT_CONFIG: GeometryMaterialConfig = {
  defaultSubdivision: 1,
  maxSubdivision: 4,
  defaultDisplacementScale: 1.0,
  autoGenerateNormals: true,
  normalMapQuality: 'medium',
  showWireframe: false,
};

/**
 * GeometryMaterialModule - Mesh and material editing
 * 
 * Responsibilities:
 * - Mesh subdivision control
 * - Vertex displacement
 * - PBR material parameter editing
 * - Normal map generation from depth
 * - Material presets library
 */
export class GeometryMaterialModule implements ImmersaModule<GeometryMaterialConfig, GeometryMaterialState> {
  readonly id = 'geometry-material';
  readonly name = 'Geometry Material';
  readonly version = '1.0.0';
  readonly dependencies: string[] = ['projection-3d'];
  
  state: ModuleState = 'unregistered';
  
  private config: GeometryMaterialConfig = { ...DEFAULT_CONFIG };
  
  private internalState: GeometryMaterialState = {
    subdivisionLevel: 1,
    isProcessing: false,
    currentPresetId: null,
    normalMapGenerated: false,
    pbrParams: { ...DEFAULT_PBR_PARAMS },
  };
  
  /** Material presets */
  private presets: Map<string, MaterialPreset> = new Map();
  
  /**
   * Setup module resources
   */
  async setup(config?: GeometryMaterialConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.internalState.subdivisionLevel = this.config.defaultSubdivision;
    
    // Register built-in presets
    this.registerBuiltInPresets();
    
    // Listen for events
    eventBus.on('geometry:subdivisionChange', this.handleSubdivisionChange);
    eventBus.on('material:paramsUpdate', this.handleParamsUpdate);
    eventBus.on('material:presetApply', this.handlePresetApply);
    
    console.log(`[${this.id}] Setup complete`);
  }
  
  /**
   * Activate the module
   */
  activate(): void {
    console.log(`[${this.id}] Activated`);
  }
  
  /**
   * Deactivate the module
   */
  deactivate(): void {
    console.log(`[${this.id}] Deactivated`);
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    console.log(`[${this.id}] Disposing...`);
    
    // Remove event listeners
    eventBus.off('geometry:subdivisionChange', this.handleSubdivisionChange);
    eventBus.off('material:paramsUpdate', this.handleParamsUpdate);
    eventBus.off('material:presetApply', this.handlePresetApply);
    
    // Clear presets
    this.presets.clear();
    
    // Reset state
    this.internalState = {
      subdivisionLevel: 1,
      isProcessing: false,
      currentPresetId: null,
      normalMapGenerated: false,
      pbrParams: { ...DEFAULT_PBR_PARAMS },
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): GeometryMaterialState {
    return { 
      ...this.internalState,
      pbrParams: { ...this.internalState.pbrParams },
    };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): GeometryMaterialConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(partial: Partial<GeometryMaterialConfig>): void {
    this.config = { ...this.config, ...partial };
    eventBus.emit('geometry:configChanged', { config: this.config });
  }
  
  // ============================================================
  // Subdivision Control
  // ============================================================
  
  /**
   * Set subdivision level
   */
  setSubdivisionLevel(level: number): void {
    const clampedLevel = Math.max(0, Math.min(level, this.config.maxSubdivision));
    
    if (clampedLevel === this.internalState.subdivisionLevel) return;
    
    this.internalState.subdivisionLevel = clampedLevel;
    
    eventBus.emit('geometry:subdivisionChanged', { level: clampedLevel });
  }
  
  /**
   * Get subdivision level
   */
  getSubdivisionLevel(): number {
    return this.internalState.subdivisionLevel;
  }
  
  // ============================================================
  // PBR Material Control
  // ============================================================
  
  /**
   * Update PBR parameters
   */
  updatePBRParams(params: Partial<PBRMaterialParams>): void {
    this.internalState.pbrParams = {
      ...this.internalState.pbrParams,
      ...params,
    };
    
    eventBus.emit('material:paramsChanged', { 
      params: this.internalState.pbrParams 
    });
  }
  
  /**
   * Get current PBR parameters
   */
  getPBRParams(): PBRMaterialParams {
    return { ...this.internalState.pbrParams };
  }
  
  /**
   * Reset PBR parameters to defaults
   */
  resetPBRParams(): void {
    this.internalState.pbrParams = { ...DEFAULT_PBR_PARAMS };
    this.internalState.currentPresetId = null;
    
    eventBus.emit('material:paramsReset', { 
      params: this.internalState.pbrParams 
    });
  }
  
  // ============================================================
  // Preset Management
  // ============================================================
  
  /**
   * Register a material preset
   */
  registerPreset(preset: MaterialPreset): void {
    this.presets.set(preset.id, preset);
  }
  
  /**
   * Get a preset by ID
   */
  getPreset(id: string): MaterialPreset | undefined {
    return this.presets.get(id);
  }
  
  /**
   * Get all presets
   */
  getAllPresets(): MaterialPreset[] {
    return Array.from(this.presets.values());
  }
  
  /**
   * Get presets by category
   */
  getPresetsByCategory(category: string): MaterialPreset[] {
    return Array.from(this.presets.values()).filter(p => p.category === category);
  }
  
  /**
   * Get preset categories
   */
  getPresetCategories(): string[] {
    return [...new Set(Array.from(this.presets.values()).map(p => p.category))];
  }
  
  /**
   * Apply a preset
   */
  applyPreset(presetId: string): void {
    const preset = this.presets.get(presetId);
    if (!preset) return;
    
    this.internalState.pbrParams = { ...preset.params };
    this.internalState.currentPresetId = presetId;
    
    eventBus.emit('material:presetApplied', { 
      presetId,
      params: this.internalState.pbrParams 
    });
  }
  
  // ============================================================
  // Normal Map Generation
  // ============================================================
  
  /**
   * Request normal map generation from depth
   */
  generateNormalMap(): void {
    if (this.internalState.isProcessing) return;
    
    this.internalState.isProcessing = true;
    
    eventBus.emit('geometry:normalMapGenerationStart', {
      quality: this.config.normalMapQuality,
    });
  }
  
  /**
   * Set normal map generated status
   */
  setNormalMapGenerated(generated: boolean): void {
    this.internalState.normalMapGenerated = generated;
    this.internalState.isProcessing = false;
  }
  
  // ============================================================
  // Private Methods
  // ============================================================
  
  /**
   * Register built-in material presets
   */
  private registerBuiltInPresets(): void {
    const builtInPresets: MaterialPreset[] = [
      {
        id: 'default',
        name: 'Default',
        category: 'Basic',
        params: { ...DEFAULT_PBR_PARAMS },
      },
      {
        id: 'glossy-plastic',
        name: 'Glossy Plastic',
        category: 'Plastic',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#ffffff',
          roughness: 0.1,
          metalness: 0.0,
        },
      },
      {
        id: 'matte-plastic',
        name: 'Matte Plastic',
        category: 'Plastic',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#dddddd',
          roughness: 0.8,
          metalness: 0.0,
        },
      },
      {
        id: 'polished-metal',
        name: 'Polished Metal',
        category: 'Metal',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#c0c0c0',
          roughness: 0.1,
          metalness: 1.0,
          envMapIntensity: 1.5,
        },
      },
      {
        id: 'brushed-metal',
        name: 'Brushed Metal',
        category: 'Metal',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#a0a0a0',
          roughness: 0.4,
          metalness: 1.0,
        },
      },
      {
        id: 'gold',
        name: 'Gold',
        category: 'Metal',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#ffd700',
          roughness: 0.2,
          metalness: 1.0,
          envMapIntensity: 1.3,
        },
      },
      {
        id: 'copper',
        name: 'Copper',
        category: 'Metal',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#b87333',
          roughness: 0.3,
          metalness: 1.0,
        },
      },
      {
        id: 'ceramic',
        name: 'Ceramic',
        category: 'Ceramic',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#f5f5f5',
          roughness: 0.3,
          metalness: 0.0,
          envMapIntensity: 0.8,
        },
      },
      {
        id: 'clay',
        name: 'Clay',
        category: 'Organic',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#c4a484',
          roughness: 0.9,
          metalness: 0.0,
        },
      },
      {
        id: 'glass',
        name: 'Glass',
        category: 'Transparent',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#ffffff',
          roughness: 0.0,
          metalness: 0.0,
          envMapIntensity: 2.0,
        },
      },
      {
        id: 'emissive-glow',
        name: 'Emissive Glow',
        category: 'Effects',
        params: {
          ...DEFAULT_PBR_PARAMS,
          color: '#ffffff',
          roughness: 0.5,
          emissive: '#00ff88',
          emissiveIntensity: 0.8,
        },
      },
    ];
    
    builtInPresets.forEach(preset => this.registerPreset(preset));
  }
  
  // ============================================================
  // Event Handlers
  // ============================================================
  
  private handleSubdivisionChange = (payload: { level: number }): void => {
    this.setSubdivisionLevel(payload.level);
  };
  
  private handleParamsUpdate = (payload: { params: unknown }): void => {
    this.updatePBRParams(payload.params as Partial<PBRMaterialParams>);
  };
  
  private handlePresetApply = (payload: { presetId: string }): void => {
    this.applyPreset(payload.presetId);
  };
}

// Singleton instance
export const geometryMaterialModule = new GeometryMaterialModule();
