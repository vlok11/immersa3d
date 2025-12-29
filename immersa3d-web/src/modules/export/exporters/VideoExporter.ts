// ============================================================
// Immersa 3D - Video Exporter
// WebCodecs-based hardware-accelerated video encoding
// ============================================================

import * as THREE from 'three';

/**
 * Video export options
 */
export interface VideoExportOptions {
  format: 'mp4' | 'webm';
  codec: 'avc1' | 'vp8' | 'vp9';
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  duration: number;
  filename?: string;
}

/**
 * Default export options
 */
const DEFAULT_OPTIONS: VideoExportOptions = {
  format: 'mp4',
  codec: 'avc1',
  width: 1920,
  height: 1080,
  frameRate: 30,
  bitrate: 10_000_000,
  duration: 5,
};

/**
 * Frame capture callback
 */
export type FrameCaptureCallback = (frameIndex: number, totalFrames: number) => void;

/**
 * VideoExporter - Hardware-accelerated video encoding using WebCodecs
 * 
 * Note: WebCodecs requires secure context (HTTPS or localhost)
 */
export class VideoExporter {
  private renderer: THREE.WebGLRenderer | null = null;
  private encoder: VideoEncoder | null = null;
  private isEncoding = false;
  private chunks: EncodedVideoChunk[] = [];
  
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
   * Check if WebCodecs is available
   */
  static isAvailable(): boolean {
    return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
  }
  
  /**
   * Export scene animation to video
   */
  async export(
    scene: THREE.Scene,
    camera: THREE.Camera,
    animationCallback: (time: number) => void,
    options: Partial<VideoExportOptions> = {},
    progressCallback?: FrameCaptureCallback
  ): Promise<Blob> {
    if (!this.renderer) {
      throw new Error('Renderer not bound');
    }
    
    if (!VideoExporter.isAvailable()) {
      throw new Error('WebCodecs not available. Requires HTTPS or localhost.');
    }
    
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const totalFrames = Math.ceil(opts.duration * opts.frameRate);
    
    this.isEncoding = true;
    this.chunks = [];
    
    // Create encoder
    await this.initializeEncoder(opts);
    
    // Create offscreen render target
    const renderTarget = new THREE.WebGLRenderTarget(opts.width, opts.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    
    // Save original state
    const originalTarget = this.renderer.getRenderTarget();
    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);
    
    // Update camera aspect
    let originalAspect = 1;
    if (camera instanceof THREE.PerspectiveCamera) {
      originalAspect = camera.aspect;
      camera.aspect = opts.width / opts.height;
      camera.updateProjectionMatrix();
    }
    
    try {
      // Capture frames
      for (let frame = 0; frame < totalFrames; frame++) {
        if (!this.isEncoding) break;
        
        const time = frame / opts.frameRate;
        
        // Update animation
        animationCallback(time);
        
        // Render frame
        this.renderer.setRenderTarget(renderTarget);
        this.renderer.setSize(opts.width, opts.height);
        this.renderer.render(scene, camera);
        
        // Capture frame
        await this.captureFrame(renderTarget, opts, frame);
        
        // Progress callback
        progressCallback?.(frame + 1, totalFrames);
      }
      
      // Flush encoder
      await this.encoder?.flush();
      
      // Create video blob
      const blob = await this.createVideoBlob(opts);
      
      return blob;
      
    } finally {
      // Restore state
      this.renderer.setRenderTarget(originalTarget);
      this.renderer.setSize(originalSize.x, originalSize.y);
      
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = originalAspect;
        camera.updateProjectionMatrix();
      }
      
      renderTarget.dispose();
      this.dispose();
    }
  }
  
  /**
   * Initialize video encoder
   */
  private async initializeEncoder(options: VideoExportOptions): Promise<void> {
    const codecString = this.getCodecString(options.codec, options.width, options.height);
    
    const config: VideoEncoderConfig = {
      codec: codecString,
      width: options.width,
      height: options.height,
      bitrate: options.bitrate,
      framerate: options.frameRate,
    };
    
    // Check if codec is supported
    const support = await VideoEncoder.isConfigSupported(config);
    if (!support.supported) {
      throw new Error(`Codec ${options.codec} not supported`);
    }
    
    this.encoder = new VideoEncoder({
      output: (chunk) => {
        this.chunks.push(chunk);
      },
      error: (error) => {
        console.error('Encoder error:', error);
        this.isEncoding = false;
      },
    });
    
    this.encoder.configure(config);
  }
  
  /**
   * Get codec string for WebCodecs
   */
  private getCodecString(codec: string, width: number, height: number): string {
    switch (codec) {
      case 'avc1':
        // H.264 Baseline Level 4.0
        return 'avc1.42001f';
      case 'vp8':
        return 'vp8';
      case 'vp9':
        return 'vp09.00.10.08';
      default:
        return 'avc1.42001f';
    }
  }
  
  /**
   * Capture single frame
   */
  private async captureFrame(
    renderTarget: THREE.WebGLRenderTarget,
    options: VideoExportOptions,
    frameIndex: number
  ): Promise<void> {
    if (!this.renderer || !this.encoder) return;
    
    // Read pixels
    const pixels = new Uint8Array(options.width * options.height * 4);
    this.renderer.readRenderTargetPixels(
      renderTarget,
      0,
      0,
      options.width,
      options.height,
      pixels
    );
    
    // Flip vertically (WebGL reads bottom-up)
    const flippedPixels = this.flipVertically(pixels, options.width, options.height);
    
    // Create VideoFrame
    const frame = new VideoFrame(
      new Uint8ClampedArray(flippedPixels.buffer),
      {
        format: 'RGBA',
        codedWidth: options.width,
        codedHeight: options.height,
        timestamp: (frameIndex / options.frameRate) * 1_000_000, // microseconds
      }
    );
    
    // Encode frame
    const keyFrame = frameIndex % 30 === 0; // Keyframe every 30 frames
    this.encoder.encode(frame, { keyFrame });
    
    frame.close();
  }
  
  /**
   * Flip pixel data vertically
   */
  private flipVertically(pixels: Uint8Array, width: number, height: number): Uint8Array {
    const flipped = new Uint8Array(pixels.length);
    const rowSize = width * 4;
    
    for (let y = 0; y < height; y++) {
      const srcOffset = y * rowSize;
      const dstOffset = (height - 1 - y) * rowSize;
      flipped.set(pixels.subarray(srcOffset, srcOffset + rowSize), dstOffset);
    }
    
    return flipped;
  }
  
  /**
   * Create video blob from encoded chunks
   */
  private async createVideoBlob(options: VideoExportOptions): Promise<Blob> {
    // For now, return raw chunks wrapped in Blob
    // Full MP4/WebM muxing would require mp4-muxer library
    const data: ArrayBuffer[] = [];
    
    for (const chunk of this.chunks) {
      const buffer = new ArrayBuffer(chunk.byteLength);
      chunk.copyTo(buffer);
      data.push(buffer);
    }
    
    const mimeType = options.format === 'mp4' ? 'video/mp4' : 'video/webm';
    return new Blob(data, { type: mimeType });
  }
  
  /**
   * Cancel export
   */
  cancel(): void {
    this.isEncoding = false;
  }
  
  /**
   * Download exported video
   */
  downloadVideo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.encoder?.close();
    this.encoder = null;
    this.chunks = [];
    this.isEncoding = false;
  }
}

// Singleton instance
export const videoExporter = new VideoExporter();

export default VideoExporter;
