// ============================================================
// Immersa 3D - Atmosphere Module
// Environmental effects and ambience management
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';

/**
 * Fog type
 */
export type FogType = 'linear' | 'exponential' | 'exponentialSquared' | 'height';

/**
 * Particle type
 */
export type ParticleType = 'rain' | 'snow' | 'dust' | 'fireflies' | 'custom';

/**
 * Atmosphere Module Configuration
 */
export interface AtmosphereConfig {
  // Lighting
  enableAmbientLight: boolean;
  ambientLightIntensity: number;
  ambientLightColor: string;
  enableHDRI: boolean;
  hdriUrl?: string;
  
  // Fog
  enableFog: boolean;
  fogType: FogType;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  fogDensity: number;
  
  // Particles
  enableParticles: boolean;
  particleType: ParticleType;
  particleCount: number;
  particleSpeed: number;
  
  // Volumetric
  enableVolumetricLight: boolean;
  volumetricIntensity: number;
  
  // Skybox
  enableSkybox: boolean;
  skyboxType: 'color' | 'gradient' | 'hdri';
}

/**
 * Atmosphere Module State
 */
export interface AtmosphereState {
  hdriLoaded: boolean;
  particlesActive: boolean;
  currentPreset: string | null;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AtmosphereConfig = {
  enableAmbientLight: true,
  ambientLightIntensity: 0.5,
  ambientLightColor: '#ffffff',
  enableHDRI: false,
  
  enableFog: false,
  fogType: 'exponential',
  fogColor: '#88aacc',
  fogNear: 1,
  fogFar: 100,
  fogDensity: 0.02,
  
  enableParticles: false,
  particleType: 'dust',
  particleCount: 1000,
  particleSpeed: 1.0,
  
  enableVolumetricLight: false,
  volumetricIntensity: 0.5,
  
  enableSkybox: true,
  skyboxType: 'gradient',
};

/**
 * AtmosphereModule - Environmental effects management
 * 
 * Responsibilities:
 * - Ambient lighting and IBL
 * - Fog effects (linear, exponential, height)
 * - Particle systems (rain, snow, dust)
 * - Volumetric lighting (god rays)
 * - Skybox management
 */
export class AtmosphereModule implements ImmersaModule<AtmosphereConfig, AtmosphereState> {
  readonly id = 'atmosphere';
  readonly name = 'Atmosphere';
  readonly version = '1.0.0';
  readonly dependencies: string[] = ['projection-3d'];
  
  state: ModuleState = 'unregistered';
  
  private config: AtmosphereConfig = { ...DEFAULT_CONFIG };
  
  private internalState: AtmosphereState = {
    hdriLoaded: false,
    particlesActive: false,
    currentPreset: null,
  };
  
  /**
   * Setup module resources
   */
  async setup(config?: AtmosphereConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Listen for config updates
    eventBus.on('atmosphere:configUpdate', this.handleConfigUpdate);
    
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
    
    eventBus.off('atmosphere:configUpdate', this.handleConfigUpdate);
    
    this.internalState = {
      hdriLoaded: false,
      particlesActive: false,
      currentPreset: null,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): AtmosphereState {
    return { ...this.internalState };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): AtmosphereConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(partial: Partial<AtmosphereConfig>): void {
    this.config = { ...this.config, ...partial };
    eventBus.emit('atmosphere:configChanged', { config: this.config });
  }
  
  /**
   * Apply preset
   */
  applyPreset(presetName: string): void {
    const preset = ATMOSPHERE_PRESETS[presetName];
    if (preset) {
      this.config = { ...this.config, ...preset };
      this.internalState.currentPreset = presetName;
      eventBus.emit('atmosphere:presetApplied', { preset: presetName });
    }
  }
  
  /**
   * Handle config update event
   */
  private handleConfigUpdate = (payload: { config: unknown }): void => {
    this.updateConfig(payload.config as Partial<AtmosphereConfig>);
  };
  
  /**
   * Set HDRI loaded state
   */
  setHDRILoaded(loaded: boolean): void {
    this.internalState.hdriLoaded = loaded;
  }
  
  /**
   * Set particles active state
   */
  setParticlesActive(active: boolean): void {
    this.internalState.particlesActive = active;
  }
}

/**
 * Built-in atmosphere presets
 */
export const ATMOSPHERE_PRESETS: Record<string, Partial<AtmosphereConfig>> = {
  'clear': {
    enableFog: false,
    enableParticles: false,
    ambientLightIntensity: 0.7,
    enableSkybox: true,
  },
  'foggy': {
    enableFog: true,
    fogType: 'exponential',
    fogDensity: 0.05,
    fogColor: '#aabbcc',
    ambientLightIntensity: 0.4,
  },
  'rainy': {
    enableFog: true,
    fogType: 'exponential',
    fogDensity: 0.03,
    fogColor: '#667788',
    enableParticles: true,
    particleType: 'rain',
    particleCount: 2000,
    particleSpeed: 2.0,
    ambientLightIntensity: 0.3,
  },
  'snowy': {
    enableFog: true,
    fogType: 'exponential',
    fogDensity: 0.02,
    fogColor: '#ddddff',
    enableParticles: true,
    particleType: 'snow',
    particleCount: 1500,
    particleSpeed: 0.5,
    ambientLightIntensity: 0.6,
  },
  'dusty': {
    enableFog: true,
    fogType: 'height',
    fogDensity: 0.01,
    fogColor: '#ccaa88',
    enableParticles: true,
    particleType: 'dust',
    particleCount: 500,
    particleSpeed: 0.3,
    ambientLightIntensity: 0.5,
  },
  'dreamy': {
    enableFog: true,
    fogType: 'exponential',
    fogDensity: 0.04,
    fogColor: '#ffccee',
    enableParticles: true,
    particleType: 'fireflies',
    particleCount: 200,
    particleSpeed: 0.2,
    ambientLightIntensity: 0.3,
    enableVolumetricLight: true,
    volumetricIntensity: 0.7,
  },
};

// Singleton instance
export const atmosphereModule = new AtmosphereModule();
