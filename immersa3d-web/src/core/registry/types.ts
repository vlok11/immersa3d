// ============================================================
// Immersa 3D - Module Registry Types
// Module interface and lifecycle definitions
// ============================================================

/**
 * Module lifecycle states
 */
export type ModuleState = 'unregistered' | 'registered' | 'initialized' | 'active' | 'disposed';

/**
 * Base interface for all Immersa modules
 * Every module must implement this interface
 */
export interface ImmersaModule<TConfig = unknown, TState = unknown> {
  /** Unique module identifier */
  readonly id: string;
  
  /** Human-readable module name */
  readonly name: string;
  
  /** Module version */
  readonly version: string;
  
  /** Module dependencies (other module IDs) */
  readonly dependencies: string[];
  
  /** Current module state */
  state: ModuleState;
  
  /**
   * Initialize module resources (Geometry, Texture, Shader)
   * Called when module is first registered
   */
  setup(config?: TConfig): Promise<void>;
  
  /**
   * Activate the module for use
   * Called after setup completes
   */
  activate(): void;
  
  /**
   * Deactivate the module (pause operations)
   */
  deactivate(): void;
  
  /**
   * Dispose all resources and release GPU memory
   * CRITICAL: Must properly cleanup to prevent memory leaks
   */
  dispose(): void;
  
  /**
   * Get current internal state (for debugging/persistence)
   */
  getState(): TState;
}

/**
 * Module constructor type
 */
export type ModuleConstructor<T extends ImmersaModule = ImmersaModule> = new () => T;

/**
 * Module registration info
 */
export interface ModuleRegistration {
  module: ImmersaModule;
  registeredAt: number;
  activatedAt?: number;
}

/**
 * Registry events
 */
export interface RegistryEvents {
  'module:registered': { moduleId: string };
  'module:activated': { moduleId: string };
  'module:deactivated': { moduleId: string };
  'module:disposed': { moduleId: string };
  'module:error': { moduleId: string; error: Error };
}
