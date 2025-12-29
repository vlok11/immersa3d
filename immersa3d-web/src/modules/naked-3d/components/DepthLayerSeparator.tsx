// ============================================================
// Immersa 3D - Depth Layer Separator Component
// Separates image into depth-based layers for parallax
// ============================================================

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ParallaxOffset } from '../Naked3DModule';
import { eventBus } from '../../../core/events';

/**
 * Depth Layer Separator Props
 */
interface DepthLayerSeparatorProps {
  /** Color/albedo texture */
  colorMap: THREE.Texture;
  /** Depth map texture */
  depthMap: THREE.Texture;
  /** Number of depth layers */
  layerCount?: number;
  /** Layer separation distance in Z */
  separation?: number;
  /** Parallax intensity per layer */
  intensity?: number;
  /** Enable edge feathering */
  featherEdges?: boolean;
  /** Feather width */
  featherWidth?: number;
  /** Current parallax offset */
  offset?: ParallaxOffset;
  /** Auto-track offset from events */
  autoTrack?: boolean;
}

/**
 * Layer shader uniforms
 */
interface LayerUniforms {
  [uniform: string]: { value: unknown };
  uColorMap: { value: THREE.Texture };
  uDepthMap: { value: THREE.Texture };
  uOffset: { value: THREE.Vector2 };
  uIntensity: { value: number };
  uDepthMin: { value: number };
  uDepthMax: { value: number };
  uFeather: { value: number };
  uFeatherEnabled: { value: boolean };
}

/**
 * Layer separation shader
 */
const LAYER_SHADER = {
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
    uniform float uDepthMin;
    uniform float uDepthMax;
    uniform float uFeather;
    uniform bool uFeatherEnabled;
    
    varying vec2 vUv;
    
    void main() {
      // Sample depth
      float depth = texture2D(uDepthMap, vUv).r;
      
      // Check if depth is within layer range
      float inLayer = step(uDepthMin, depth) * step(depth, uDepthMax);
      
      // Calculate feathered alpha at edges
      float alpha = inLayer;
      
      if (uFeatherEnabled && inLayer > 0.0) {
        // Feather at min edge
        float minDist = (depth - uDepthMin) / uFeather;
        // Feather at max edge
        float maxDist = (uDepthMax - depth) / uFeather;
        
        float featherAlpha = min(minDist, maxDist);
        featherAlpha = clamp(featherAlpha, 0.0, 1.0);
        
        alpha = featherAlpha;
      }
      
      // If not in layer, discard
      if (alpha < 0.01) {
        discard;
      }
      
      // Calculate parallax offset for this layer
      float layerDepth = (depth - uDepthMin) / (uDepthMax - uDepthMin);
      vec2 parallaxOffset = uOffset * layerDepth * uIntensity;
      
      // Apply offset to UV
      vec2 offsetUv = clamp(vUv + parallaxOffset, 0.0, 1.0);
      
      // Sample color
      vec4 color = texture2D(uColorMap, offsetUv);
      color.a *= alpha;
      
      gl_FragColor = color;
    }
  `,
};

// Reusable offset vector
const offsetVector = new THREE.Vector2();

/**
 * Single depth layer component
 */
interface DepthLayerProps {
  colorMap: THREE.Texture;
  depthMap: THREE.Texture;
  depthMin: number;
  depthMax: number;
  layerIndex: number;
  separation: number;
  intensity: number;
  featherEnabled: boolean;
  featherWidth: number;
  offset: ParallaxOffset;
}

function DepthLayer({
  colorMap,
  depthMap,
  depthMin,
  depthMax,
  layerIndex,
  separation,
  intensity,
  featherEnabled,
  featherWidth,
  offset,
}: DepthLayerProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Use useRef for uniforms - Three.js uniforms are mutable by design
  // Store initial values and update via ref to satisfy React rules
  const uniformsRef = useRef<LayerUniforms | null>(null);
  
  // Initialize uniforms once using lazy initialization pattern
  const getUniforms = (): LayerUniforms => {
    if (uniformsRef.current === null) {
      uniformsRef.current = {
        uColorMap: { value: colorMap },
        uDepthMap: { value: depthMap },
        uOffset: { value: new THREE.Vector2(offset.x, offset.y) },
        uIntensity: { value: intensity },
        uDepthMin: { value: depthMin },
        uDepthMax: { value: depthMax },
        uFeather: { value: featherWidth },
        uFeatherEnabled: { value: featherEnabled },
      };
    }
    return uniformsRef.current;
  };
  
  // Get uniforms for JSX (called once during render)
  const uniforms = getUniforms();
  
  // Update uniforms each frame (avoids useEffect mutation issues)
  useFrame(() => {
    const u = uniformsRef.current;
    if (!u) return;
    
    // Update all uniforms
    u.uColorMap.value = colorMap;
    u.uDepthMap.value = depthMap;
    u.uIntensity.value = intensity;
    u.uDepthMin.value = depthMin;
    u.uDepthMax.value = depthMax;
    u.uFeather.value = featherWidth;
    u.uFeatherEnabled.value = featherEnabled;
    
    // Update offset
    offsetVector.set(offset.x, offset.y);
    u.uOffset.value.copy(offsetVector);
  });
  
  const zPosition = layerIndex * separation;
  
  return (
    <mesh position={[0, 0, zPosition]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={LAYER_SHADER.vertexShader}
        fragmentShader={LAYER_SHADER.fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Depth Layer Separator Component
 * Creates multiple depth-separated layers for parallax effect
 */
export function DepthLayerSeparator({
  colorMap,
  depthMap,
  layerCount = 3,
  separation = 0.02,
  intensity = 0.1,
  featherEdges = true,
  featherWidth = 0.1,
  offset,
  autoTrack = false,
}: DepthLayerSeparatorProps) {
  // Use state for offset to trigger re-renders when tracking
  const [internalOffset, setInternalOffset] = React.useState<ParallaxOffset>({ x: 0, y: 0 });
  
  // Calculate depth ranges for each layer
  const layers = useMemo(() => {
    const result: Array<{ min: number; max: number }> = [];
    const step = 1 / layerCount;
    
    for (let i = 0; i < layerCount; i++) {
      result.push({
        min: i * step,
        max: (i + 1) * step,
      });
    }
    
    return result;
  }, [layerCount]);
  
  // Subscribe to offset updates if auto-tracking
  useEffect(() => {
    if (!autoTrack) return;
    
    const handleOffset = (payload: { offset: ParallaxOffset }) => {
      setInternalOffset(payload.offset);
    };
    
    eventBus.on('naked3d:offsetUpdate', handleOffset);
    
    return () => {
      eventBus.off('naked3d:offsetUpdate', handleOffset);
    };
  }, [autoTrack]);
  
  // Use provided offset or internal tracked offset
  const currentOffset = offset ?? internalOffset;
  
  return (
    <group>
      {layers.map((layer, index) => (
        <DepthLayer
          key={`layer-${index}`}
          colorMap={colorMap}
          depthMap={depthMap}
          depthMin={layer.min}
          depthMax={layer.max}
          layerIndex={index}
          separation={separation}
          intensity={intensity * ((index + 1) / layerCount)}
          featherEnabled={featherEdges}
          featherWidth={featherWidth}
          offset={currentOffset}
        />
      ))}
    </group>
  );
}

export default DepthLayerSeparator;
