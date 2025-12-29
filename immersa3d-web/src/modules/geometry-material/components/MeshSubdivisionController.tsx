// ============================================================
// Immersa 3D - Mesh Subdivision Controller
// Dynamic geometry segment adjustment component
// ============================================================

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

import { eventBus } from '../../../core/events';

/**
 * Mesh Subdivision Controller Props
 */
interface MeshSubdivisionControllerProps {
  /** Source geometry to subdivide */
  geometry: THREE.BufferGeometry | null;
  /** Subdivision level (0-4) */
  level: number;
  /** Subdivision algorithm */
  algorithm?: 'simple' | 'catmullClark' | 'loop';
  /** Whether to preserve edges */
  preserveEdges?: boolean;
  /** Callback when subdivision completes */
  onComplete?: (subdivided: THREE.BufferGeometry) => void;
  /** Whether processing is enabled */
  enabled?: boolean;
}

/**
 * Simple subdivision utility
 * Increases vertex count by splitting triangles
 */
function simpleSubdivide(
  geometry: THREE.BufferGeometry, 
  level: number
): THREE.BufferGeometry {
  if (level <= 0) return geometry.clone();
  
  // Clone the geometry
  let result = geometry.clone();
  
  for (let i = 0; i < level; i++) {
    // Get position attribute
    const positions = result.getAttribute('position');
    const indices = result.index;
    
    if (!positions) continue;
    
    // For non-indexed geometry, we need to create indices first
    if (!indices) {
      const indexArray = new Uint32Array(positions.count);
      for (let j = 0; j < positions.count; j++) {
        indexArray[j] = j;
      }
      result.setIndex(new THREE.BufferAttribute(indexArray, 1));
    }
    
    // Use Three.js subdivision if available
    const newGeometry = new THREE.BufferGeometry();
    
    // Simple midpoint subdivision
    const newPositions: number[] = [];
    const posArray = positions.array;
    
    // For each triangle, create 4 triangles
    const indexArray = result.index?.array;
    if (!indexArray) continue;
    
    for (let j = 0; j < indexArray.length; j += 3) {
      const i0 = indexArray[j] * 3;
      const i1 = indexArray[j + 1] * 3;
      const i2 = indexArray[j + 2] * 3;
      
      // Original vertices
      const v0 = [posArray[i0], posArray[i0 + 1], posArray[i0 + 2]];
      const v1 = [posArray[i1], posArray[i1 + 1], posArray[i1 + 2]];
      const v2 = [posArray[i2], posArray[i2 + 1], posArray[i2 + 2]];
      
      // Midpoints
      const m01 = [(v0[0] + v1[0]) / 2, (v0[1] + v1[1]) / 2, (v0[2] + v1[2]) / 2];
      const m12 = [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2, (v1[2] + v2[2]) / 2];
      const m20 = [(v2[0] + v0[0]) / 2, (v2[1] + v0[1]) / 2, (v2[2] + v0[2]) / 2];
      
      // Create 4 triangles
      // Triangle 1: v0, m01, m20
      newPositions.push(...v0, ...m01, ...m20);
      // Triangle 2: m01, v1, m12
      newPositions.push(...m01, ...v1, ...m12);
      // Triangle 3: m20, m12, v2
      newPositions.push(...m20, ...m12, ...v2);
      // Triangle 4: m01, m12, m20 (center)
      newPositions.push(...m01, ...m12, ...m20);
    }
    
    newGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(newPositions, 3)
    );
    newGeometry.computeVertexNormals();
    
    result.dispose();
    result = newGeometry;
  }
  
  return result;
}

/**
 * Mesh Subdivision Controller Component
 * Manages dynamic geometry subdivision
 */
export function MeshSubdivisionController({
  geometry,
  level,
  algorithm = 'simple',
  // preserveEdges param reserved for future catmullClark/loop algorithms
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preserveEdges: _preserveEdges = false,
  onComplete,
  enabled = true,
}: MeshSubdivisionControllerProps) {
  const lastLevelRef = useRef<number>(-1);
  const processingRef = useRef<boolean>(false);
  
  // Perform subdivision when level changes
  useEffect(() => {
    if (!geometry || !enabled) return;
    if (level === lastLevelRef.current) return;
    if (processingRef.current) return;
    
    processingRef.current = true;
    lastLevelRef.current = level;
    
    eventBus.emit('geometry:subdivisionStart', { level });
    
    // Perform subdivision asynchronously
    const performSubdivision = async () => {
      try {
        let result: THREE.BufferGeometry;
        
        switch (algorithm) {
          case 'catmullClark':
          case 'loop':
            // These would require more complex implementation
            // Fall back to simple for now
            result = simpleSubdivide(geometry, level);
            break;
          case 'simple':
          default:
            result = simpleSubdivide(geometry, level);
            break;
        }
        
        onComplete?.(result);
        
        eventBus.emit('geometry:subdivisionComplete', { 
          level,
          vertexCount: result.getAttribute('position')?.count ?? 0,
        });
      } catch (error) {
        console.error('[MeshSubdivisionController] Subdivision failed:', error);
        eventBus.emit('geometry:subdivisionError', { 
          level,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        processingRef.current = false;
      }
    };
    
    // Use setTimeout to avoid blocking the main thread
    setTimeout(performSubdivision, 0);
  }, [geometry, level, algorithm, onComplete, enabled]);
  
  // This component doesn't render anything
  return null;
}

/**
 * Get estimated vertex count after subdivision
 */
export function estimateSubdividedVertexCount(
  originalCount: number,
  level: number
): number {
  // Each subdivision level roughly quadruples vertex count
  return originalCount * Math.pow(4, level);
}

/**
 * Get recommended max level based on vertex count
 */
export function getRecommendedMaxLevel(originalVertexCount: number): number {
  // Aim for max ~500k vertices
  const maxVertices = 500000;
  let level = 0;
  let count = originalVertexCount;
  
  while (count * 4 <= maxVertices && level < 4) {
    count *= 4;
    level++;
  }
  
  return level;
}

export default MeshSubdivisionController;
