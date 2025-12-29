// ============================================================
// Immersa 3D - Device Adapter
// Automatic device detection and interaction adaptation
// ============================================================

import type { DeviceType, ParallaxInputSource } from '../Naked3DModule';

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  /** Device type */
  type: DeviceType;
  /** Has touch support */
  hasTouch: boolean;
  /** Has gyroscope */
  hasGyroscope: boolean;
  /** Has accelerometer */
  hasAccelerometer: boolean;
  /** Supports WebGPU */
  hasWebGPU: boolean;
  /** Screen pixel ratio */
  pixelRatio: number;
  /** Screen size */
  screenSize: { width: number; height: number };
  /** Is portrait orientation */
  isPortrait: boolean;
}

/**
 * Recommended settings based on device
 */
export interface DeviceRecommendations {
  /** Recommended input source */
  inputSource: ParallaxInputSource;
  /** Recommended parallax intensity */
  intensity: number;
  /** Recommended smoothing */
  smoothing: number;
  /** Recommended layer count */
  layerCount: number;
  /** Should reduce quality for performance */
  reduceQuality: boolean;
}

/**
 * Device Adapter Class
 * Detects device capabilities and provides recommendations
 */
export class DeviceAdapter {
  private capabilities: DeviceCapabilities | null = null;
  
  /**
   * Detect device capabilities
   */
  async detect(): Promise<DeviceCapabilities> {
    const ua = navigator.userAgent.toLowerCase();
    
    // Detect device type
    let type: DeviceType = 'desktop';
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      type = 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      type = 'tablet';
    }
    
    // Detect touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detect gyroscope
    const hasGyroscope = await this.checkGyroscope();
    
    // Detect accelerometer
    const hasAccelerometer = 'DeviceMotionEvent' in window;
    
    // Detect WebGPU
    const hasWebGPU = 'gpu' in navigator;
    
    this.capabilities = {
      type,
      hasTouch,
      hasGyroscope,
      hasAccelerometer,
      hasWebGPU,
      pixelRatio: window.devicePixelRatio || 1,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      isPortrait: window.innerHeight > window.innerWidth,
    };
    
    return this.capabilities;
  }
  
  /**
   * Get cached capabilities or detect
   */
  async getCapabilities(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }
    return this.detect();
  }
  
  /**
   * Get recommendations based on device
   */
  async getRecommendations(): Promise<DeviceRecommendations> {
    const caps = await this.getCapabilities();
    
    // Mobile with gyroscope
    if (caps.type === 'mobile' && caps.hasGyroscope) {
      return {
        inputSource: 'gyroscope',
        intensity: 0.8,
        smoothing: 0.15,
        layerCount: 2, // Reduce for performance
        reduceQuality: !caps.hasWebGPU,
      };
    }
    
    // Tablet with gyroscope
    if (caps.type === 'tablet' && caps.hasGyroscope) {
      return {
        inputSource: 'gyroscope',
        intensity: 1.0,
        smoothing: 0.12,
        layerCount: 3,
        reduceQuality: !caps.hasWebGPU,
      };
    }
    
    // Mobile without gyroscope (touch only)
    if (caps.type === 'mobile' && !caps.hasGyroscope) {
      return {
        inputSource: 'manual',
        intensity: 1.0,
        smoothing: 0.1,
        layerCount: 2,
        reduceQuality: true,
      };
    }
    
    // Desktop
    return {
      inputSource: 'mouse',
      intensity: 1.0,
      smoothing: 0.1,
      layerCount: 4,
      reduceQuality: false,
    };
  }
  
  /**
   * Check if gyroscope is available
   */
  private async checkGyroscope(): Promise<boolean> {
    if (typeof DeviceOrientationEvent === 'undefined') {
      return false;
    }
    
    // Check for iOS permission API
    const DeviceOrientation = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    
    if (typeof DeviceOrientation.requestPermission === 'function') {
      // Has permission API, gyroscope exists but may need permission
      return true;
    }
    
    // Check for actual support
    return 'DeviceOrientationEvent' in window;
  }
  
  /**
   * Listen for orientation changes
   */
  onOrientationChange(callback: (isPortrait: boolean) => void): () => void {
    const handler = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      if (this.capabilities) {
        this.capabilities.isPortrait = isPortrait;
        this.capabilities.screenSize = {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }
      callback(isPortrait);
    };
    
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }
  
  /**
   * Get performance tier (low, medium, high)
   */
  async getPerformanceTier(): Promise<'low' | 'medium' | 'high'> {
    const caps = await this.getCapabilities();
    
    // High: Desktop with WebGPU or high DPI
    if (caps.type === 'desktop' && (caps.hasWebGPU || caps.pixelRatio >= 2)) {
      return 'high';
    }
    
    // Medium: Tablet or desktop without WebGPU
    if (caps.type === 'tablet' || caps.type === 'desktop') {
      return 'medium';
    }
    
    // Low: Mobile
    return 'low';
  }
}

// Singleton instance
let adapterInstance: DeviceAdapter | null = null;

/**
 * Get device adapter instance
 */
export function getDeviceAdapter(): DeviceAdapter {
  if (!adapterInstance) {
    adapterInstance = new DeviceAdapter();
  }
  return adapterInstance;
}

/**
 * Convenience function to detect device
 */
export async function detectDevice(): Promise<DeviceCapabilities> {
  return getDeviceAdapter().detect();
}

/**
 * Convenience function to get recommendations
 */
export async function getDeviceRecommendations(): Promise<DeviceRecommendations> {
  return getDeviceAdapter().getRecommendations();
}
