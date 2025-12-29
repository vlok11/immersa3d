// ============================================================
// Immersa 3D - AI Analysis Module
// Main module entry for AI-powered analysis
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { renderContext } from '../../core/context';

/**
 * AI Analysis Module Configuration
 */
export interface AIAnalysisConfig {
  useWebGPU: boolean;
  enableDepth: boolean;
  enableSegmentation: boolean;
  enableDetection: boolean;
}

/**
 * AI Analysis Module State
 */
export interface AIAnalysisState {
  modelsLoaded: string[];
  currentTask: string | null;
}

/**
 * AIAnalysisModule - AI inference and analysis
 */
export class AIAnalysisModule implements ImmersaModule<AIAnalysisConfig, AIAnalysisState> {
  readonly id = 'ai-analysis';
  readonly name = 'AI Analysis';
  readonly version = '1.0.0';
  readonly dependencies: string[] = [];
  
  state: ModuleState = 'unregistered';
  
  private config: AIAnalysisConfig = {
    useWebGPU: true,
    enableDepth: true,
    enableSegmentation: false,
    enableDetection: false,
  };
  
  private internalState: AIAnalysisState = {
    modelsLoaded: [],
    currentTask: null,
  };
  
  /**
   * Setup module resources
   */
  async setup(config?: AIAnalysisConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Auto-detect WebGPU availability
    if (this.config.useWebGPU && !renderContext.isWebGPUAvailable) {
      console.warn(`[${this.id}] WebGPU not available, falling back to WASM`);
      this.config.useWebGPU = false;
    }
    
    console.log(`[${this.id}] Setup complete (WebGPU: ${this.config.useWebGPU})`);
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
      modelsLoaded: [],
      currentTask: null,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): AIAnalysisState {
    return { ...this.internalState };
  }
  
  /**
   * Check if WebGPU is enabled
   */
  isWebGPUEnabled(): boolean {
    return this.config.useWebGPU;
  }
}

// Singleton instance
export const aiAnalysisModule = new AIAnalysisModule();
