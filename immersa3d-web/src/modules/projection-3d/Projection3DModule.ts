// ============================================================
// Immersa 3D - Projection3D Module
// Main module entry for 3D projection functionality
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';

/**
 * Projection3D Module Configuration
 */
export interface Projection3DConfig {
  defaultProjection: 'planar' | 'cylindrical' | 'spherical';
  maxSubdivisions: number;
}

/**
 * Projection3D Module State
 */
export interface Projection3DState {
  currentProjection: string;
  meshReady: boolean;
}

/**
 * Projection3DModule - 3D projection and mesh management
 */
export class Projection3DModule implements ImmersaModule<Projection3DConfig, Projection3DState> {
  readonly id = 'projection-3d';
  readonly name = 'Projection 3D';
  readonly version = '1.0.0';
  readonly dependencies: string[] = []; // No dependencies for base module
  
  state: ModuleState = 'unregistered';
  
  private config: Projection3DConfig = {
    defaultProjection: 'planar',
    maxSubdivisions: 512,
  };
  
  private internalState: Projection3DState = {
    currentProjection: 'planar',
    meshReady: false,
  };
  
  /**
   * Setup module resources
   */
  async setup(config?: Projection3DConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.internalState.currentProjection = this.config.defaultProjection;
    
    // Register event listeners
    eventBus.on('analysis:completed', this.handleAnalysisCompleted);
    
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
   * CRITICAL: Must release GPU memory
   */
  dispose(): void {
    console.log(`[${this.id}] Disposing...`);
    
    // Remove event listeners
    eventBus.off('analysis:completed', this.handleAnalysisCompleted);
    
    // Reset state
    this.internalState = {
      currentProjection: 'planar',
      meshReady: false,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): Projection3DState {
    return { ...this.internalState };
  }
  
  /**
   * Handle analysis completion event
   */
  private handleAnalysisCompleted = (payload: { type: string; result: unknown }): void => {
    if (payload.type === 'depth') {
      this.internalState.meshReady = true;
      console.log(`[${this.id}] Depth analysis ready, mesh can be rendered`);
    }
  };
  
  /**
   * Set projection mode
   */
  setProjectionMode(mode: 'planar' | 'cylindrical' | 'spherical'): void {
    this.internalState.currentProjection = mode;
    console.log(`[${this.id}] Projection mode set to: ${mode}`);
  }
}

// Singleton instance
export const projection3DModule = new Projection3DModule();
