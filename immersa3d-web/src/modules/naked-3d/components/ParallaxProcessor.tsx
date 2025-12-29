// ============================================================
// Immersa 3D - Parallax Processor Component
// Fragment shader-based parallax offset rendering
// ============================================================

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ParallaxOffset } from '../Naked3DModule';
import { eventBus } from '../../../core/events';

/**
 * Parallax Processor Props
 */
interface ParallaxProcessorProps {
  /** Color/albedo texture */
  colorMap: THREE.Texture | null;
  /** Depth map texture */
  depthMap: THREE.Texture | null;
  /** Parallax intensity */
  intensity?: number;
  /** Current offset (external control) */
  offset?: ParallaxOffset;
  /** Enable internal offset tracking */
  autoTrack?: boolean;
  /** Layer index for multi-layer */
  layerIndex?: number;
  /** Total layer count */
  layerCount?: number;
}

/**
 * Parallax shader uniforms
 */
interface ParallaxUniforms {
  [uniform: string]: { value: unknown };
  uColorMap: { value: THREE.Texture | null };
  uDepthMap: { value: THREE.Texture | null };
  uOffset: { value: THREE.Vector2 };
  uIntensity: { value: number };
  uLayerDepth: { value: number };
}

/**
 * Parallax shader material
 */
const PARALLAX_SHADER = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: /* glsl */ `
    uniform sampler2D uColorMap;
    uniform sampler2D uDepthMap;
    uniform vec2 uOffset;
    uniform float uIntensity;
    uniform float uLayerDepth;
    
    varying vec2 vUv;
    
    void main() {
      // Sample depth at current UV
      float depth = texture2D(uDepthMap, vUv).r;
      
      // Calculate parallax offset based on depth
      // Core formula: Offset = Input * Depth * Intensity
      vec2 parallaxOffset = uOffset * depth * uIntensity * uLayerDepth;
      
      // Apply offset to UV
      vec2 offsetUv = vUv + parallaxOffset;
      
      // Clamp to valid UV range
      offsetUv = clamp(offsetUv, 0.0, 1.0);
      
      // Sample color with offset UV
      vec4 color = texture2D(uColorMap, offsetUv);
      
      gl_FragColor = color;
    }
  `,
};

/**
 * Create parallax material
 */
function createParallaxMaterial(uniforms: ParallaxUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: PARALLAX_SHADER.vertexShader,
    fragmentShader: PARALLAX_SHADER.fragmentShader,
    transparent: true,
  });
}

// Reusable vector to avoid allocation
const offsetVector = new THREE.Vector2();

/**
 * Parallax Processor Component
 * Applies parallax offset to textures using depth map
 */
export function ParallaxProcessor({
  colorMap,
  depthMap,
  intensity = 1.0,
  offset,
  autoTrack = false,
  layerIndex = 0,
  layerCount = 1,
}: ParallaxProcessorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  // Internal offset state for auto-tracking
  const internalOffset = useRef<ParallaxOffset>({ x: 0, y: 0 });
  
  // Calculate layer depth multiplier
  const layerDepth = useMemo(() => {
    if (layerCount <= 1) return 1;
    return (layerIndex + 1) / layerCount;
  }, [layerIndex, layerCount]);
  
  // Create uniforms ref to avoid recreating
  // Using == null pattern as recommended by React for lazy ref initialization
  const uniformsRef = useRef<ParallaxUniforms | null>(null);
  if (uniformsRef.current == null) {
    uniformsRef.current = {
      uColorMap: { value: colorMap },
      uDepthMap: { value: depthMap },
      uOffset: { value: new THREE.Vector2(0, 0) },
      uIntensity: { value: intensity },
      uLayerDepth: { value: layerDepth },
    };
  }
  
  // Create material - access uniformsRef.current inside useMemo to avoid render-time ref access
  // The empty deps array is intentional - we only want to create the material once
  const material = useMemo(() => {
    // This is safe because uniformsRef.current is guaranteed to be initialized above
    return createParallaxMaterial(uniformsRef.current!);
  }, []);
  
  // Update uniforms when props change
  useEffect(() => {
    if (!uniformsRef.current) return;
    uniformsRef.current.uColorMap.value = colorMap;
    uniformsRef.current.uDepthMap.value = depthMap;
    uniformsRef.current.uIntensity.value = intensity;
    uniformsRef.current.uLayerDepth.value = layerDepth;
  }, [colorMap, depthMap, intensity, layerDepth]);
  
  // Subscribe to offset updates if auto-tracking
  useEffect(() => {
    if (!autoTrack) return;
    
    const handleOffset = (payload: { offset: ParallaxOffset }) => {
      internalOffset.current = payload.offset;
    };
    
    eventBus.on('naked3d:offsetUpdate', handleOffset);
    
    return () => {
      eventBus.off('naked3d:offsetUpdate', handleOffset);
    };
  }, [autoTrack]);
  
  // Update offset in render loop
  useFrame(() => {
    const currentOffset = offset ?? internalOffset.current;
    
    offsetVector.set(currentOffset.x, currentOffset.y);
    if (uniformsRef.current) {
      uniformsRef.current.uOffset.value.copy(offsetVector);
    }
  });
  
  // Cleanup
  useEffect(() => {
    materialRef.current = material;
    
    return () => {
      material.dispose();
    };
  }, [material]);
  
  if (!colorMap || !depthMap) {
    return null;
  }
  
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default ParallaxProcessor;
