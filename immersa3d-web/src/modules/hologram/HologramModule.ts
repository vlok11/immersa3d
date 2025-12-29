// ============================================================
// Immersa 3D - Hologram Module
// Pseudo-holographic display adapter
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';

/**
 * Hologram display type
 */
export type HologramDisplayType = 'pyramid' | 'multiface' | 'peppersGhost';

/**
 * Layout mode for multi-view rendering
 */
export type LayoutMode = 'grid' | 'stripe' | 'radial';

/**
 * Hologram Module Configuration
 */
export interface HologramConfig {
  /** Display type */
  displayType: HologramDisplayType;
  /** Number of views/faces (3, 4, or 8 for multiface) */
  viewCount: number;
  /** Output resolution per view */
  viewResolution: [number, number];
  /** Background color (usually black for hologram) */
  backgroundColor: string;
  /** Background opacity (0 for transparent) */
  backgroundOpacity: number;
  /** View margin in pixels */
  viewMargin: number;
  /** Layout mode for combining views */
  layoutMode: LayoutMode;
  /** Enable glow effect for Pepper's Ghost */
  enableGlow: boolean;
  /** Glow intensity */
  glowIntensity: number;
  /** Auto-rotate views */
  autoRotate: boolean;
  /** Rotation speed (degrees per second) */
  rotationSpeed: number;
}

/**
 * Hologram Module State
 */
export interface HologramState {
  /** Is rendering active */
  isRendering: boolean;
  /** Current view angles */
  viewAngles: number[];
  /** Is encoding video */
  isEncoding: boolean;
  /** Encoding progress (0-1) */
  encodingProgress: number;
  /** Current layout info */
  layoutInfo: {
    totalWidth: number;
    totalHeight: number;
    viewPositions: Array<{ x: number; y: number }>;
  } | null;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: HologramConfig = {
  displayType: 'pyramid',
  viewCount: 4,
  viewResolution: [512, 512],
  backgroundColor: '#000000',
  backgroundOpacity: 0,
  viewMargin: 0,
  layoutMode: 'grid',
  enableGlow: true,
  glowIntensity: 0.5,
  autoRotate: true,
  rotationSpeed: 30,
};

/**
 * HologramModule - Pseudo-holographic display generation
 * 
 * Responsibilities:
 * - Generate multi-angle views for hologram displays
 * - Support pyramid (4-face), multi-face (3/4/8), and Pepper's Ghost
 * - Encode combined output as video
 * - Manage view layout and composition
 */
export class HologramModule implements ImmersaModule<HologramConfig, HologramState> {
  readonly id = 'hologram';
  readonly name = 'Hologram';
  readonly version = '1.0.0';
  readonly dependencies: string[] = ['projection-3d', 'camera-control'];
  
  state: ModuleState = 'unregistered';
  
  private config: HologramConfig = { ...DEFAULT_CONFIG };
  
  private internalState: HologramState = {
    isRendering: false,
    viewAngles: [],
    isEncoding: false,
    encodingProgress: 0,
    layoutInfo: null,
  };
  
  /** Animation frame ID */
  private animationFrameId: number | null = null;
  
  /** Current rotation angle */
  private currentRotation: number = 0;
  
  /** Last frame time */
  private lastFrameTime: number = 0;
  
  /**
   * Setup module resources
   */
  async setup(config?: HologramConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Calculate initial view angles
    this.calculateViewAngles();
    
    // Calculate layout
    this.calculateLayout();
    
    // Listen for events
    eventBus.on('hologram:setDisplayType', this.handleSetDisplayType);
    eventBus.on('hologram:setViewCount', this.handleSetViewCount);
    eventBus.on('hologram:startEncoding', this.handleStartEncoding);
    eventBus.on('hologram:stopEncoding', this.handleStopEncoding);
    
    console.log(`[${this.id}] Setup complete (Type: ${this.config.displayType})`);
  }
  
  /**
   * Activate the module
   */
  activate(): void {
    this.internalState.isRendering = true;
    
    if (this.config.autoRotate) {
      this.startRotation();
    }
    
    console.log(`[${this.id}] Activated`);
    eventBus.emit('hologram:activated', {});
  }
  
