// ============================================================
// Immersa 3D - Naked 3D Module
// Interactive parallax stereoscopic experience
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';

/**
 * Input source for parallax tracking
 */
export type ParallaxInputSource = 'mouse' | 'gyroscope' | 'faceTracking' | 'manual';

/**
 * Device type
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet';

/**
 * Parallax offset data
 */
export interface ParallaxOffset {
  x: number;  // Horizontal offset (-1 to 1)
  y: number;  // Vertical offset (-1 to 1)
}

/**
 * Naked 3D Module Configuration
 */
export interface Naked3DConfig {
  /** Parallax effect intensity */
  intensity: number;
  /** Smoothing factor (0-1, higher = smoother/slower) */
  smoothing: number;
  /** Maximum offset range */
  maxOffset: number;
  /** Default input source */
  defaultInputSource: ParallaxInputSource;
  /** Enable depth layer separation */
  enableLayerSeparation: boolean;
  /** Number of depth layers */
  layerCount: number;
  /** Layer separation distance */
  layerSeparation: number;
  /** Enable edge feathering between layers */
  featherEdges: boolean;
  /** Gyroscope sensitivity */
  gyroSensitivity: number;
  /** Invert X axis */
  invertX: boolean;
  /** Invert Y axis */
  invertY: boolean;
}

/**
 * Naked 3D Module State
 */
export interface Naked3DState {
  /** Current parallax offset */
  currentOffset: ParallaxOffset;
  /** Target offset (before smoothing) */
  targetOffset: ParallaxOffset;
  /** Active input source */
  activeInputSource: ParallaxInputSource;
  /** Detected device type */
  deviceType: DeviceType;
  /** Is gyroscope available */
  gyroscopeAvailable: boolean;
  /** Is effect active */
  isActive: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Naked3DConfig = {
  intensity: 1.0,
  smoothing: 0.1,
  maxOffset: 0.1,
  defaultInputSource: 'mouse',
  enableLayerSeparation: true,
  layerCount: 3,
  layerSeparation: 0.02,
  featherEdges: true,
  gyroSensitivity: 1.0,
  invertX: false,
  invertY: false,
};

/**
 * Default state
 */
const DEFAULT_STATE: Naked3DState = {
  currentOffset: { x: 0, y: 0 },
  targetOffset: { x: 0, y: 0 },
  activeInputSource: 'mouse',
  deviceType: 'desktop',
  gyroscopeAvailable: false,
  isActive: false,
};

/**
 * Naked3DModule - Interactive parallax experience
 * 
 * Core Algorithm: Offset = Input * Depth * Intensity
 * 
 * Responsibilities:
 * - Track input sources (mouse, gyroscope)
 * - Apply parallax offset to layers
 * - Manage depth layer separation
 * - Adapt to device capabilities
 */
export class Naked3DModule implements ImmersaModule<Naked3DConfig, Naked3DState> {
  readonly id = 'naked-3d';
  readonly name = 'Naked 3D';
  readonly version = '1.0.0';
  readonly dependencies: string[] = ['ai-analysis', 'projection-3d'];
  
  state: ModuleState = 'unregistered';
  
  private config: Naked3DConfig = { ...DEFAULT_CONFIG };
  
  private internalState: Naked3DState = { ...DEFAULT_STATE };
  
  /** Animation frame ID for cleanup */
  private animationFrameId: number | null = null;
  
  /** Bound event handlers */
  private boundHandlers = {
    mousemove: this.handleMouseMove.bind(this),
    deviceorientation: this.handleDeviceOrientation.bind(this),
  };
  
