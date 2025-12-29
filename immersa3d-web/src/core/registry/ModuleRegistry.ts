// ============================================================
// Immersa 3D - Module Registry
// Central module registration and lifecycle management
// ============================================================

import type { ImmersaModule, ModuleRegistration } from './types';
import { eventBus } from '../events/EventBus';

/**
 * ModuleRegistry - Plugin-style module registration center
 * Supports hot-plugging of modules
 */
class ModuleRegistry {
  private modules: Map<string, ModuleRegistration> = new Map();
  private initializationOrder: string[] = [];

  /**
   * Register a new module
   */
  async register(module: ImmersaModule): Promise<void> {
    if (this.modules.has(module.id)) {
      console.warn(`[Registry] Module "${module.id}" is already registered`);
      return;
    }

    // Check dependencies
    for (const depId of module.dependencies) {
      if (!this.modules.has(depId)) {
        throw new Error(
          `[Registry] Module "${module.id}" depends on "${depId}" which is not registered`
        );
      }
    }

    // Register the module
    this.modules.set(module.id, {
      module,
      registeredAt: Date.now(),
    });
    
    module.state = 'registered';
    this.initializationOrder.push(module.id);

    eventBus.emit('module:registered', { moduleId: module.id });
    console.log(`[Registry] Module "${module.id}" registered`);
  }

  /**
   * Initialize and activate a module
   */
  async activate(moduleId: string, config?: unknown): Promise<void> {
    const registration = this.modules.get(moduleId);
    if (!registration) {
      throw new Error(`[Registry] Module "${moduleId}" is not registered`);
    }

    const { module } = registration;

    try {
      // Initialize if not already done
      if (module.state === 'registered') {
        await module.setup(config);
        module.state = 'initialized';
      }

      // Activate
      module.activate();
      module.state = 'active';
      registration.activatedAt = Date.now();

      eventBus.emit('module:activated', { moduleId });
      console.log(`[Registry] Module "${moduleId}" activated`);
    } catch (error) {
      eventBus.emit('module:error', { 
        moduleId, 
        error: error instanceof Error ? error : new Error(String(error)) 
      });
      throw error;
    }
  }

  /**
   * Deactivate a module (pause without disposing)
   */
  deactivate(moduleId: string): void {
    const registration = this.modules.get(moduleId);
    if (!registration) {
      console.warn(`[Registry] Module "${moduleId}" is not registered`);
      return;
    }

    registration.module.deactivate();
    registration.module.state = 'initialized';
    
    eventBus.emit('module:deactivated', { moduleId });
    console.log(`[Registry] Module "${moduleId}" deactivated`);
  }

  /**
   * Dispose and unregister a module
   * CRITICAL: Releases GPU memory
   */
  dispose(moduleId: string): void {
    const registration = this.modules.get(moduleId);
    if (!registration) {
      console.warn(`[Registry] Module "${moduleId}" is not registered`);
      return;
    }

    // Check if other modules depend on this one
    for (const [id, reg] of this.modules) {
      if (reg.module.dependencies.includes(moduleId) && reg.module.state !== 'disposed') {
        throw new Error(
          `[Registry] Cannot dispose "${moduleId}": module "${id}" depends on it`
        );
      }
    }

    registration.module.dispose();
    registration.module.state = 'disposed';
    this.modules.delete(moduleId);
    this.initializationOrder = this.initializationOrder.filter(id => id !== moduleId);

    eventBus.emit('module:disposed', { moduleId });
    console.log(`[Registry] Module "${moduleId}" disposed`);
  }

  /**
   * Get a registered module by ID
   */
  get<T extends ImmersaModule>(moduleId: string): T | undefined {
    return this.modules.get(moduleId)?.module as T | undefined;
  }

  /**
   * Check if a module is registered
   */
  has(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Get all registered module IDs
   */
  getModuleIds(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Dispose all modules in reverse order
   */
  disposeAll(): void {
    console.log('[Registry] Disposing all modules...');
    
    // Dispose in reverse order of initialization
    const reversed = [...this.initializationOrder].reverse();
    for (const moduleId of reversed) {
      try {
        this.dispose(moduleId);
      } catch (error) {
        console.error(`[Registry] Error disposing "${moduleId}":`, error);
      }
    }
  }
}

// Singleton export
export const moduleRegistry = new ModuleRegistry();
