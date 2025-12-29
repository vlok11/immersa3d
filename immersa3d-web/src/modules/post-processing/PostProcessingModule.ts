// ============================================================
// Immersa 3D - Post Processing Module
// Main module entry for post-processing effects
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';

/**
 * Effect type enum
 */
export type EffectType = 
  | 'colorCorrection'
  | 'lut'
  | 'hdr'
  | 'dof'
  | 'motionBlur'
  | 'bloom'
  | 'chromaticAberration'
  | 'vignette'
  | 'sharpen';

/**
 * Post Processing Module Configuration
 */
export interface PostProcessingConfig {
  enabled: boolean;
  enableHDR: boolean;
  hdrExposure: number;
  enableBloom: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  enableDOF: boolean;
  dofFocusDistance: number;
  dofAperture: number;
  enableVignette: boolean;
  vignetteIntensity: number;
  enableChromaticAberration: boolean;
  chromaticAberrationOffset: number;
}

/**
 * Post Processing Module State
 */
export interface PostProcessingState {
  activeEffects: EffectType[];
  composerReady: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PostProcessingConfig = {
  enabled: true,
  enableHDR: true,
  hdrExposure: 1.0,
  enableBloom: true,
  bloomIntensity: 0.5,
  bloomThreshold: 0.8,
  enableDOF: false,
  dofFocusDistance: 5.0,
  dofAperture: 0.025,
  enableVignette: true,
  vignetteIntensity: 0.3,
  enableChromaticAberration: false,
  chromaticAberrationOffset: 0.002,
};

/**
 * PostProcessingModule - Post-processing effects management
 * 
 * Responsibilities:
 * - Manage effect chain (composer)
 * - Provide effect configuration UI bindings
 * - Handle effect lifecycle
 */
export class PostProcessingModule implements ImmersaModule<PostProcessingConfig, PostProcessingState> {
  readonly id = 'post-processing';
  readonly name = 'Post Processing';
  readonly version = '1.0.0';
  readonly dependencies: string[] = ['projection-3d'];
  
  state: ModuleState = 'unregistered';
  
  private config: PostProcessingConfig = { ...DEFAULT_CONFIG };
  
  private internalState: PostProcessingState = {
    activeEffects: [],
    composerReady: false,
  };
  
  /**
   * Setup module resources
   */
  async setup(config?: PostProcessingConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Initialize active effects based on config
    this.updateActiveEffects();
    
    // Listen for config update events
    eventBus.on('postprocess:configUpdate', this.handleConfigUpdate);
    
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
    
    eventBus.off('postprocess:configUpdate', this.handleConfigUpdate);
    
    this.internalState = {
      activeEffects: [],
      composerReady: false,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): PostProcessingState {
    return { ...this.internalState };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): PostProcessingConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(partial: Partial<PostProcessingConfig>): void {
    this.config = { ...this.config, ...partial };
    this.updateActiveEffects();
    
    eventBus.emit('postprocess:configChanged', { config: this.config });
  }
  
  /**
   * Enable specific effect
   */
  enableEffect(effect: EffectType): void {
    switch (effect) {
      case 'bloom':
        this.config.enableBloom = true;
        break;
      case 'hdr':
        this.config.enableHDR = true;
        break;
      case 'dof':
        this.config.enableDOF = true;
        break;
      case 'vignette':
        this.config.enableVignette = true;
        break;
      case 'chromaticAberration':
        this.config.enableChromaticAberration = true;
        break;
    }
    
    this.updateActiveEffects();
    eventBus.emit('postprocess:effectEnabled', { effect });
  }
  
  /**
   * Disable specific effect
   */
  disableEffect(effect: EffectType): void {
    switch (effect) {
      case 'bloom':
        this.config.enableBloom = false;
        break;
      case 'hdr':
        this.config.enableHDR = false;
        break;
      case 'dof':
        this.config.enableDOF = false;
        break;
      case 'vignette':
        this.config.enableVignette = false;
        break;
      case 'chromaticAberration':
        this.config.enableChromaticAberration = false;
        break;
    }
    
    this.updateActiveEffects();
    eventBus.emit('postprocess:effectDisabled', { effect });
  }
  
  /**
   * Update active effects list based on config
   */
  private updateActiveEffects(): void {
    const effects: EffectType[] = [];
    
    if (this.config.enableHDR) effects.push('hdr');
    if (this.config.enableBloom) effects.push('bloom');
    if (this.config.enableDOF) effects.push('dof');
    if (this.config.enableVignette) effects.push('vignette');
    if (this.config.enableChromaticAberration) effects.push('chromaticAberration');
    
    this.internalState.activeEffects = effects;
  }
  
  /**
   * Handle config update event
   */
  private handleConfigUpdate = (payload: { config: unknown }): void => {
    this.updateConfig(payload.config as Partial<PostProcessingConfig>);
  };
  
  /**
   * Set composer ready state
   */
  setComposerReady(ready: boolean): void {
    this.internalState.composerReady = ready;
  }
}

// Singleton instance
export const postProcessingModule = new PostProcessingModule();
