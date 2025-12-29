// ============================================================
// Immersa 3D - Auto Motion Module
// Keyframe-based camera animation system
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';

/**
 * Interpolation type for keyframes
 */
export type InterpolationType = 'linear' | 'bezier' | 'catmullRom' | 'step';

/**
 * Easing function type
 */
export type EasingType = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic';

/**
 * Keyframe data structure
 */
export interface Keyframe {
  /** Time in seconds */
  time: number;
  /** Camera position [x, y, z] */
  position: [number, number, number];
  /** Camera look-at target [x, y, z] */
  lookAt: [number, number, number];
  /** Field of view in degrees */
  fov: number;
  /** Easing to next keyframe */
  easing: EasingType;
}

/**
 * Motion path data
 */
export interface MotionPath {
  id: string;
  name: string;
  keyframes: Keyframe[];
  duration: number;
  interpolation: InterpolationType;
  loop: boolean;
}

/**
 * Auto Motion Module Configuration
 */
export interface AutoMotionConfig {
  /** Default playback speed multiplier */
  playbackSpeed: number;
  /** Enable looping by default */
  defaultLoop: boolean;
  /** Default interpolation type */
  defaultInterpolation: InterpolationType;
  /** Preview window size [width, height] */
  previewSize: [number, number];
  /** Enable motion blur during playback */
  enableMotionBlur: boolean;
  /** Keyframe snap threshold in seconds */
  snapThreshold: number;
}

/**
 * Auto Motion Module State
 */
export interface AutoMotionState {
  /** Currently active motion path */
  activePathId: string | null;
  /** Playback status */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Current applied preset name */
  currentPreset: string | null;
  /** Is timeline visible */
  timelineVisible: boolean;
  /** Is path editor active */
  pathEditorActive: boolean;
}

/**
 * Playback event payload
 */
interface PlaybackEventPayload {
  pathId: string;
  time: number;
  progress: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AutoMotionConfig = {
  playbackSpeed: 1.0,
  defaultLoop: false,
  defaultInterpolation: 'catmullRom',
  previewSize: [320, 180],
  enableMotionBlur: false,
  snapThreshold: 0.1,
};

/**
 * AutoMotionModule - Keyframe-based animation system
 * 
 * Responsibilities:
 * - Manage motion paths and keyframes
 * - Control playback timeline
 * - Provide path editing tools
 * - Support motion presets library
 */
export class AutoMotionModule implements ImmersaModule<AutoMotionConfig, AutoMotionState> {
  readonly id = 'auto-motion';
  readonly name = 'Auto Motion';
  readonly version = '1.0.0';
  readonly dependencies: string[] = ['camera-control'];
  
  state: ModuleState = 'unregistered';
  
  private config: AutoMotionConfig = { ...DEFAULT_CONFIG };
  
  private internalState: AutoMotionState = {
    activePathId: null,
    isPlaying: false,
    currentTime: 0,
    currentPreset: null,
    timelineVisible: false,
    pathEditorActive: false,
  };
  
  /** Registered motion paths */
  private paths: Map<string, MotionPath> = new Map();
  
  /** Animation frame ID for cleanup */
  private animationFrameId: number | null = null;
  
  /** Last frame timestamp */
  private lastFrameTime: number = 0;
  
  /**
   * Setup module resources
   */
  async setup(config?: AutoMotionConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Listen for events
    eventBus.on('motion:play', this.handlePlay);
    eventBus.on('motion:pause', this.handlePause);
    eventBus.on('motion:stop', this.handleStop);
    eventBus.on('motion:seek', this.handleSeek);
    
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
    this.stopPlayback();
    console.log(`[${this.id}] Deactivated`);
  }
  
