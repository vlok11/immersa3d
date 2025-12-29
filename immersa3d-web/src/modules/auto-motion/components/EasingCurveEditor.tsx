// ============================================================
// Immersa 3D - Easing Curve Editor Component
// Visual editor for animation easing curves
// ============================================================

import { useRef, useState, useCallback, useEffect } from 'react';
import type { EasingType } from '../AutoMotionModule';
import styles from './EasingCurveEditor.module.css';

/**
 * Easing Curve Editor Props
 */
interface EasingCurveEditorProps {
  /** Current easing type */
  value: EasingType;
  /** Callback when easing changes */
  onChange: (easing: EasingType) => void;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Whether editing is enabled */
  disabled?: boolean;
}

/**
 * Easing function definitions for visualization
 */
const EASING_FUNCTIONS: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => { const t1 = t - 1; return t1 * t1 * t1 + 1; },
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};

/**
 * Easing type display names
 */
const EASING_NAMES: Record<EasingType, string> = {
  linear: 'Linear',
  easeIn: 'Ease In',
  easeOut: 'Ease Out',
  easeInOut: 'Ease In Out',
  easeInQuad: 'Ease In (Quad)',
  easeOutQuad: 'Ease Out (Quad)',
  easeInOutQuad: 'Ease In Out (Quad)',
  easeInCubic: 'Ease In (Cubic)',
  easeOutCubic: 'Ease Out (Cubic)',
  easeInOutCubic: 'Ease In Out (Cubic)',
};

/**
 * All available easing types
 */
const EASING_TYPES: EasingType[] = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
];

/**
 * Easing Curve Editor Component
 */
export function EasingCurveEditor({
  value,
  onChange,
  width = 200,
  height = 150,
  disabled = false,
}: EasingCurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // Draw the easing curve
  const drawCurve = useCallback((easing: EasingType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const padding = 20;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 4; i++) {
      const x = padding + (drawWidth * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (drawHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw linear reference line
    ctx.strokeStyle = '#444466';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, padding);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw easing curve
    const easingFn = EASING_FUNCTIONS[easing];
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const easedT = easingFn(t);
      const x = padding + t * drawWidth;
      const y = height - padding - easedT * drawHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Draw start and end points
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(padding, height - padding, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width - padding, padding, 4, 0, Math.PI * 2);
    ctx.fill();
    
  }, [width, height]);
  
  // Redraw on value change
  useEffect(() => {
    drawCurve(value);
  }, [value, drawCurve]);
  
  // Handle preset selection
  const handlePresetSelect = useCallback((easing: EasingType) => {
    if (!disabled) {
      onChange(easing);
      setIsOpen(false);
    }
  }, [disabled, onChange]);
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Easing</span>
        <button 
          className={styles.selector}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          {EASING_NAMES[value]}
          <span className={styles.arrow}>▼</span>
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
      />
      
      {isOpen && (
        <div className={styles.dropdown}>
          {EASING_TYPES.map((easing) => (
            <button
              key={easing}
              className={`${styles.option} ${value === easing ? styles.selected : ''}`}
              onClick={() => handlePresetSelect(easing)}
            >
              {EASING_NAMES[easing]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default EasingCurveEditor;
