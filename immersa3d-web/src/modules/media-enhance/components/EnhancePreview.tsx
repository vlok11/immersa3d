// ============================================================
// Immersa 3D - Enhance Preview Component
// Split-screen comparison slider for before/after
// ============================================================

import { useRef, useState, useCallback, useEffect } from 'react';
import styles from './EnhancePreview.module.css';

/**
 * Enhance Preview Props
 */
interface EnhancePreviewProps {
  /** Original image URL or data URL */
  originalSrc: string;
  /** Enhanced image URL or data URL */
  enhancedSrc: string;
  /** Initial slider position (0-1) */
  initialPosition?: number;
  /** Show labels */
  showLabels?: boolean;
  /** Original label text */
  originalLabel?: string;
  /** Enhanced label text */
  enhancedLabel?: string;
  /** Container width */
  width?: number | string;
  /** Container height */
  height?: number | string;
}

/**
 * Enhance Preview Component
 * Split-screen comparison with draggable slider
 */
export function EnhancePreview({
  originalSrc,
  enhancedSrc,
  initialPosition = 0.5,
  showLabels = true,
  originalLabel = 'Original',
  enhancedLabel = 'Enhanced',
  width = '100%',
  height = 400,
}: EnhancePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle mouse/touch move
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newPosition = Math.max(0, Math.min(1, x / rect.width));
    
    setPosition(newPosition);
  }, []);
  
  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);
  }, [handleMove]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  }, [handleMove]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);
  
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Add/remove global listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);
  
  const sliderPercent = position * 100;
  
  return (
    <div 
      ref={containerRef}
      className={styles.container}
      style={{ width, height }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Enhanced image (background) */}
      <div className={styles.imageLayer}>
        <img 
          src={enhancedSrc} 
          alt={enhancedLabel}
          className={styles.image}
          draggable={false}
        />
      </div>
      
      {/* Original image (foreground, clipped) */}
      <div 
        className={styles.imageLayer}
        style={{ clipPath: `inset(0 ${100 - sliderPercent}% 0 0)` }}
      >
        <img 
          src={originalSrc} 
          alt={originalLabel}
          className={styles.image}
          draggable={false}
        />
      </div>
      
      {/* Slider line */}
      <div 
        className={styles.sliderLine}
        style={{ left: `${sliderPercent}%` }}
      >
        <div className={styles.sliderHandle}>
          <div className={styles.sliderArrows}>
            <span>◀</span>
            <span>▶</span>
          </div>
        </div>
      </div>
      
      {/* Labels */}
      {showLabels && (
        <>
          <div className={`${styles.label} ${styles.labelLeft}`}>
            {originalLabel}
          </div>
          <div className={`${styles.label} ${styles.labelRight}`}>
            {enhancedLabel}
          </div>
        </>
      )}
    </div>
  );
}

export default EnhancePreview;
