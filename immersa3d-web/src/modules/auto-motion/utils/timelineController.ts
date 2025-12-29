// ============================================================
// Immersa 3D - Timeline Controller
// requestAnimationFrame-based global timeline
// ============================================================

import { eventBus } from '../../../core/events';

/**
 * Timeline state
 */
export type TimelineState = 'idle' | 'playing' | 'paused';

/**
 * Timeline event callback
 */
export type TimelineCallback = (time: number, deltaTime: number) => void;

/**
 * Timeline subscription
 */
interface TimelineSubscription {
  id: string;
  callback: TimelineCallback;
  priority: number;
}

/**
 * Timeline Controller
 * Provides a global animation timeline driven by requestAnimationFrame
 */
export class TimelineController {
  private state: TimelineState = 'idle';
  private currentTime: number = 0;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private duration: number = Infinity;
  private loop: boolean = false;
  private speed: number = 1.0;
  
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  
  private subscriptions: TimelineSubscription[] = [];
  private nextSubscriptionId: number = 0;
  
  /**
   * Create a new timeline controller
   */
  constructor(duration?: number, loop?: boolean) {
    if (duration !== undefined) this.duration = duration;
    if (loop !== undefined) this.loop = loop;
  }
  
  /**
   * Get current timeline state
   */
  getState(): TimelineState {
    return this.state;
  }
  
  /**
   * Get current time
   */
  getCurrentTime(): number {
    return this.currentTime;
  }
  
  /**
   * Get duration
   */
  getDuration(): number {
    return this.duration;
  }
  
  /**
   * Get progress (0-1)
   */
  getProgress(): number {
    if (this.duration === Infinity || this.duration === 0) return 0;
    return this.currentTime / this.duration;
  }
  
  /**
   * Set duration
   */
  setDuration(duration: number): void {
    this.duration = Math.max(0, duration);
  }
  
  /**
   * Set loop mode
   */
  setLoop(loop: boolean): void {
    this.loop = loop;
  }
  
  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed));
  }
  
  /**
   * Get playback speed
   */
  getSpeed(): number {
    return this.speed;
  }
  
  /**
   * Start or resume playback
   */
  play(): void {
    if (this.state === 'playing') return;
    
    if (this.state === 'paused') {
      // Resume from paused position
      this.startTime = performance.now() - this.pausedTime;
    } else {
      // Start fresh
      this.startTime = performance.now();
      this.currentTime = 0;
    }
    
    this.state = 'playing';
    this.lastFrameTime = performance.now();
    this.startLoop();
    
    eventBus.emit('timeline:play', { time: this.currentTime });
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    if (this.state !== 'playing') return;
    
    this.state = 'paused';
    this.pausedTime = performance.now() - this.startTime;
    this.stopLoop();
    
    eventBus.emit('timeline:pause', { time: this.currentTime });
  }
  
  /**
   * Stop and reset
   */
  stop(): void {
    this.state = 'idle';
    this.currentTime = 0;
    this.pausedTime = 0;
    this.stopLoop();
    
    eventBus.emit('timeline:stop', { time: 0 });
  }
  
  /**
   * Seek to specific time
   */
  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.duration));
    
    if (this.state === 'playing') {
      this.startTime = performance.now() - this.currentTime * 1000;
    } else {
      this.pausedTime = this.currentTime * 1000;
    }
    
    // Notify subscribers of the seek
    this.notifySubscribers(0);
    
    eventBus.emit('timeline:seek', { time: this.currentTime });
  }
  
  /**
   * Subscribe to timeline updates
   */
  subscribe(callback: TimelineCallback, priority: number = 0): string {
    const id = `sub_${this.nextSubscriptionId++}`;
    this.subscriptions.push({ id, callback, priority });
    this.subscriptions.sort((a, b) => b.priority - a.priority);
    return id;
  }
  
  /**
   * Unsubscribe from timeline updates
   */
  unsubscribe(id: string): boolean {
    const index = this.subscriptions.findIndex(sub => sub.id === id);
    if (index !== -1) {
      this.subscriptions.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Clear all subscriptions
   */
  clearSubscriptions(): void {
    this.subscriptions = [];
  }
  
  /**
   * Dispose the controller
   */
  dispose(): void {
    this.stop();
    this.clearSubscriptions();
  }
  
  // ============================================================
  // Private Methods
  // ============================================================
  
  /**
   * Start the animation loop
   */
  private startLoop(): void {
    const loop = (timestamp: number) => {
      if (this.state !== 'playing') return;
      
      const deltaTime = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      
      // Update current time
      this.currentTime += deltaTime * this.speed;
      
      // Handle loop or completion
      if (this.currentTime >= this.duration) {
        if (this.loop) {
          this.currentTime = this.currentTime % this.duration;
        } else {
          this.currentTime = this.duration;
          this.notifySubscribers(deltaTime);
          this.stop();
          eventBus.emit('timeline:complete', { time: this.currentTime });
          return;
        }
      }
      
      // Notify all subscribers
      this.notifySubscribers(deltaTime);
      
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    this.animationFrameId = requestAnimationFrame(loop);
  }
  
  /**
   * Stop the animation loop
   */
  private stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Notify all subscribers of a time update
   */
  private notifySubscribers(deltaTime: number): void {
    for (const subscription of this.subscriptions) {
      try {
        subscription.callback(this.currentTime, deltaTime);
      } catch (error) {
        console.error(`[TimelineController] Error in subscription ${subscription.id}:`, error);
      }
    }
  }
}

// ============================================================
// Global Timeline Instance
// ============================================================

/**
 * Default global timeline instance
 */
export const globalTimeline = new TimelineController();

/**
 * Create a new scoped timeline
 */
export function createTimeline(duration?: number, loop?: boolean): TimelineController {
  return new TimelineController(duration, loop);
}
