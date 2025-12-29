// ============================================================
// Immersa 3D - Drag Drop Handler Component
// Global drag and drop overlay for file uploads
// ============================================================

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { eventBus } from '../../../core/events';
import styles from './DragDropHandler.module.css';

/**
 * Supported file types
 */
const SUPPORTED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
};

/**
 * Get file category
 */
function getFileCategory(file: File): 'image' | 'video' | null {
  if (SUPPORTED_TYPES.image.includes(file.type)) return 'image';
  if (SUPPORTED_TYPES.video.includes(file.type)) return 'video';
  return null;
}

/**
 * DragDropHandler props
 */
interface DragDropHandlerProps {
  /** Children to wrap */
  children: ReactNode;
  /** Callback when file is dropped */
  onFileDrop?: (file: File, category: 'image' | 'video') => void;
  /** Is handler enabled */
  enabled?: boolean;
}

/**
 * DragDropHandler - Global drag and drop overlay
 * 
 * Wraps the application and shows a full-screen overlay
 * when files are dragged over the window.
 */
export function DragDropHandler({
  children,
  onFileDrop,
  enabled = true,
}: DragDropHandlerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  /**
   * Handle drag enter
   */
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!enabled) return;
    
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragging(true);
    }
  }, [enabled]);

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  /**
   * Handle drop
   */
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    setDragCounter(0);
    
    if (!enabled) return;
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const category = getFileCategory(file);
    
    if (!category) {
      console.warn('[DragDropHandler] Unsupported file type:', file.type);
      eventBus.emit('app:error', {
        message: 'Unsupported file type. Use images (JPG, PNG, WebP) or videos (MP4, WebM).',
        severity: 'warning',
      });
      return;
    }
    
    console.log(`[DragDropHandler] File dropped: ${file.name} (${category})`);
    
    // Call callback if provided
    if (onFileDrop) {
      onFileDrop(file, category);
    }
    
    // Emit event for other components to handle
    eventBus.emit('media:fileDropped', { file, category });
  }, [enabled, onFileDrop]);

  /**
   * Attach/detach global event listeners
   */
  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [enabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  /**
   * Prevent default browser behavior
   */
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
    };
    
    document.addEventListener('dragover', preventDefault);
    document.addEventListener('drop', preventDefault);
    
    return () => {
      document.removeEventListener('dragover', preventDefault);
      document.removeEventListener('drop', preventDefault);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      {children}
      
      {isDragging && (
        <div className={styles.overlay}>
          <div className={styles.content}>
            <div className={styles.icon}>📥</div>
            <p className={styles.title}>Drop to Upload</p>
            <p className={styles.subtitle}>Release to import your file</p>
            <div className={styles.formats}>
              <span>📷 Images: JPG, PNG, WebP, HEIC</span>
              <span>🎬 Videos: MP4, WebM, MOV</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
