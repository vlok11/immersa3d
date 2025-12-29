// ============================================================
// Immersa 3D - Hologram Video Encoder
// Canvas stream to video encoding using WebCodecs
// ============================================================

import { eventBus } from '../../../core/events';

/**
 * Encoder configuration
 */
export interface EncoderConfig {
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Frame rate */
  frameRate: number;
  /** Bitrate in bps */
  bitrate: number;
  /** Codec (h264, vp9, etc.) */
  codec: 'h264' | 'vp9' | 'av1';
  /** Duration in seconds */
  duration: number;
}

/**
 * Encoding status
 */
export type EncoderStatus = 'idle' | 'encoding' | 'muxing' | 'complete' | 'error';

/**
 * Default encoder config
 */
const DEFAULT_ENCODER_CONFIG: EncoderConfig = {
  width: 1024,
  height: 1024,
  frameRate: 30,
  bitrate: 5000000, // 5 Mbps
  codec: 'h264',
  duration: 10,
};

/**
 * Check if WebCodecs is available
 */
export function isWebCodecsAvailable(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

/**
 * Hologram Video Encoder Class
 * Encodes canvas frames to video using WebCodecs API
 */
export class HologramVideoEncoder {
  private config: EncoderConfig;
  private status: EncoderStatus = 'idle';
  private encoder: VideoEncoder | null = null;
  private chunks: EncodedVideoChunk[] = [];
  private frameCount: number = 0;
  private totalFrames: number = 0;
  
  constructor(config?: Partial<EncoderConfig>) {
    this.config = { ...DEFAULT_ENCODER_CONFIG, ...config };
    this.totalFrames = this.config.frameRate * this.config.duration;
  }
  
  /**
   * Get current status
   */
  getStatus(): EncoderStatus {
    return this.status;
  }
  
  /**
   * Get encoding progress (0-1)
   */
  getProgress(): number {
    if (this.totalFrames === 0) return 0;
    return this.frameCount / this.totalFrames;
  }
  
  /**
   * Get configuration
   */
  getConfig(): EncoderConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration (only when idle)
   */
  updateConfig(config: Partial<EncoderConfig>): void {
    if (this.status !== 'idle') {
      console.warn('[HologramVideoEncoder] Cannot update config while encoding');
      return;
    }
    this.config = { ...this.config, ...config };
    this.totalFrames = this.config.frameRate * this.config.duration;
  }
  
  /**
   * Start encoding
   */
  async start(): Promise<void> {
    if (!isWebCodecsAvailable()) {
      throw new Error('WebCodecs API not available');
    }
    
    if (this.status !== 'idle') {
      throw new Error('Encoder is not idle');
    }
    
    this.status = 'encoding';
    this.chunks = [];
    this.frameCount = 0;
    
    const codecString = this.getCodecString();
    
    this.encoder = new VideoEncoder({
      output: (chunk) => {
        this.chunks.push(chunk);
      },
      error: (error) => {
        console.error('[HologramVideoEncoder] Encoder error:', error);
        this.status = 'error';
        eventBus.emit('hologram:encodingError', { error: error.message });
      },
    });
    
    await this.encoder.configure({
      codec: codecString,
      width: this.config.width,
      height: this.config.height,
      bitrate: this.config.bitrate,
      framerate: this.config.frameRate,
    });
    
    eventBus.emit('hologram:encodingStarted', { config: this.config });
  }
  
  /**
   * Add a frame from canvas
   */
  async addFrame(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    if (this.status !== 'encoding' || !this.encoder) {
      return;
    }
    
    if (this.frameCount >= this.totalFrames) {
      await this.finish();
      return;
    }
    
    const timestamp = (this.frameCount / this.config.frameRate) * 1000000; // microseconds
    
    const frame = new VideoFrame(canvas, {
      timestamp,
      duration: 1000000 / this.config.frameRate,
    });
    
    this.encoder.encode(frame, { keyFrame: this.frameCount % 30 === 0 });
    frame.close();
    
    this.frameCount++;
    
    // Emit progress
    eventBus.emit('hologram:encodingProgress', { 
      progress: this.getProgress(),
      frame: this.frameCount,
      totalFrames: this.totalFrames,
    });
  }
  
  /**
   * Finish encoding and get output
   */
  async finish(): Promise<Blob> {
    if (!this.encoder) {
      throw new Error('Encoder not initialized');
    }
    
    this.status = 'muxing';
    
    await this.encoder.flush();
    this.encoder.close();
    this.encoder = null;
    
    // Create blob from chunks
    // Note: This is a simplified version. Real implementation would use
    // mp4-muxer or similar library for proper container format
    const blob = await this.muxChunks();
    
    this.status = 'complete';
    
    eventBus.emit('hologram:encodingComplete', { 
      size: blob.size,
      frames: this.frameCount,
    });
    
    return blob;
  }
  
  /**
   * Cancel encoding
   */
  cancel(): void {
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
    
    this.status = 'idle';
    this.chunks = [];
    this.frameCount = 0;
    
    eventBus.emit('hologram:encodingCancelled', {});
  }
  
  /**
   * Reset encoder
   */
  reset(): void {
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
    
    this.status = 'idle';
    this.chunks = [];
    this.frameCount = 0;
  }
  
  /**
   * Get codec string for WebCodecs
   */
  private getCodecString(): string {
    switch (this.config.codec) {
      case 'h264':
        return 'avc1.42E01E'; // H.264 Baseline Level 3.0
      case 'vp9':
        return 'vp09.00.10.08';
      case 'av1':
        return 'av01.0.04M.08';
      default:
        return 'avc1.42E01E';
    }
  }
  
  /**
   * Mux encoded chunks into a container
   * Note: Simplified - real implementation would use proper muxer
   */
  private async muxChunks(): Promise<Blob> {
    // Collect all chunk data
    const buffers: ArrayBuffer[] = [];
    
    for (const chunk of this.chunks) {
      const buffer = new ArrayBuffer(chunk.byteLength);
      chunk.copyTo(buffer);
      buffers.push(buffer);
    }
    
    // For now, just concatenate as raw data
    // Real implementation would use mp4-muxer
    const totalSize = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const buffer of buffers) {
      combined.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    
    // Return as blob (would be video/mp4 with proper muxer)
    return new Blob([combined], { type: 'video/webm' });
  }
}

/**
 * Create a hologram video encoder
 */
export function createHologramEncoder(config?: Partial<EncoderConfig>): HologramVideoEncoder {
  return new HologramVideoEncoder(config);
}
