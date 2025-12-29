// ============================================================
// Immersa 3D - Video Uploader Component
// Handles video upload with first frame extraction
// ============================================================

import { useCallback, useState } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { useMediaStore, useAppStore } from '../../../store';
import { eventBus } from '../../../core/events';
import styles from './VideoUploader.module.css';

/**
 * Supported video formats
 */
const ACCEPTED_FORMATS: Accept = {
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
};

/**
 * Max file size (500MB)
 */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/**
 * Max duration in seconds (5 minutes)
 */
const MAX_DURATION = 300;

/**
 * Extract first frame from video
 */
async function extractFirstFrame(
  videoUrl: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = true;
    
    video.onloadeddata = () => {
      // Seek to first frame
      video.currentTime = 0;
    };
    
    video.onseeked = () => {
      try {
        // Create canvas and draw frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(video, 0, 0, width, height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Cleanup
        URL.revokeObjectURL(videoUrl);
        
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
    
    video.src = videoUrl;
    video.load();
  });
}

/**
 * Get video metadata (duration, dimensions)
 */
async function getVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * VideoUploader - Drag and drop video upload component
 */
export function VideoUploader() {
  const setMedia = useMediaStore((s) => s.setMedia);
  const setProcessing = useMediaStore((s) => s.setProcessing);
  const processing = useMediaStore((s) => s.processing);
  const addError = useAppStore((s) => s.addError);
  
  const [progress, setProgress] = useState<string>('');

  /**
   * Process uploaded file
   */
  const processFile = useCallback(async (file: File) => {
    setProcessing(true, 'Validating video...');
    setProgress('Validating...');

    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }

      setProgress('Reading metadata...');
      
      // Get video metadata
      const metadata = await getVideoMetadata(file);
      
      // Validate duration
      if (metadata.duration > MAX_DURATION) {
        throw new Error(`Video duration exceeds ${MAX_DURATION / 60} minutes limit`);
      }
      
      console.log(`[VideoUploader] Metadata: ${metadata.width}x${metadata.height}, ${metadata.duration.toFixed(1)}s`);

      setProgress('Extracting first frame...');
      setProcessing(true, 'Extracting first frame...');
      
      // Extract first frame as preview
      const videoUrl = URL.createObjectURL(file);
      const thumbnailUrl = await extractFirstFrame(
        videoUrl,
        metadata.width,
        metadata.height
      );

      // Create media info
      const mediaInfo = {
        id: `media_${Date.now()}`,
        type: 'video' as const,
        sourceType: 'upload' as const,
        originalName: file.name,
        mimeType: file.type,
        width: metadata.width,
        height: metadata.height,
        fileSize: file.size,
        duration: metadata.duration,
        dataUrl: thumbnailUrl,
        videoUrl: URL.createObjectURL(file),
        createdAt: Date.now(),
      };

      // Store media
      setMedia(mediaInfo);
      setProcessing(false);
      setProgress('');

      // Emit event
      eventBus.emit('media:videoUploaded', {
        file,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
      });

      console.log(`[VideoUploader] Processed: ${file.name}`);
    } catch (error) {
      console.error('[VideoUploader] Processing failed:', error);
      addError(error instanceof Error ? error.message : 'Failed to process video', 'error');
      setProcessing(false);
      setProgress('');
    }
  }, [setMedia, setProcessing, addError]);

  /**
   * Handle file drop
   */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  /**
   * Handle rejected files
   */
  const onDropRejected = useCallback(() => {
    addError('Invalid file format. Supported: MP4, WebM, MOV, AVI', 'warning');
  }, [addError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    disabled: processing,
  });

  return (
    <div
      {...getRootProps()}
      className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${processing ? styles.disabled : ''}`}
    >
      <input {...getInputProps()} />
      
      <div className={styles.content}>
        {processing ? (
          <>
            <div className={styles.spinner} />
            <p className={styles.text}>{progress || 'Processing...'}</p>
          </>
        ) : isDragActive ? (
          <>
            <div className={styles.icon}>📥</div>
            <p className={styles.text}>Drop video here</p>
          </>
        ) : (
          <>
            <div className={styles.icon}>🎬</div>
            <p className={styles.text}>Drag & drop a video</p>
            <p className={styles.hint}>or click to select</p>
            <p className={styles.formats}>MP4, WebM, MOV, AVI</p>
            <p className={styles.limit}>Max: 500MB, 5 minutes</p>
          </>
        )}
      </div>
    </div>
  );
}