  /**
   * Deactivate the module
   */
  deactivate(): void {
    this.internalState.isRendering = false;
    this.stopRotation();
    
    console.log(`[${this.id}] Deactivated`);
    eventBus.emit('hologram:deactivated', {});
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    console.log(`[${this.id}] Disposing...`);
    
    this.deactivate();
    
    // Remove event listeners
    eventBus.off('hologram:setDisplayType', this.handleSetDisplayType);
    eventBus.off('hologram:setViewCount', this.handleSetViewCount);
    eventBus.off('hologram:startEncoding', this.handleStartEncoding);
    eventBus.off('hologram:stopEncoding', this.handleStopEncoding);
    
    // Reset state
    this.internalState = {
      isRendering: false,
      viewAngles: [],
      isEncoding: false,
      encodingProgress: 0,
      layoutInfo: null,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): HologramState {
    return { 
      ...this.internalState,
      viewAngles: [...this.internalState.viewAngles],
      layoutInfo: this.internalState.layoutInfo 
        ? { ...this.internalState.layoutInfo }
        : null,
    };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): HologramConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  updateConfig(partial: Partial<HologramConfig>): void {
    this.config = { ...this.config, ...partial };
    
    if (partial.viewCount !== undefined || partial.displayType !== undefined) {
      this.calculateViewAngles();
      this.calculateLayout();
    }
    
    if (partial.autoRotate !== undefined) {
      if (partial.autoRotate && this.internalState.isRendering) {
        this.startRotation();
      } else {
        this.stopRotation();
      }
    }
    
    eventBus.emit('hologram:configChanged', { config: this.config });
  }
  
  // ============================================================
  // View Management
  // ============================================================
  
  /**
   * Get view angles for current configuration
   */
  getViewAngles(): number[] {
    return [...this.internalState.viewAngles];
  }
  
  /**
   * Get camera rotation for a specific view index
   */
  getCameraRotation(viewIndex: number): number {
    const baseAngle = this.internalState.viewAngles[viewIndex] ?? 0;
    return baseAngle + this.currentRotation;
  }
  
  /**
   * Get all camera rotations with current animation offset
   */
  getAllCameraRotations(): number[] {
    return this.internalState.viewAngles.map(angle => angle + this.currentRotation);
  }
  
  /**
   * Set manual rotation angle
   */
  setRotation(degrees: number): void {
    this.currentRotation = degrees % 360;
    eventBus.emit('hologram:rotationChanged', { rotation: this.currentRotation });
  }
  
  /**
   * Get current rotation
   */
  getRotation(): number {
    return this.currentRotation;
  }
  
  // ============================================================
  // Encoding Control
  // ============================================================
  
  /**
   * Start video encoding
   */
  startEncoding(): void {
    if (this.internalState.isEncoding) return;
    
    this.internalState.isEncoding = true;
    this.internalState.encodingProgress = 0;
    
    eventBus.emit('hologram:encodingStarted', {});
  }
  
  /**
   * Stop video encoding
   */
  stopEncoding(): void {
    if (!this.internalState.isEncoding) return;
    
    this.internalState.isEncoding = false;
    
    eventBus.emit('hologram:encodingStopped', {
      progress: this.internalState.encodingProgress,
    });
  }
  
  /**
   * Update encoding progress
   */
  setEncodingProgress(progress: number): void {
    this.internalState.encodingProgress = Math.max(0, Math.min(1, progress));
    
    eventBus.emit('hologram:encodingProgress', {
      progress: this.internalState.encodingProgress,
    });
    
    if (this.internalState.encodingProgress >= 1) {
      this.stopEncoding();
      eventBus.emit('hologram:encodingComplete', {});
    }
  }
  
  // ============================================================
  // Private Methods
  // ============================================================
  
  /**
   * Calculate view angles based on configuration
   */
  private calculateViewAngles(): void {
    const { viewCount, displayType } = this.config;
    const angles: number[] = [];
    
    if (displayType === 'peppersGhost') {
      // Pepper's Ghost: single view with reflection
      angles.push(0);
    } else {
      // Pyramid or multi-face: evenly distributed angles
      const angleStep = 360 / viewCount;
      for (let i = 0; i < viewCount; i++) {
        angles.push(i * angleStep);
      }
    }
    
    this.internalState.viewAngles = angles;
  }
  
  /**
   * Calculate layout for combined output
   */
  private calculateLayout(): void {
    const { viewCount, viewResolution, viewMargin, layoutMode, displayType } = this.config;
    const [viewWidth, viewHeight] = viewResolution;
    
    if (displayType === 'peppersGhost') {
      this.internalState.layoutInfo = {
        totalWidth: viewWidth,
        totalHeight: viewHeight,
        viewPositions: [{ x: 0, y: 0 }],
      };
      return;
    }
    
    const positions: Array<{ x: number; y: number }> = [];
    let totalWidth = 0;
    let totalHeight = 0;
    
    if (layoutMode === 'grid') {
      // Grid layout (2x2 for 4 views)
      const cols = viewCount === 3 ? 2 : Math.ceil(Math.sqrt(viewCount));
      const rows = Math.ceil(viewCount / cols);
      
      totalWidth = cols * viewWidth + (cols - 1) * viewMargin;
      totalHeight = rows * viewHeight + (rows - 1) * viewMargin;
      
      for (let i = 0; i < viewCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          x: col * (viewWidth + viewMargin),
          y: row * (viewHeight + viewMargin),
        });
      }
    } else if (layoutMode === 'stripe') {
      // Horizontal stripe
      totalWidth = viewCount * viewWidth + (viewCount - 1) * viewMargin;
      totalHeight = viewHeight;
      
      for (let i = 0; i < viewCount; i++) {
        positions.push({
          x: i * (viewWidth + viewMargin),
          y: 0,
        });
      }
    } else if (layoutMode === 'radial') {
      // Radial layout (for pyramid)
      // Special layout with top, left, bottom, right
      totalWidth = viewWidth * 2 + viewMargin;
      totalHeight = viewHeight * 2 + viewMargin;
      
      // Top
      positions.push({ x: viewWidth / 2 + viewMargin / 2, y: 0 });
      // Right
      positions.push({ x: viewWidth + viewMargin, y: viewHeight / 2 + viewMargin / 2 });
      // Bottom
      positions.push({ x: viewWidth / 2 + viewMargin / 2, y: viewHeight + viewMargin });
      // Left
      positions.push({ x: 0, y: viewHeight / 2 + viewMargin / 2 });
    }
    