  /**
   * Setup module resources
   */
  async setup(config?: Naked3DConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Detect device type
    this.detectDevice();
    
    // Check gyroscope availability
    await this.checkGyroscope();
    
    // Set initial input source based on device
    this.internalState.activeInputSource = 
      this.internalState.deviceType === 'mobile' && this.internalState.gyroscopeAvailable
        ? 'gyroscope'
        : this.config.defaultInputSource;
    
    // Listen for events
    eventBus.on('naked3d:setInputSource', this.handleSetInputSource);
    eventBus.on('naked3d:setIntensity', this.handleSetIntensity);
    eventBus.on('naked3d:toggle', this.handleToggle);
    
    console.log(`[${this.id}] Setup complete (Device: ${this.internalState.deviceType})`);
  }
  
  /**
   * Activate the module
   */
  activate(): void {
    this.internalState.isActive = true;
    this.attachInputListeners();
    this.startUpdateLoop();
    
    console.log(`[${this.id}] Activated`);
    eventBus.emit('naked3d:activated', {});
  }
  
  /**
   * Deactivate the module
   */
  deactivate(): void {
    this.internalState.isActive = false;
    this.detachInputListeners();
    this.stopUpdateLoop();
    
    console.log(`[${this.id}] Deactivated`);
    eventBus.emit('naked3d:deactivated', {});
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    console.log(`[${this.id}] Disposing...`);
    
    this.deactivate();
    
    // Remove event listeners
    eventBus.off('naked3d:setInputSource', this.handleSetInputSource);
    eventBus.off('naked3d:setIntensity', this.handleSetIntensity);
    eventBus.off('naked3d:toggle', this.handleToggle);
    
    // Reset state
    this.internalState = { ...DEFAULT_STATE };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): Naked3DState {
    return { 
      ...this.internalState,
      currentOffset: { ...this.internalState.currentOffset },
      targetOffset: { ...this.internalState.targetOffset },
    };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): Naked3DConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(partial: Partial<Naked3DConfig>): void {
    this.config = { ...this.config, ...partial };
    eventBus.emit('naked3d:configChanged', { config: this.config });
  }
  
  // ============================================================
  // Input Source Management
  // ============================================================
  
  /**
   * Set active input source
   */
  setInputSource(source: ParallaxInputSource): void {
    if (source === 'gyroscope' && !this.internalState.gyroscopeAvailable) {
      console.warn(`[${this.id}] Gyroscope not available`);
      return;
    }
    
    this.detachInputListeners();
    this.internalState.activeInputSource = source;
    this.attachInputListeners();
    
    eventBus.emit('naked3d:inputSourceChanged', { source });
  }
  
  /**
   * Get current input source
   */
  getInputSource(): ParallaxInputSource {
    return this.internalState.activeInputSource;
  }
  
  /**
   * Manually set parallax offset (for 'manual' input source)
   */
  setManualOffset(offset: ParallaxOffset): void {
    if (this.internalState.activeInputSource !== 'manual') return;
    
    this.internalState.targetOffset = {
      x: Math.max(-1, Math.min(1, offset.x)),
      y: Math.max(-1, Math.min(1, offset.y)),
    };
  }
  
  // ============================================================
  // Parallax Calculation
  // ============================================================
  
  /**
   * Calculate layer offset based on depth
   * Core formula: Offset = Input * Depth * Intensity
   */
  calculateLayerOffset(normalizedDepth: number): ParallaxOffset {
    const { currentOffset } = this.internalState;
    const { intensity, maxOffset } = this.config;
    
    // Depth 0 = far (less movement), Depth 1 = near (more movement)
    const depthMultiplier = normalizedDepth;
    
    return {
      x: currentOffset.x * depthMultiplier * intensity * maxOffset,
      y: currentOffset.y * depthMultiplier * intensity * maxOffset,
    };
  }
  
  /**
   * Get offsets for all layers
   */
  getLayerOffsets(): ParallaxOffset[] {
    const { layerCount } = this.config;
    const offsets: ParallaxOffset[] = [];
    
    for (let i = 0; i < layerCount; i++) {
      const normalizedDepth = (i + 1) / layerCount;
      offsets.push(this.calculateLayerOffset(normalizedDepth));
    }
    
    return offsets;
  }
  
