// ============================================================
// Immersa 3D - Keyframe Manager
// Manages keyframe sequences and interpolation
// ============================================================

import type { Keyframe, InterpolationType, EasingType } from '../AutoMotionModule';

/**
 * Keyframe snapshot for serialization
 */
export interface KeyframeSnapshot {
  keyframes: Keyframe[];
  duration: number;
  interpolation: InterpolationType;
}

/**
 * Interpolated camera state
 */
export interface InterpolatedState {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}

/**
 * Keyframe manager class
 * Provides utilities for keyframe manipulation and interpolation
 */
export class KeyframeManager {
  private keyframes: Keyframe[] = [];
  private interpolationType: InterpolationType = 'catmullRom';
  
  /**
   * Create a new keyframe manager
   */
  constructor(keyframes?: Keyframe[], interpolation?: InterpolationType) {
    if (keyframes) {
      this.keyframes = [...keyframes].sort((a, b) => a.time - b.time);
    }
    if (interpolation) {
      this.interpolationType = interpolation;
    }
  }
  
  /**
   * Get all keyframes
   */
  getKeyframes(): Keyframe[] {
    return [...this.keyframes];
  }
  
  /**
   * Get keyframe count
   */
  getCount(): number {
    return this.keyframes.length;
  }
  
  /**
   * Get total duration
   */
  getDuration(): number {
    if (this.keyframes.length === 0) return 0;
    return this.keyframes[this.keyframes.length - 1].time;
  }
  
  /**
   * Add a keyframe
   */
  addKeyframe(keyframe: Keyframe): void {
    this.keyframes.push(keyframe);
    this.keyframes.sort((a, b) => a.time - b.time);
  }
  
  /**
   * Remove keyframe at specific time
   */
  removeKeyframe(time: number, threshold: number = 0.1): boolean {
    const initialLength = this.keyframes.length;
    this.keyframes = this.keyframes.filter(kf => Math.abs(kf.time - time) > threshold);
    return this.keyframes.length < initialLength;
  }
  
  /**
   * Update keyframe at specific time
   */
  updateKeyframe(time: number, updates: Partial<Keyframe>, threshold: number = 0.1): boolean {
    for (let i = 0; i < this.keyframes.length; i++) {
      if (Math.abs(this.keyframes[i].time - time) <= threshold) {
        this.keyframes[i] = { ...this.keyframes[i], ...updates };
        // Re-sort if time changed
        if (updates.time !== undefined) {
          this.keyframes.sort((a, b) => a.time - b.time);
        }
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get keyframe at specific index
   */
  getKeyframeAt(index: number): Keyframe | undefined {
    return this.keyframes[index];
  }
  
  /**
   * Find keyframes surrounding a time value
   */
  findSurroundingKeyframes(time: number): { prev: Keyframe; next: Keyframe } | null {
    if (this.keyframes.length < 2) return null;
    
    // Before first keyframe
    if (time <= this.keyframes[0].time) {
      return { prev: this.keyframes[0], next: this.keyframes[0] };
    }
    
    // After last keyframe
    if (time >= this.keyframes[this.keyframes.length - 1].time) {
      const last = this.keyframes[this.keyframes.length - 1];
      return { prev: last, next: last };
    }
    
    // Find surrounding keyframes
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      if (time >= this.keyframes[i].time && time <= this.keyframes[i + 1].time) {
        return { prev: this.keyframes[i], next: this.keyframes[i + 1] };
      }
    }
    
    return null;
  }
  
  /**
   * Get interpolated state at specific time
   */
  getInterpolatedState(time: number): InterpolatedState | null {
    const surrounding = this.findSurroundingKeyframes(time);
    if (!surrounding) return null;
    
    const { prev, next } = surrounding;
    
    // Calculate progress
    const segmentDuration = next.time - prev.time;
    const progress = segmentDuration > 0 
      ? (time - prev.time) / segmentDuration 
      : 0;
    
    // Apply easing
    const easedProgress = applyEasing(progress, prev.easing);
    
    // Interpolate based on type
    return this.interpolate(prev, next, easedProgress);
  }
  
  /**
   * Interpolate between two keyframes
   */
  private interpolate(prev: Keyframe, next: Keyframe, t: number): InterpolatedState {
    switch (this.interpolationType) {
      case 'step':
        return {
          position: t < 1 ? prev.position : next.position,
          lookAt: t < 1 ? prev.lookAt : next.lookAt,
          fov: t < 1 ? prev.fov : next.fov,
        };
      
      case 'linear':
      default:
        return {
          position: lerpVec3(prev.position, next.position, t),
          lookAt: lerpVec3(prev.lookAt, next.lookAt, t),
          fov: lerp(prev.fov, next.fov, t),
        };
    }
  }
  
  /**
   * Set interpolation type
   */
  setInterpolationType(type: InterpolationType): void {
    this.interpolationType = type;
  }
  
  /**
   * Clear all keyframes
   */
  clear(): void {
    this.keyframes = [];
  }
  
  /**
   * Create a snapshot for serialization
   */
  createSnapshot(): KeyframeSnapshot {
    return {
      keyframes: [...this.keyframes],
      duration: this.getDuration(),
      interpolation: this.interpolationType,
    };
  }
  
  /**
   * Load from snapshot
   */
  loadSnapshot(snapshot: KeyframeSnapshot): void {
    this.keyframes = [...snapshot.keyframes].sort((a, b) => a.time - b.time);
    this.interpolationType = snapshot.interpolation;
  }
  
  /**
   * Create keyframe from current camera state
   */
  static createKeyframe(
    time: number,
    position: [number, number, number],
    lookAt: [number, number, number],
    fov: number = 75,
    easing: EasingType = 'easeInOut'
  ): Keyframe {
    return { time, position, lookAt, fov, easing };
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation for 3D vectors
 */
function lerpVec3(
  a: [number, number, number], 
  b: [number, number, number], 
  t: number
): [number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

/**
 * Apply easing function
 */
function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case 'linear':
      return t;
    case 'easeIn':
    case 'easeInQuad':
      return t * t;
    case 'easeOut':
    case 'easeOutQuad':
      return t * (2 - t);
    case 'easeInOut':
    case 'easeInOutQuad':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'easeInCubic':
      return t * t * t;
    case 'easeOutCubic':
      return (--t) * t * t + 1;
    case 'easeInOutCubic':
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    default:
      return t;
  }
}

// Export utility functions
export { lerp, lerpVec3, applyEasing };
