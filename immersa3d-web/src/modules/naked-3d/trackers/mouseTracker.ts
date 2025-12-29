// ============================================================
// Immersa 3D - Mouse Tracker
// Desktop mouse position tracking for parallax
// ============================================================

import { eventBus } from '../../../core/events';
import type { ParallaxOffset } from '../Naked3DModule';

/**
 * Mouse tracker options
 */
export interface MouseTrackerOptions {
  /** Sensitivity multiplier */
  sensitivity: number;
  /** Smoothing factor (0-1) */
  smoothing: number;
  /** Invert X axis */
  invertX: boolean;
  /** Invert Y axis */
  invertY: boolean;
  /** Dead zone in center (0-1) */
  deadZone: number;
}

/**
 * Mouse Tracker Class
 * Tracks mouse position for desktop parallax effect
 */
export class MouseTracker {
  private options: Required<MouseTrackerOptions>;
  private isTracking: boolean = false;
  
  private currentOffset: ParallaxOffset = { x: 0, y: 0 };
  private targetOffset: ParallaxOffset = { x: 0, y: 0 };
  
  private animationFrameId: number | null = null;
  private boundHandler: (event: MouseEvent) => void;
  
  constructor(options?: Partial<MouseTrackerOptions>) {
    this.options = {
      sensitivity: options?.sensitivity ?? 1.0,
      smoothing: options?.smoothing ?? 0.1,
      invertX: options?.invertX ?? false,
      invertY: options?.invertY ?? false,
      deadZone: options?.deadZone ?? 0,
    };
    
    this.boundHandler = this.handleMouseMove.bind(this);
  }
  
  /**
   * Start tracking
   */
  start(): void {
    if (this.isTracking) return;
    
    window.addEventListener('mousemove', this.boundHandler, { passive: true });
    this.isTracking = true;
    this.startSmoothingLoop();
    
    eventBus.emit('mouseTracker:started', {});
  }
  
  /**
   * Stop tracking
   */
  stop(): void {
    if (!this.isTracking) return;
    
    window.removeEventListener('mousemove', this.boundHandler);
    this.isTracking = false;
    this.stopSmoothingLoop();
    
    eventBus.emit('mouseTracker:stopped', {});
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
  updateOptions(options: Partial<MouseTrackerOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Reset to center
   */
  reset(): void {
    this.currentOffset = { x: 0, y: 0 };
    this.targetOffset = { x: 0, y: 0 };
  }
  
  /**
   * Check if currently tracking
   */
  isActive(): boolean {
    return this.isTracking;
  }
  
  /**
   * Handle mouse move event
   */
  private handleMouseMove(event: MouseEvent): void {
    const { sensitivity, invertX, invertY, deadZone } = this.options;
    
    // Calculate normalized position (-1 to 1, centered)
    let x = (event.clientX / window.innerWidth - 0.5) * 2;
    let y = (event.clientY / window.innerHeight - 0.5) * 2;
    
    // Apply dead zone
    if (deadZone > 0) {
      x = applyDeadZone(x, deadZone);
      y = applyDeadZone(y, deadZone);
    }
    
    // Apply sensitivity
    x *= sensitivity;
    y *= sensitivity;
    
    // Clamp
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    
    // Apply inversion
    this.targetOffset = {
      x: invertX ? -x : x,
      y: invertY ? -y : y,
    };
  }
  
  /**
   * Start smoothing animation loop
   */
  private startSmoothingLoop(): void {
    const update = () => {
      if (!this.isTracking) return;
      
      const { smoothing } = this.options;
      
      // Exponential smoothing
      this.currentOffset.x += (this.targetOffset.x - this.currentOffset.x) * smoothing;
      this.currentOffset.y += (this.targetOffset.y - this.currentOffset.y) * smoothing;
      
      // Emit update
      eventBus.emit('mouseTracker:update', { offset: { ...this.currentOffset } });
      
      this.animationFrameId = requestAnimationFrame(update);
    };
    
    this.animationFrameId = requestAnimationFrame(update);
  }
  
  /**
   * Stop smoothing loop
   */
  private stopSmoothingLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

/**
 * Apply dead zone to input value
 */
function applyDeadZone(value: number, deadZone: number): number {
  const absValue = Math.abs(value);
  
  if (absValue < deadZone) {
    return 0;
  }
  
  // Remap value from [deadZone, 1] to [0, 1]
  const sign = value < 0 ? -1 : 1;
  return sign * ((absValue - deadZone) / (1 - deadZone));
}

/**
 * Create a mouse tracker instance
 */
export function createMouseTracker(options?: Partial<MouseTrackerOptions>): MouseTracker {
  return new MouseTracker(options);
}
