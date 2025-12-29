// ============================================================
// Immersa 3D - Render Context
// WebGL/WebGPU capability detection and context management
// ============================================================

/**
 * Supported render backends
 */
export type RenderBackend = 'webgpu' | 'webgl2' | 'webgl' | 'none';

/**
 * GPU capabilities info
 */
export interface GPUCapabilities {
  backend: RenderBackend;
  maxTextureSize: number;
  maxViewportDimensions: [number, number];
  supportsFloat32Textures: boolean;
  supportsHalfFloatTextures: boolean;
  supportsInstancing: boolean;
  estimatedVRAM: number; // in MB, -1 if unknown
  vendor: string;
  renderer: string;
}

/**
 * RenderContext - Singleton for managing render capabilities
 */
class RenderContext {
  private _capabilities: GPUCapabilities | null = null;
  private _initialized = false;

  /**
   * Initialize and detect GPU capabilities
   */
  async initialize(): Promise<GPUCapabilities> {
    if (this._initialized && this._capabilities) {
      return this._capabilities;
    }

    // Try WebGPU first
    const webgpuCaps = await this.detectWebGPU();
    if (webgpuCaps) {
      this._capabilities = webgpuCaps;
      this._initialized = true;
      console.log('[RenderContext] Using WebGPU backend');
      return this._capabilities;
    }

    // Fallback to WebGL2
    const webgl2Caps = this.detectWebGL2();
    if (webgl2Caps) {
      this._capabilities = webgl2Caps;
      this._initialized = true;
      console.log('[RenderContext] Using WebGL2 backend (fallback)');
      return this._capabilities;
    }

    // Fallback to WebGL1
    const webglCaps = this.detectWebGL();
    if (webglCaps) {
      this._capabilities = webglCaps;
      this._initialized = true;
      console.log('[RenderContext] Using WebGL backend (legacy fallback)');
      return this._capabilities;
    }

    // No GPU support
    this._capabilities = {
      backend: 'none',
      maxTextureSize: 0,
      maxViewportDimensions: [0, 0],
      supportsFloat32Textures: false,
      supportsHalfFloatTextures: false,
      supportsInstancing: false,
      estimatedVRAM: 0,
      vendor: 'none',
      renderer: 'none',
    };
    this._initialized = true;
    console.error('[RenderContext] No GPU backend available');
    return this._capabilities;
  }

  /**
   * Detect WebGPU capabilities
   */
  private async detectWebGPU(): Promise<GPUCapabilities | null> {
    if (!navigator.gpu) {
      return null;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return null;
      }

      const device = await adapter.requestDevice();
      const limits = device.limits;

      const capabilities: GPUCapabilities = {
        backend: 'webgpu',
        maxTextureSize: limits.maxTextureDimension2D,
        maxViewportDimensions: [limits.maxTextureDimension2D, limits.maxTextureDimension2D],
        supportsFloat32Textures: true,
        supportsHalfFloatTextures: true,
        supportsInstancing: true,
        estimatedVRAM: -1, // WebGPU doesn't expose VRAM info
        vendor: adapter.info?.vendor ?? 'unknown',
        renderer: adapter.info?.device ?? 'unknown',
      };

      // Release device to free memory
      device.destroy();

      return capabilities;
    } catch (error) {
      console.warn('[RenderContext] WebGPU detection failed:', error);
      return null;
    }
  }

  /**
   * Detect WebGL2 capabilities
   */
  private detectWebGL2(): GPUCapabilities | null {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      return null;
    }

    return this.extractWebGLCapabilities(gl, 'webgl2');
  }

  /**
   * Detect WebGL1 capabilities
   */
  private detectWebGL(): GPUCapabilities | null {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    
    if (!gl) {
      return null;
    }

    return this.extractWebGLCapabilities(gl, 'webgl');
  }

  /**
   * Extract capabilities from WebGL context
   */
  private extractWebGLCapabilities(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    backend: 'webgl2' | 'webgl'
  ): GPUCapabilities {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const floatTextureExt = gl.getExtension('OES_texture_float');
    const halfFloatExt = gl.getExtension('OES_texture_half_float');

    return {
      backend,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewportDimensions: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      supportsFloat32Textures: !!floatTextureExt || backend === 'webgl2',
      supportsHalfFloatTextures: !!halfFloatExt || backend === 'webgl2',
      supportsInstancing: backend === 'webgl2' || !!gl.getExtension('ANGLE_instanced_arrays'),
      estimatedVRAM: -1,
      vendor: debugInfo 
        ? (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? 'unknown')
        : 'unknown',
      renderer: debugInfo 
        ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? 'unknown')
        : 'unknown',
    };
  }

  /**
   * Get current capabilities (must call initialize first)
   */
  get capabilities(): GPUCapabilities {
    if (!this._initialized || !this._capabilities) {
      throw new Error('[RenderContext] Not initialized. Call initialize() first.');
    }
    return this._capabilities;
  }

  /**
   * Check if WebGPU is available
   */
  get isWebGPUAvailable(): boolean {
    return this._capabilities?.backend === 'webgpu';
  }

  /**
   * Check if any GPU backend is available
   */
  get isGPUAvailable(): boolean {
    return this._capabilities?.backend !== 'none';
  }

  /**
   * Check if VRAM is sufficient for a model
   * Returns true if check passes or VRAM is unknown
   */
  checkVRAMSufficient(requiredMB: number): boolean {
    if (!this._capabilities || this._capabilities.estimatedVRAM === -1) {
      // Cannot verify, assume sufficient but log warning
      console.warn(`[RenderContext] Cannot verify VRAM. Required: ${requiredMB}MB`);
      return true;
    }

    // Reserve 10% buffer as per spec
    const availableWithBuffer = this._capabilities.estimatedVRAM * 0.9;
    return availableWithBuffer >= requiredMB;
  }
}

// Singleton export
export const renderContext = new RenderContext();
