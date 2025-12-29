// ============================================================
// Immersa 3D - Gyroscope Tracker
// Device orientation tracking with Kalman filtering
// ============================================================

import { eventBus } from '../../../core/events';
import type { ParallaxOffset } from '../Naked3DModule';

/**
 * Gyroscope tracker options
 */
export interface GyroscopeTrackerOptions {
  /** Sensitivity multiplier */
  sensitivity: number;
  /** Smoothing factor (0-1) */
  smoothing: number;
  /** Reference angle for neutral position */
  referenceAngle: number;
  /** Invert X axis */
  invertX: boolean;
  /** Invert Y axis */
  invertY: boolean;
}

/**
 * Kalman filter state for one axis
 */
interface KalmanState {
  estimate: number;
  errorEstimate: number;
  errorMeasure: number;
  q: number; // Process noise
}

/**
 * Create initial Kalman state
 */
function createKalmanState(): KalmanState {
  return {
    estimate: 0,
    errorEstimate: 1,
    errorMeasure: 0.1,
    q: 0.01,
  };
}

/**
 * Apply Kalman filter update
 */
function kalmanUpdate(state: KalmanState, measurement: number): number {
  // Prediction update
  const errorEstimate = state.errorEstimate + state.q;
  
  // Measurement update
  const kalmanGain = errorEstimate / (errorEstimate + state.errorMeasure);
  state.estimate = state.estimate + kalmanGain * (measurement - state.estimate);
  state.errorEstimate = (1 - kalmanGain) * errorEstimate;
  
  return state.estimate;
}

/**
 * Gyroscope Tracker Class
 * Tracks device orientation with noise filtering
 */
export class GyroscopeTracker {
  private options: Required<GyroscopeTrackerOptions>;
  private isTracking: boolean = false;
  private isAvailable: boolean = false;
  private permissionGranted: boolean = false;
  
  private currentOffset: ParallaxOffset = { x: 0, y: 0 };
  private kalmanX: KalmanState = createKalmanState();
  private kalmanY: KalmanState = createKalmanState();
  
  private boundHandler: (event: DeviceOrientationEvent) => void;
  
  constructor(options?: Partial<GyroscopeTrackerOptions>) {
    this.options = {
      sensitivity: options?.sensitivity ?? 1.0,
      smoothing: options?.smoothing ?? 0.15,
      referenceAngle: options?.referenceAngle ?? 45,
      invertX: options?.invertX ?? false,
      invertY: options?.invertY ?? false,
    };
    
    this.boundHandler = this.handleOrientation.bind(this);
  }
  
  /**
   * Check if gyroscope is available
   */
  async checkAvailability(): Promise<boolean> {
    if (typeof DeviceOrientationEvent === 'undefined') {
      this.isAvailable = false;
      return false;
    }
    
    // Check for iOS 13+ permission API
    const DeviceOrientation = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    
    if (typeof DeviceOrientation.requestPermission === 'function') {
      // Permission API exists, need to request
      this.isAvailable = true;
      return true;
    }
    
    // Other devices - assume available
    this.isAvailable = 'DeviceOrientationEvent' in window;
    this.permissionGranted = this.isAvailable;
    return this.isAvailable;
  }
  
  /**
   * Request permission (iOS 13+)
   */
  async requestPermission(): Promise<boolean> {
    const DeviceOrientation = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    
    if (typeof DeviceOrientation.requestPermission !== 'function') {
      this.permissionGranted = true;
      return true;
    }
    
    try {
      const permission = await DeviceOrientation.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('[GyroscopeTracker] Permission request failed:', error);
      this.permissionGranted = false;
      return false;
    }
  }
  
  /**
   * Start tracking
   */
  async start(): Promise<boolean> {
    if (this.isTracking) return true;
    
    if (!this.isAvailable) {
      const available = await this.checkAvailability();
      if (!available) {
        console.warn('[GyroscopeTracker] Gyroscope not available');
        return false;
      }
    }
    
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('[GyroscopeTracker] Permission not granted');
        return false;
      }
    }
    
    window.addEventListener('deviceorientation', this.boundHandler, { passive: true });
    this.isTracking = true;
    
    eventBus.emit('gyroscope:started', {});
    return true;
  }
  
  /**
   * Stop tracking
   */
  stop(): void {
    if (!this.isTracking) return;
    
    window.removeEventListener('deviceorientation', this.boundHandler);
    this.isTracking = false;
    
    eventBus.emit('gyroscope:stopped', {});
  }
  
  /**
   * Get current offset
   */
  getOffset(): ParallaxOffset {
    return { ...this.currentOffset };
  }
  
  /**
   * Update options
   */
  updateOptions(options: Partial<GyroscopeTrackerOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Reset to neutral position
   */
  reset(): void {
    this.currentOffset = { x: 0, y: 0 };
    this.kalmanX = createKalmanState();
    this.kalmanY = createKalmanState();
  }
  
  /**
   * Check if currently tracking
   */
  isActive(): boolean {
    return this.isTracking;
  }
  
  /**
   * Check availability status
   */
  isGyroscopeAvailable(): boolean {
    return this.isAvailable;
  }
  
  /**
   * Handle device orientation event
   */
  private handleOrientation(event: DeviceOrientationEvent): void {
    const { sensitivity, referenceAngle, invertX, invertY } = this.options;
    
    // Get raw values
    const gamma = event.gamma ?? 0;  // Left-right tilt (-90 to 90)
    const beta = event.beta ?? 0;    // Front-back tilt (-180 to 180)
    
    // Normalize to -1 to 1 range
    let rawX = (gamma / 45) * sensitivity;
    let rawY = ((beta - referenceAngle) / 45) * sensitivity;
    
    // Clamp values
    rawX = Math.max(-1, Math.min(1, rawX));
    rawY = Math.max(-1, Math.min(1, rawY));
    
    // Apply Kalman filter
    const filteredX = kalmanUpdate(this.kalmanX, rawX);
    const filteredY = kalmanUpdate(this.kalmanY, rawY);
    
    // Apply inversion
    this.currentOffset = {
      x: invertX ? -filteredX : filteredX,
      y: invertY ? -filteredY : filteredY,
    };
    
    // Emit update
    eventBus.emit('gyroscope:update', { offset: this.currentOffset });
  }
}

/**
 * Create a gyroscope tracker instance
 */
export function createGyroscopeTracker(options?: Partial<GyroscopeTrackerOptions>): GyroscopeTracker {
  return new GyroscopeTracker(options);
}
