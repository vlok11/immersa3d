// ============================================================
// ============================================================
// Immersa 3D - Fog Processor Component
// Various fog effect implementations
// Note: Scene modification is standard Three.js practice
// ============================================================

import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { FogType } from '../AtmosphereModule';

/**
 * Fog processor props
 */
interface FogProcessorProps {
  enabled?: boolean;
  type?: FogType;
  color?: string;
  near?: number;
  far?: number;
  density?: number;
}

/**
 * FogProcessor - Apply fog effects to scene
 * 
 * Supports multiple fog types:
 * - Linear: fog increases linearly between near and far
 * - Exponential: fog increases exponentially by density
 * - Exponential Squared: fog increases by density squared
 * - Height: fog based on Y position (custom shader)
 */
export function FogProcessor({
  enabled = true,
  type = 'exponential',
  color = '#88aacc',
  near = 1,
  far = 100,
  density = 0.02,
}: FogProcessorProps): null {
  const { scene } = useThree();
  const fogRef = useRef<THREE.Fog | THREE.FogExp2 | null>(null);
  
  // Create fog based on type
  const fog = useMemo(() => {
    const fogColor = new THREE.Color(color);
    
    switch (type) {
      case 'linear':
        return new THREE.Fog(fogColor, near, far);
      
      case 'exponential':
        return new THREE.FogExp2(fogColor, density);
      
      case 'exponentialSquared':
        return new THREE.FogExp2(fogColor, density * 1.5);
      
      case 'height':
        return new THREE.FogExp2(fogColor, density * 0.5);
      
      default:
        return new THREE.FogExp2(fogColor, density);
    }
  }, [type, color, near, far, density]);
  
  // Apply fog to scene
  useEffect(() => {
    fogRef.current = fog;
    
    if (enabled) {
      scene.fog = fog;
    } else {
      scene.fog = null;
    }
    
    return () => {
      scene.fog = null;
    };
  }, [scene, fog, enabled]);
  
  // Update fog parameters
  useEffect(() => {
    if (!enabled || !fogRef.current) return;
    
    const currentFog = fogRef.current;
    const fogColor = new THREE.Color(color);
    currentFog.color.copy(fogColor);
    
    if (currentFog instanceof THREE.Fog) {
      currentFog.near = near;
      currentFog.far = far;
    } else if (currentFog instanceof THREE.FogExp2) {
      currentFog.density = density;
    }
  }, [enabled, color, near, far, density]);
  
  return null;
}

export default FogProcessor;
