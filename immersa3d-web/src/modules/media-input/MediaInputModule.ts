// ============================================================
// Immersa 3D - Media Input Module
// Main module entry for media handling
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';

/**
 * Media Input Module Configuration
 */
export interface MediaInputConfig {
  maxFileSize: number;
  maxImageSize: number;
  supportedFormats: string[];
}

/**
 * Media Input Module State
 */
export interface MediaInputState {
  hasMedia: boolean;
  currentMediaId: string | null;
}

/**
 * MediaInputModule - Media upload and processing
 */
export class MediaInputModule implements ImmersaModule<MediaInputConfig, MediaInputState> {
  readonly id = 'media-input';
  readonly name = 'Media Input';
  readonly version = '1.0.0';
  readonly dependencies: string[] = [];
  
  state: ModuleState = 'unregistered';
  
  private config: MediaInputConfig = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxImageSize: 4096,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff'],
  };
  
  private internalState: MediaInputState = {
    hasMedia: false,
    currentMediaId: null,
  };
  
  /**
   * Setup module resources
   */
  async setup(config?: MediaInputConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
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
   */
  dispose(): void {
    console.log(`[${this.id}] Disposing...`);
    
    this.internalState = {
      hasMedia: false,
      currentMediaId: null,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): MediaInputState {
    return { ...this.internalState };
  }
  
  /**
   * Get configuration
   */
  getConfig(): MediaInputConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const mediaInputModule = new MediaInputModule();
