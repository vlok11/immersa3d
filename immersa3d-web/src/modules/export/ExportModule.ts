// ============================================================
// Immersa 3D - Export Module
// Main module entry for media export functionality
// ============================================================

import type { ImmersaModule, ModuleState } from '../../core/registry';
import { eventBus } from '../../core/events';

/**
 * Export format type
 */
export type ExportFormat = 'png' | 'jpg' | 'webp' | 'mp4' | 'webm' | 'gif' | 'gltf' | 'glb' | 'json';

/**
 * Export quality preset
 */
export type QualityPreset = 'draft' | 'standard' | 'high' | 'ultra';

/**
 * Export job status
 */
export type ExportStatus = 'idle' | 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';

/**
 * Export Module Configuration
 */
export interface ExportConfig {
  defaultImageFormat: 'png' | 'jpg' | 'webp';
  defaultVideoFormat: 'mp4' | 'webm';
  defaultQuality: QualityPreset;
  maxResolution: number;
  enableHardwareAcceleration: boolean;
}

/**
 * Export job info
 */
export interface ExportJob {
  id: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  startTime: number;
  endTime?: number;
  outputUrl?: string;
  error?: string;
}

/**
 * Export Module State
 */
export interface ExportState {
  currentJob: ExportJob | null;
  jobHistory: ExportJob[];
  isExporting: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ExportConfig = {
  defaultImageFormat: 'png',
  defaultVideoFormat: 'mp4',
  defaultQuality: 'high',
  maxResolution: 4096,
  enableHardwareAcceleration: true,
};

/**
 * ExportModule - Media export management
 * 
 * Responsibilities:
 * - Image export (PNG, JPG, WebP)
 * - Video export (MP4, WebM using WebCodecs)
 * - GIF export
 * - 3D model export (GLTF/GLB)
 * - Project export (JSON)
 */
export class ExportModule implements ImmersaModule<ExportConfig, ExportState> {
  readonly id = 'export';
  readonly name = 'Export';
  readonly version = '1.0.0';
  readonly dependencies: string[] = ['projection-3d'];
  
  state: ModuleState = 'unregistered';
  
  private config: ExportConfig = { ...DEFAULT_CONFIG };
  
  private internalState: ExportState = {
    currentJob: null,
    jobHistory: [],
    isExporting: false,
  };
  
  private jobIdCounter = 0;
  
  /**
   * Setup module resources
   */
  async setup(config?: ExportConfig): Promise<void> {
    console.log(`[${this.id}] Setting up...`);
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Check WebCodecs availability
    if (this.config.enableHardwareAcceleration) {
      const hasWebCodecs = 'VideoEncoder' in window;
      if (!hasWebCodecs) {
        console.warn(`[${this.id}] WebCodecs not available, falling back to software encoding`);
        this.config.enableHardwareAcceleration = false;
      }
    }
    
    console.log(`[${this.id}] Setup complete (Hardware acceleration: ${this.config.enableHardwareAcceleration})`);
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
    
    // Cancel any ongoing export
    if (this.internalState.currentJob) {
      this.cancelExport();
    }
    
    this.internalState = {
      currentJob: null,
      jobHistory: [],
      isExporting: false,
    };
    
    console.log(`[${this.id}] Disposed`);
  }
  
  /**
   * Get current state
   */
  getState(): ExportState {
    return { ...this.internalState };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): ExportConfig {
    return { ...this.config };
  }
  
  /**
   * Create new export job
   */
  createJob(format: ExportFormat): ExportJob {
    const job: ExportJob = {
      id: `export-${++this.jobIdCounter}-${Date.now()}`,
      format,
      status: 'idle',
      progress: 0,
      startTime: Date.now(),
    };
    
    return job;
  }
  
  /**
   * Start export job
   */
  startJob(job: ExportJob): void {
    this.internalState.currentJob = job;
    this.internalState.isExporting = true;
    job.status = 'preparing';
    
    eventBus.emit('export:started', { jobId: job.id, format: job.format });
  }
  
  /**
   * Update job progress
   */
  updateJobProgress(jobId: string, progress: number, status?: ExportStatus): void {
    if (this.internalState.currentJob?.id === jobId) {
      this.internalState.currentJob.progress = progress;
      if (status) {
        this.internalState.currentJob.status = status;
      }
      
      eventBus.emit('export:progress', { jobId, progress, status });
    }
  }
  
  /**
   * Complete export job
   */
  completeJob(jobId: string, outputUrl: string): void {
    if (this.internalState.currentJob?.id === jobId) {
      const job = this.internalState.currentJob;
      job.status = 'complete';
      job.progress = 100;
      job.endTime = Date.now();
      job.outputUrl = outputUrl;
      
      this.internalState.jobHistory.push(job);
      this.internalState.currentJob = null;
      this.internalState.isExporting = false;
      
      eventBus.emit('export:completed', { jobId, outputUrl });
    }
  }
  
  /**
   * Fail export job
   */
  failJob(jobId: string, error: string): void {
    if (this.internalState.currentJob?.id === jobId) {
      const job = this.internalState.currentJob;
      job.status = 'error';
      job.endTime = Date.now();
      job.error = error;
      
      this.internalState.jobHistory.push(job);
      this.internalState.currentJob = null;
      this.internalState.isExporting = false;
      
      eventBus.emit('export:failed', { jobId, error });
    }
  }
  
  /**
   * Cancel current export
   */
  cancelExport(): void {
    if (this.internalState.currentJob) {
      const jobId = this.internalState.currentJob.id;
      this.internalState.currentJob = null;
      this.internalState.isExporting = false;
      
      eventBus.emit('export:cancelled', { jobId });
    }
  }
  
  /**
   * Get quality settings for preset
   */
  getQualitySettings(preset: QualityPreset): { width: number; height: number; bitrate: number } {
    switch (preset) {
      case 'draft':
        return { width: 854, height: 480, bitrate: 2_000_000 };
      case 'standard':
        return { width: 1280, height: 720, bitrate: 5_000_000 };
      case 'high':
        return { width: 1920, height: 1080, bitrate: 10_000_000 };
      case 'ultra':
        return { width: 3840, height: 2160, bitrate: 25_000_000 };
    }
  }
  
  /**
   * Check if WebCodecs is available
   */
  isWebCodecsAvailable(): boolean {
    return 'VideoEncoder' in window && 'VideoDecoder' in window;
  }
}

// Singleton instance
export const exportModule = new ExportModule();
