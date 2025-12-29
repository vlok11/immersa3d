// ============================================================
// Immersa 3D - Motion Previewer Component
// Small window render target for motion preview
// ============================================================

import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

import type { MotionPath } from '../AutoMotionModule';
import { KeyframeManager } from '../utils/keyframeManager';
import styles from './MotionPreviewer.module.css';

/**
 * Motion Previewer Props
 */
interface MotionPreviewerProps {
  /** Motion path to preview */
  path: MotionPath | null;
  /** Preview window size */
  size?: [number, number];
  /** Current preview time */
  time?: number;
  /** Whether to auto-play */
  autoPlay?: boolean;
  /** Playback speed */
  speed?: number;
  /** Show playback controls */
  showControls?: boolean;
  /** On time change callback */
  onTimeChange?: (time: number) => void;
}

/**
 * Preview Camera Component
 * Renders scene from the motion path's perspective
 */
function PreviewCamera({
  path,
  time,
  fbo,
}: {
  path: MotionPath;
  time: number;
  fbo: THREE.WebGLRenderTarget;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { scene, gl } = useThree();
  
  const keyframeManager = useMemo(() => {
    return new KeyframeManager(path.keyframes, path.interpolation);
  }, [path]);
  
  useFrame(() => {
    if (!cameraRef.current) return;
    
    const state = keyframeManager.getInterpolatedState(time);
    if (!state) return;
    
    // Update camera position
    cameraRef.current.position.set(...state.position);
    cameraRef.current.lookAt(...state.lookAt);
    cameraRef.current.fov = state.fov;
    cameraRef.current.updateProjectionMatrix();
    
    // Render to FBO
    const currentRenderTarget = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.render(scene, cameraRef.current);
    gl.setRenderTarget(currentRenderTarget);
  });
  
  return (
    <perspectiveCamera
      ref={cameraRef}
      args={[75, fbo.width / fbo.height, 0.1, 1000]}
    />
  );
}

/**
 * Motion Previewer Component
 * Renders a small preview window showing the camera animation
 */
export function MotionPreviewer({
  path,
  size = [320, 180],
  time: externalTime,
  autoPlay = false,
  speed = 1,
  showControls = true,
  onTimeChange,
}: MotionPreviewerProps) {
  const [internalTime, setInternalTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  // Use external time if provided
  const currentTime = externalTime ?? internalTime;
  
  // Create FBO for preview rendering
  const fbo = useFBO(size[0], size[1], {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  });
  
  // Animation loop
  useEffect(() => {
    if (!isPlaying || !path) return;
    
    lastTimeRef.current = performance.now();
    
    const animate = (timestamp: number) => {
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      
      setInternalTime((prev) => {
        let newTime = prev + deltaTime * speed;
        
        // Loop
        if (newTime >= path.duration) {
          newTime = path.loop ? newTime % path.duration : path.duration;
          if (!path.loop) {
            setIsPlaying(false);
          }
        }
        
        onTimeChange?.(newTime);
        return newTime;
      });
      
      if (isPlaying) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isPlaying, path, speed, onTimeChange]);
  
  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!path) return;
    
    if (internalTime >= path.duration && !path.loop) {
      setInternalTime(0);
    }
    setIsPlaying((prev) => !prev);
  }, [path, internalTime]);
  
  // Handle stop
  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setInternalTime(0);
    onTimeChange?.(0);
  }, [onTimeChange]);
  
  // Handle seek
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!path) return;
    const newTime = (parseFloat(e.target.value) / 100) * path.duration;
    setInternalTime(newTime);
    onTimeChange?.(newTime);
  }, [path, onTimeChange]);
  
  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!path) {
    return (
      <div className={styles.container} style={{ width: size[0], height: size[1] }}>
        <div className={styles.placeholder}>
          No path selected
        </div>
      </div>
    );
  }
  
  const progress = path.duration > 0 ? (currentTime / path.duration) * 100 : 0;
  
  return (
    <div className={styles.container} style={{ width: size[0] }}>
      {/* Preview viewport */}
      <div className={styles.viewport} style={{ height: size[1] }}>
        <mesh>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial map={fbo.texture} />
        </mesh>
        
        {/* Render camera to FBO */}
        <PreviewCamera path={path} time={currentTime} fbo={fbo} />
      </div>
      
      {/* Controls */}
      {showControls && (
        <div className={styles.controls}>
          <div className={styles.buttons}>
            <button 
              className={styles.button} 
              onClick={handleStop}
              title="Stop"
            >
              ⏹
            </button>
            <button 
              className={styles.button} 
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
          
          <div className={styles.timeline}>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className={styles.slider}
            />
          </div>
          
          <div className={styles.time}>
            {formatTime(currentTime)} / {formatTime(path.duration)}
          </div>
        </div>
      )}
    </div>
  );
}

export default MotionPreviewer;