  /**
   * Dispose all resources
   * CRITICAL: Must cleanup animation frame and event listeners
   */
  dispose(): void {
    console.log(`[${this.id}] Disposing...`);
    
    // Stop any active playback
    this.stopPlayback();
    
    // Remove event listeners
    eventBus.off('motion:play', this.handlePlay);
    eventBus.off('motion:pause', this.handlePause);
    eventBus.off('motion:stop', this.handleStop);
    eventBus.off('motion:seek', this.handleSeek);
    
    // Clear paths
    this.paths.clear();
    
    // Reset state
    this.internalState = {
      activePathId: null,
      isPlaying: false,
      currentTime: 0,
      currentPreset: null,
      timelineVisible: false,
      pathEditorActive: false,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): AutoMotionState {
    return { ...this.internalState };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): AutoMotionConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(partial: Partial<AutoMotionConfig>): void {
    this.config = { ...this.config, ...partial };
    eventBus.emit('motion:configChanged', { config: this.config });
  }
  
  // ============================================================
  // Path Management
  // ============================================================
  
  /**
   * Register a new motion path
   */
  registerPath(path: MotionPath): void {
    this.paths.set(path.id, path);
    eventBus.emit('motion:pathRegistered', { pathId: path.id });
  }
  
  /**
   * Get a motion path by ID
   */
  getPath(pathId: string): MotionPath | undefined {
    return this.paths.get(pathId);
  }
  
  /**
   * Get all registered paths
   */
  getAllPaths(): MotionPath[] {
    return Array.from(this.paths.values());
  }
  
  /**
   * Remove a motion path
   */
  removePath(pathId: string): boolean {
    if (this.internalState.activePathId === pathId) {
      this.stopPlayback();
    }
    const removed = this.paths.delete(pathId);
    if (removed) {
      eventBus.emit('motion:pathRemoved', { pathId });
    }
    return removed;
  }
  
  /**
   * Update an existing path
   */
  updatePath(pathId: string, updates: Partial<MotionPath>): boolean {
    const path = this.paths.get(pathId);
    if (!path) return false;
    
    this.paths.set(pathId, { ...path, ...updates });
    eventBus.emit('motion:pathUpdated', { pathId });
    return true;
  }
  
  // ============================================================
  // Keyframe Management
  // ============================================================
  
  /**
   * Add a keyframe to a path
   */
  addKeyframe(pathId: string, keyframe: Keyframe): boolean {
    const path = this.paths.get(pathId);
    if (!path) return false;
    
    // Insert keyframe in sorted order by time
    const keyframes = [...path.keyframes, keyframe].sort((a, b) => a.time - b.time);
    
    // Update duration if necessary
    const duration = Math.max(path.duration, keyframe.time);
    
    this.paths.set(pathId, { ...path, keyframes, duration });
    eventBus.emit('motion:keyframeAdded', { pathId, time: keyframe.time });
    return true;
  }
  
  /**
   * Remove a keyframe from a path
   */
  removeKeyframe(pathId: string, time: number): boolean {
    const path = this.paths.get(pathId);
    if (!path) return false;
    
    const threshold = this.config.snapThreshold;
    const keyframes = path.keyframes.filter(kf => Math.abs(kf.time - time) > threshold);
    
    if (keyframes.length === path.keyframes.length) return false;
    
    this.paths.set(pathId, { ...path, keyframes });
    eventBus.emit('motion:keyframeRemoved', { pathId, time });
    return true;
  }
  
  /**
   * Update a keyframe
   */
  updateKeyframe(pathId: string, time: number, updates: Partial<Keyframe>): boolean {
    const path = this.paths.get(pathId);
    if (!path) return false;
    
    const threshold = this.config.snapThreshold;
    const keyframes = path.keyframes.map(kf => 
      Math.abs(kf.time - time) <= threshold ? { ...kf, ...updates } : kf
    );
    
    this.paths.set(pathId, { ...path, keyframes });
    eventBus.emit('motion:keyframeUpdated', { pathId, time });
    return true;
  }
  
  // ============================================================
  // Playback Control
  // ============================================================
  
  /**
   * Start playback of a path
   */
  play(pathId?: string): void {
    const targetPathId = pathId ?? this.internalState.activePathId;
    if (!targetPathId) return;
    
    const path = this.paths.get(targetPathId);
    if (!path || path.keyframes.length < 2) return;
    
    this.internalState.activePathId = targetPathId;
    this.internalState.isPlaying = true;
    this.lastFrameTime = performance.now();
    
    this.startPlaybackLoop();
    
    eventBus.emit('motion:playbackStarted', { pathId: targetPathId });
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    this.internalState.isPlaying = false;
    this.stopPlaybackLoop();
    
    if (this.internalState.activePathId) {
      eventBus.emit('motion:playbackPaused', { 
        pathId: this.internalState.activePathId,
        time: this.internalState.currentTime 
      });
    }
  }
  
  /**
   * Stop playback and reset time
   */
  stop(): void {
    const pathId = this.internalState.activePathId;
    
    this.internalState.isPlaying = false;
    this.internalState.currentTime = 0;
    this.stopPlaybackLoop();
    
    if (pathId) {
      eventBus.emit('motion:playbackStopped', { pathId });
    }
  }
  
  /**
   * Seek to a specific time
   */
  seek(time: number): void {
    const pathId = this.internalState.activePathId;
    if (!pathId) return;
    
    const path = this.paths.get(pathId);
    if (!path) return;
    
    this.internalState.currentTime = Math.max(0, Math.min(time, path.duration));
    
    // Apply the interpolated camera state at this time
    this.applyTimeState(pathId, this.internalState.currentTime);
    
    eventBus.emit('motion:seeked', { 
      pathId, 
      time: this.internalState.currentTime 
    });
  }
  
  /**
   * Toggle timeline visibility
   */
  toggleTimeline(): void {
    this.internalState.timelineVisible = !this.internalState.timelineVisible;
    eventBus.emit('motion:timelineToggled', { 
      visible: this.internalState.timelineVisible 
    });
  }
  
  /**
   * Toggle path editor
   */
  togglePathEditor(): void {
    this.internalState.pathEditorActive = !this.internalState.pathEditorActive;
    eventBus.emit('motion:pathEditorToggled', { 
      active: this.internalState.pathEditorActive 
    });
  }
  
  // ============================================================
  // Private Methods
  // ============================================================
  
  /**
   * Start the playback animation loop
   */
  private startPlaybackLoop(): void {
    const loop = (timestamp: number) => {
      if (!this.internalState.isPlaying) return;
      
      const deltaTime = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      
      const pathId = this.internalState.activePathId;
      if (!pathId) return;
      
      const path = this.paths.get(pathId);
      if (!path) return;
      
      // Update current time
      this.internalState.currentTime += deltaTime * this.config.playbackSpeed;
      
      // Handle loop or end
      if (this.internalState.currentTime >= path.duration) {
        if (path.loop || this.config.defaultLoop) {
          this.internalState.currentTime = this.internalState.currentTime % path.duration;
        } else {
          this.internalState.currentTime = path.duration;
          this.stop();
          eventBus.emit('motion:playbackCompleted', { pathId });
          return;
        }
      }
      
      // Apply interpolated state
      this.applyTimeState(pathId, this.internalState.currentTime);
      
      // Emit progress event
      const progress = this.internalState.currentTime / path.duration;
      eventBus.emit('motion:playbackProgress', { 
        pathId, 
        time: this.internalState.currentTime,
        progress 
      } as PlaybackEventPayload);
      
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    this.animationFrameId = requestAnimationFrame(loop);
  }
  
  /**
   * Stop the playback animation loop
   */
  private stopPlaybackLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Stop all playback
   */
  private stopPlayback(): void {
    this.internalState.isPlaying = false;
    this.stopPlaybackLoop();
  }
  
  /**
   * Apply the camera state at a specific time
   */
  private applyTimeState(pathId: string, time: number): void {
    const path = this.paths.get(pathId);
    if (!path || path.keyframes.length < 2) return;
    
    // Find surrounding keyframes
    let prevKf = path.keyframes[0];
    let nextKf = path.keyframes[path.keyframes.length - 1];
    
    for (let i = 0; i < path.keyframes.length - 1; i++) {
      if (time >= path.keyframes[i].time && time <= path.keyframes[i + 1].time) {
        prevKf = path.keyframes[i];
        nextKf = path.keyframes[i + 1];
        break;
      }
    }
    
    // Calculate interpolation factor
    const segmentDuration = nextKf.time - prevKf.time;
    const segmentProgress = segmentDuration > 0 
      ? (time - prevKf.time) / segmentDuration 
      : 0;
    
    // Apply easing
    const easedProgress = this.applyEasing(segmentProgress, prevKf.easing);
    
    // Interpolate values
    const position: [number, number, number] = [
      prevKf.position[0] + (nextKf.position[0] - prevKf.position[0]) * easedProgress,
      prevKf.position[1] + (nextKf.position[1] - prevKf.position[1]) * easedProgress,
      prevKf.position[2] + (nextKf.position[2] - prevKf.position[2]) * easedProgress,
    ];
    
    const lookAt: [number, number, number] = [
      prevKf.lookAt[0] + (nextKf.lookAt[0] - prevKf.lookAt[0]) * easedProgress,
      prevKf.lookAt[1] + (nextKf.lookAt[1] - prevKf.lookAt[1]) * easedProgress,
      prevKf.lookAt[2] + (nextKf.lookAt[2] - prevKf.lookAt[2]) * easedProgress,
    ];
    
    const fov = prevKf.fov + (nextKf.fov - prevKf.fov) * easedProgress;
    
    // Emit camera update event
    eventBus.emit('camera:transitionRequest', {
      position,
      lookAt,
      duration: 0, // Immediate update
    });
    
    eventBus.emit('motion:stateApplied', { position, lookAt, fov });
  }
  
  /**
   * Apply easing function to progress value
   */
  private applyEasing(t: number, easing: EasingType): number {
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
  
  // ============================================================
  // Event Handlers
  // ============================================================
  
  private handlePlay = (payload: { pathId?: string } | undefined): void => {
    this.play(payload?.pathId);
  };
  
  private handlePause = (): void => {
    this.pause();
  };
  
  private handleStop = (): void => {
    this.stop();
  };
  
  private handleSeek = (payload: { time: number }): void => {
    this.seek(payload.time);
  };
}

// Singleton instance
export const autoMotionModule = new AutoMotionModule();
