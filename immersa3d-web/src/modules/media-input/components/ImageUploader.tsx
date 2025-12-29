// ============================================================
// Immersa 3D - Image Uploader Component
// Handles image upload with EXIF correction and validation
// ============================================================

import { useCallback } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { useMediaStore, useAppStore } from '../../../store';
import { eventBus } from '../../../core/events';
import { getExifOrientation, correctOrientation } from '../utils/exifParser';
import styles from './ImageUploader.module.css';

/**
 * Supported image formats
 */
const ACCEPTED_FORMATS: Accept = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/tiff': ['.tiff', '.tif'],
};

/**
 * Max canvas size per spec
 */
const MAX_SIZE = 4096;

/**
 * Max file size (50MB)
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * ImageUploader - Drag and drop image upload component
 */
export function ImageUploader() {
  const setMedia = useMediaStore((s) => s.setMedia);
  const setProcessing = useMediaStore((s) => s.setProcessing);
  const processing = useMediaStore((s) => s.processing);
  const addError = useAppStore((s) => s.addError);

  /**
   * Process uploaded file
   */
  const processFile = useCallback(async (file: File) => {
    setProcessing(true, 'Reading file...');

    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }

      setProcessing(true, 'Extracting EXIF data...');
      
      // Get EXIF orientation
      const orientation = await getExifOrientation(file);
      console.log(`[ImageUploader] EXIF orientation: ${orientation}`);

      setProcessing(true, 'Loading image...');

      // Load image
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = URL.createObjectURL(file);
      });

      setProcessing(true, 'Correcting orientation...');

      // Apply EXIF correction
      const correctedCanvas = correctOrientation(img, orientation, MAX_SIZE);

      // Convert to data URL
      const dataUrl = correctedCanvas.toDataURL('image/png');

      // Create media info
      const mediaInfo = {
        id: `media_${Date.now()}`,
        type: 'image' as const,
        sourceType: 'upload' as const,
        originalName: file.name,
        mimeType: file.type,
        width: correctedCanvas.width,
        height: correctedCanvas.height,
        fileSize: file.size,
        dataUrl,
        createdAt: Date.now(),
      };

      // Store media
      setMedia(mediaInfo);
      setProcessing(false);

      // Emit event
      eventBus.emit('media:uploaded', {
        file,
        width: correctedCanvas.width,
        height: correctedCanvas.height,
      });

      console.log(`[ImageUploader] Processed: ${file.name} (${correctedCanvas.width}x${correctedCanvas.height})`);
    } catch (error) {
      console.error('[ImageUploader] Processing failed:', error);
      addError(error instanceof Error ? error.message : 'Failed to process image', 'error');
      setProcessing(false);
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
    addError('Invalid file format. Supported: JPG, PNG, WebP, HEIC, TIFF', 'warning');
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
            <p className={styles.text}>Processing...</p>
          </>
        ) : isDragActive ? (
          <>
            <div className={styles.icon}>📥</div>
            <p className={styles.text}>Drop image here</p>
          </>
        ) : (
          <>
            <div className={styles.icon}>🖼️</div>
            <p className={styles.text}>Drag & drop an image</p>
            <p className={styles.hint}>or click to select</p>
            <p className={styles.formats}>JPG, PNG, WebP, HEIC, TIFF</p>
          </>
        )}
      </div>
    </div>
  );
}
