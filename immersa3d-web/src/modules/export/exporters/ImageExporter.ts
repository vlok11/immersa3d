// ============================================================
// Immersa 3D - Image Exporter
// High-resolution image export functionality
// ============================================================

import * as THREE from 'three';

/**
 * Image export options
 */
export interface ImageExportOptions {
  format: 'png' | 'jpg' | 'webp';
  quality: number; // 0-1 for jpg/webp
  width: number;
  height: number;
  filename?: string;
  preserveDrawingBuffer?: boolean;
}

/**
 * Default export options
 */
const DEFAULT_OPTIONS: ImageExportOptions = {
  format: 'png',
  quality: 0.92,
  width: 1920,
  height: 1080,
};

/**
 * ImageExporter - Export current 3D view as image
 */
export class ImageExporter {
  private renderer: THREE.WebGLRenderer | null = null;
  private renderTarget: THREE.WebGLRenderTarget | null = null;
  
  /**
   * Bind to renderer
   */
  bind(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }
  
  /**
   * Unbind from renderer
   */
  unbind(): void {
    this.dispose();
    this.renderer = null;
  }
  
  /**
   * Export scene to image
   */
  async export(
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: Partial<ImageExportOptions> = {}
  ): Promise<string> {
    if (!this.renderer) {
      throw new Error('Renderer not bound');
    }
    
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Create render target at export resolution
    this.renderTarget = new THREE.WebGLRenderTarget(opts.width, opts.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    
    // Save current renderer state
    const originalRenderTarget = this.renderer.getRenderTarget();
    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);
    
    // Update camera aspect ratio
    if (camera instanceof THREE.PerspectiveCamera) {
      const originalAspect = camera.aspect;
      camera.aspect = opts.width / opts.height;
      camera.updateProjectionMatrix();
      
      // Render to target
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.setSize(opts.width, opts.height);
      this.renderer.render(scene, camera);
      
      // Restore camera
      camera.aspect = originalAspect;
      camera.updateProjectionMatrix();
    } else {
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.setSize(opts.width, opts.height);
      this.renderer.render(scene, camera);
    }
    
    // Read pixels
    const pixels = new Uint8Array(opts.width * opts.height * 4);
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      opts.width,
      opts.height,
      pixels
    );
    
    // Restore renderer state
    this.renderer.setRenderTarget(originalRenderTarget);
    this.renderer.setSize(originalSize.x, originalSize.y);
    
    // Convert to image
    const dataUrl = await this.pixelsToDataUrl(pixels, opts.width, opts.height, opts);
    
    // Cleanup
    this.renderTarget.dispose();
    this.renderTarget = null;
    
    return dataUrl;
  }
  
  /**
   * Convert pixel data to data URL
   */
  private async pixelsToDataUrl(
    pixels: Uint8Array,
    width: number,
    height: number,
    options: ImageExportOptions
  ): Promise<string> {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Create ImageData
    const imageData = ctx.createImageData(width, height);
    
    // WebGL reads pixels bottom-to-top, flip vertically
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIndex = (y * width + x) * 4;
        const dstIndex = ((height - 1 - y) * width + x) * 4;
        
        imageData.data[dstIndex] = pixels[srcIndex];
        imageData.data[dstIndex + 1] = pixels[srcIndex + 1];
        imageData.data[dstIndex + 2] = pixels[srcIndex + 2];
        imageData.data[dstIndex + 3] = pixels[srcIndex + 3];
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to data URL
    const mimeType = this.getMimeType(options.format);
    return canvas.toDataURL(mimeType, options.quality);
  }
  
  /**
   * Get MIME type for format
   */
  private getMimeType(format: 'png' | 'jpg' | 'webp'): string {
    switch (format) {
      case 'png': return 'image/png';
      case 'jpg': return 'image/jpeg';
      case 'webp': return 'image/webp';
    }
  }
  
  /**
   * Download exported image
   */
  downloadImage(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.renderTarget?.dispose();
    this.renderTarget = null;
  }
}

// Singleton instance
export const imageExporter = new ImageExporter();

export default ImageExporter;
