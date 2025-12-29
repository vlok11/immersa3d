// ============================================================
// Immersa 3D - Camera Control Module
// Main module entry for camera and viewport control
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';
import type { CameraMode } from '../../store';

/**
 * Camera controller type enum
 */
export type ControllerType = 'orbit' | 'firstPerson' | 'fly';

/**
 * Camera Control Module Configuration
 */
export interface CameraControlConfig {
  defaultMode: ControllerType;
  enableDamping: boolean;
  dampingFactor: number;
  enableAutoRotate: boolean;
  autoRotateSpeed: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

/**
 * Camera Control Module State
 */
export interface CameraControlState {
  currentMode: ControllerType;
  isTransitioning: boolean;
  dampingEnabled: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CameraControlConfig = {
  defaultMode: 'orbit',
  enableDamping: true,
  dampingFactor: 0.05,
  enableAutoRotate: false,
  autoRotateSpeed: 2.0,
  minDistance: 0.5,
  maxDistance: 100,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
};

/**
 * CameraControlModule - Camera and viewport interaction
 * 
 * Responsibilities:
 * - Manage different camera control modes (Orbit, FirstPerson, Fly)
 * - Handle smooth camera transitions with GSAP
 * - Provide camera parameter UI bindings
 */
export class CameraControlModule implements ImmersaModule<CameraControlConfig, CameraControlState> {
  readonly id = 'camera-control';
  readonly name = 'Camera Control';
  readonly version = '1.0.0';
  readonly dependencies: string[] = [];
  
  state: ModuleState = 'unregistered';
  
  private config: CameraControlConfig = { ...DEFAULT_CONFIG };
  
  private internalState: CameraControlState = {
    currentMode: 'orbit',
    isTransitioning: false,
    dampingEnabled: true,
  };
  
  /**
   * Setup module resources
   */
  async setup(config?: CameraControlConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.internalState.currentMode = this.config.defaultMode;
    this.internalState.dampingEnabled = this.config.enableDamping;
    
    // Listen for camera mode change events
    eventBus.on('camera:modeChange', this.handleModeChange);
    eventBus.on('camera:transitionStart', this.handleTransitionStart);
    eventBus.on('camera:transitionEnd', this.handleTransitionEnd);
    
    console.log(`[${this.id}] Setup complete (Mode: ${this.config.defaultMode})`);
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
   * CRITICAL: Must release event listeners
   */
  dispose(): void {
    console.log(`[${this.id}] Disposing...`);
    
    // Remove event listeners
    eventBus.off('camera:modeChange', this.handleModeChange);
    eventBus.off('camera:transitionStart', this.handleTransitionStart);
    eventBus.off('camera:transitionEnd', this.handleTransitionEnd);
    
    // Reset state
    this.internalState = {
      currentMode: 'orbit',
      isTransitioning: false,
      dampingEnabled: true,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): CameraControlState {
    return { ...this.internalState };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): CameraControlConfig {
    return { ...this.config };
  }
  
  /**
   * Set camera control mode
   */
  setControlMode(mode: ControllerType): void {
    if (mode === this.internalState.currentMode) return;
    
    console.log(`[${this.id}] Switching to ${mode} mode`);
    this.internalState.currentMode = mode;
    
    eventBus.emit('camera:modeChanged', { mode });
  }
  
  /**
   * Update configuration
   */
  updateConfig(partial: Partial<CameraControlConfig>): void {
    this.config = { ...this.config, ...partial };
    
    if (partial.enableDamping !== undefined) {
      this.internalState.dampingEnabled = partial.enableDamping;
    }
    
    eventBus.emit('camera:configUpdated', { config: this.config });
  }
  
  /**
   * Request camera transition
   */
  requestTransition(
    targetPosition: [number, number, number],
    targetLookAt: [number, number, number],
    duration: number = 1.0
  ): void {
    eventBus.emit('camera:transitionRequest', {
      position: targetPosition,
      lookAt: targetLookAt,
      duration,
    });
  }
  
  /**
   * Handle camera mode change event
   */
  private handleModeChange = (payload: { mode: CameraMode }): void => {
    this.internalState.currentMode = payload.mode as ControllerType;
    console.log(`[${this.id}] Mode changed to: ${payload.mode}`);
  };
  
  /**
   * Handle transition start event
   */
  private handleTransitionStart = (): void => {
    this.internalState.isTransitioning = true;
  };
  
  /**
   * Handle transition end event
   */
  private handleTransitionEnd = (): void => {
    this.internalState.isTransitioning = false;
  };
}

// Singleton instance
export const cameraControlModule = new CameraControlModule();
