// ============================================================
// Immersa 3D - Smooth Transitioner Utility
// GSAP-powered camera transitions
// ============================================================

import gsap from 'gsap';
import * as THREE from 'three';
import { eventBus } from '../../../core/events';

/**
 * Transition options
 */
export interface TransitionOptions {
  duration?: number;
  ease?: string;
  onStart?: () => void;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

/**
 * Camera transition state
 */
interface TransitionState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
}

// Reusable objects (Object Pooling)
const START_POS = new THREE.Vector3();
const END_POS = new THREE.Vector3();
const START_TARGET = new THREE.Vector3();
const END_TARGET = new THREE.Vector3();
const START_QUAT = new THREE.Quaternion();
const END_QUAT = new THREE.Quaternion();
const TEMP_QUAT = new THREE.Quaternion();

/**
 * SmoothTransitioner - GSAP-powered camera transitions
 * 
 * Provides smooth interpolation between camera states
 * using GSAP for professional-grade easing.
 */
export class SmoothTransitioner {
  private camera: THREE.Camera | null = null;
  private currentTween: gsap.core.Tween | null = null;
  private isTransitioning = false;
  
  /**
   * Bind to a camera
   */
  bind(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  /**
   * Unbind from camera
   */
  unbind(): void {
    this.cancel();
    this.camera = null;
  }
  
  /**
   * Check if currently transitioning
   */
  get transitioning(): boolean {
    return this.isTransitioning;
  }
  
  /**
   * Transition camera position
   */
  transitionPosition(
    targetPosition: THREE.Vector3 | [number, number, number],
    options: TransitionOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.camera) {
        reject(new Error('No camera bound'));
        return;
      }
      
      // Cancel any existing transition
      this.cancel();
      
      const {
        duration = 1.0,
        ease = 'power2.inOut',
        onStart,
        onComplete,
        onUpdate,
      } = options;
      
      // Resolve target position
      if (Array.isArray(targetPosition)) {
        END_POS.set(targetPosition[0], targetPosition[1], targetPosition[2]);
      } else {
        END_POS.copy(targetPosition);
      }
      
      // Store start position
      START_POS.copy(this.camera.position);
      
      this.isTransitioning = true;
      eventBus.emit('camera:transitionStart', {});
      onStart?.();
      
      // Animate
      const proxy = { t: 0 };
      
      this.currentTween = gsap.to(proxy, {
        t: 1,
        duration,
        ease,
        onUpdate: () => {
          if (!this.camera) return;
          
          this.camera.position.lerpVectors(START_POS, END_POS, proxy.t);
          onUpdate?.(proxy.t);
        },
        onComplete: () => {
          this.isTransitioning = false;
          this.currentTween = null;
          eventBus.emit('camera:transitionEnd', {});
          onComplete?.();
          resolve();
        },
      });
    });
  }
  
  /**
   * Transition camera to look at target
   */
  transitionLookAt(
    targetPosition: THREE.Vector3 | [number, number, number],
    lookAtTarget: THREE.Vector3 | [number, number, number],
    options: TransitionOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.camera) {
        reject(new Error('No camera bound'));
        return;
      }
      
      this.cancel();
      
      const {
        duration = 1.0,
        ease = 'power2.inOut',
        onStart,
        onComplete,
        onUpdate,
      } = options;
      
      // Resolve positions
      if (Array.isArray(targetPosition)) {
        END_POS.set(targetPosition[0], targetPosition[1], targetPosition[2]);
      } else {
        END_POS.copy(targetPosition);
      }
      
      if (Array.isArray(lookAtTarget)) {
        END_TARGET.set(lookAtTarget[0], lookAtTarget[1], lookAtTarget[2]);
      } else {
        END_TARGET.copy(lookAtTarget);
      }
      
      // Store start state
      START_POS.copy(this.camera.position);
      START_QUAT.copy(this.camera.quaternion);
      
      // Calculate end quaternion
      const tempCamera = this.camera.clone();
      tempCamera.position.copy(END_POS);
      tempCamera.lookAt(END_TARGET);
      END_QUAT.copy(tempCamera.quaternion);
      
      this.isTransitioning = true;
      eventBus.emit('camera:transitionStart', {});
      onStart?.();
      
      const proxy = { t: 0 };
      
      this.currentTween = gsap.to(proxy, {
        t: 1,
        duration,
        ease,
        onUpdate: () => {
          if (!this.camera) return;
          
          // Lerp position
          this.camera.position.lerpVectors(START_POS, END_POS, proxy.t);
          
          // Slerp quaternion
          TEMP_QUAT.slerpQuaternions(START_QUAT, END_QUAT, proxy.t);
          this.camera.quaternion.copy(TEMP_QUAT);
          
          onUpdate?.(proxy.t);
        },
        onComplete: () => {
          this.isTransitioning = false;
          this.currentTween = null;
          eventBus.emit('camera:transitionEnd', {});
          onComplete?.();
          resolve();
        },
      });
    });
  }
  
  /**
   * Transition using keyframe states
   */
  transitionKeyframes(
    keyframes: TransitionState[],
    options: TransitionOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.camera || keyframes.length < 2) {
        reject(new Error('Invalid keyframes or no camera'));
        return;
      }
      
      this.cancel();
      
      const {
        duration = 2.0,
        ease = 'power1.inOut',
        onStart,
        onComplete,
        onUpdate,
      } = options;
      
      this.isTransitioning = true;
      eventBus.emit('camera:transitionStart', {});
      onStart?.();
      
      // Create timeline
      const timeline = gsap.timeline({
        onComplete: () => {
          this.isTransitioning = false;
          this.currentTween = null;
          eventBus.emit('camera:transitionEnd', {});
          onComplete?.();
          resolve();
        },
      });
      
      const segmentDuration = duration / (keyframes.length - 1);
      
      keyframes.forEach((kf, index) => {
        if (index === 0) {
          // Set initial state
          this.camera!.position.set(kf.position.x, kf.position.y, kf.position.z);
          return;
        }
        
        timeline.to(this.camera!.position, {
          x: kf.position.x,
          y: kf.position.y,
          z: kf.position.z,
          duration: segmentDuration,
          ease,
          onUpdate: () => onUpdate?.(timeline.progress()),
        }, `+=${index === 1 ? 0 : segmentDuration}`);
      });
      
      this.currentTween = timeline as unknown as gsap.core.Tween;
    });
  }
  
  /**
   * Cancel current transition
   */
  cancel(): void {
    if (this.currentTween) {
      this.currentTween.kill();
      this.currentTween = null;
      this.isTransitioning = false;
      eventBus.emit('camera:transitionEnd', {});
    }
  }
}

// Singleton instance
export const smoothTransitioner = new SmoothTransitioner();