  // ============================================================
  // Private Methods
  // ============================================================
  
  /**
   * Detect device type
   */
  private detectDevice(): void {
    const ua = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      this.internalState.deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      this.internalState.deviceType = 'tablet';
    } else {
      this.internalState.deviceType = 'desktop';
    }
  }
  
  /**
   * Check gyroscope availability
   */
  private async checkGyroscope(): Promise<void> {
    if (typeof DeviceOrientationEvent === 'undefined') {
      this.internalState.gyroscopeAvailable = false;
      return;
    }
    
    // Check if permission API is available (iOS 13+)
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        this.internalState.gyroscopeAvailable = permission === 'granted';
      } catch {
        this.internalState.gyroscopeAvailable = false;
      }
    } else {
      // Non-iOS or older iOS
      this.internalState.gyroscopeAvailable = 'DeviceOrientationEvent' in window;
    }
  }
  
  /**
   * Attach input event listeners
   */
  private attachInputListeners(): void {
    const source = this.internalState.activeInputSource;
    
    switch (source) {
      case 'mouse':
        window.addEventListener('mousemove', this.boundHandlers.mousemove, { passive: true });
        break;
      case 'gyroscope':
        window.addEventListener('deviceorientation', this.boundHandlers.deviceorientation, { passive: true });
        break;
    }
  }
  
  /**
   * Detach input event listeners
   */
  private detachInputListeners(): void {
    window.removeEventListener('mousemove', this.boundHandlers.mousemove);
    window.removeEventListener('deviceorientation', this.boundHandlers.deviceorientation);
  }
  
  /**
   * Handle mouse move event
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.internalState.isActive) return;
    
    // Normalize to -1 to 1 range, centered at window center
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    
    this.internalState.targetOffset = {
      x: this.config.invertX ? -x : x,
      y: this.config.invertY ? -y : y,
    };
  }
  
  /**
   * Handle device orientation event
   */
  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    if (!this.internalState.isActive) return;
    
    const { gyroSensitivity } = this.config;
    
    // Use gamma (left-right tilt) and beta (front-back tilt)
    const gamma = event.gamma ?? 0; // -90 to 90
    const beta = event.beta ?? 0;   // -180 to 180
    
    // Normalize to -1 to 1 range
    const x = (gamma / 45) * gyroSensitivity;
    const y = ((beta - 45) / 45) * gyroSensitivity; // Assume ~45 degree holding angle
    
    this.internalState.targetOffset = {
      x: Math.max(-1, Math.min(1, this.config.invertX ? -x : x)),
      y: Math.max(-1, Math.min(1, this.config.invertY ? -y : y)),
    };
  }
  
  /**
   * Start update loop for smooth interpolation
   */
  private startUpdateLoop(): void {
    const update = () => {
      if (!this.internalState.isActive) return;
      
      const { currentOffset, targetOffset } = this.internalState;
      const { smoothing } = this.config;
      
      // Exponential smoothing (Kalman-like filter)
      currentOffset.x += (targetOffset.x - currentOffset.x) * smoothing;
      currentOffset.y += (targetOffset.y - currentOffset.y) * smoothing;
      
      // Emit offset update
      eventBus.emit('naked3d:offsetUpdate', { offset: { ...currentOffset } });
      
      this.animationFrameId = requestAnimationFrame(update);
    };
    
    this.animationFrameId = requestAnimationFrame(update);
  }
  
  /**
   * Stop update loop
   */
  private stopUpdateLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  // ============================================================
  // Event Handlers
  // ============================================================
  
  private handleSetInputSource = (payload: { source: string }): void => {
    this.setInputSource(payload.source as ParallaxInputSource);
  };
  
  private handleSetIntensity = (payload: { intensity: number }): void => {
    this.updateConfig({ intensity: payload.intensity });
  };
  
  private handleToggle = (): void => {
    if (this.internalState.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  };
}

// Singleton instance
export const naked3DModule = new Naked3DModule();