    this.internalState.layoutInfo = {
      totalWidth,
      totalHeight,
      viewPositions: positions,
    };
  }
  
  /**
   * Start auto-rotation
   */
  private startRotation(): void {
    if (this.animationFrameId !== null) return;
    
    this.lastFrameTime = performance.now();
    
    const rotate = (timestamp: number) => {
      const deltaTime = (timestamp - this.lastFrameTime) / 1000;
      this.lastFrameTime = timestamp;
      
      this.currentRotation = (this.currentRotation + this.config.rotationSpeed * deltaTime) % 360;
      
      eventBus.emit('hologram:rotationUpdate', { rotation: this.currentRotation });
      
      this.animationFrameId = requestAnimationFrame(rotate);
    };
    
    this.animationFrameId = requestAnimationFrame(rotate);
  }
  
  /**
   * Stop auto-rotation
   */
  private stopRotation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  // ============================================================
  // Event Handlers
  // ============================================================
  
  private handleSetDisplayType = (payload: { type: string }): void => {
    this.updateConfig({ displayType: payload.type as HologramDisplayType });
  };
  
  private handleSetViewCount = (payload: { count: number }): void => {
    this.updateConfig({ viewCount: payload.count });
  };
  
  private handleStartEncoding = (): void => {
    this.startEncoding();
  };
  
  private handleStopEncoding = (): void => {
    this.stopEncoding();
  };
}

// Singleton instance
export const hologramModule = new HologramModule();
