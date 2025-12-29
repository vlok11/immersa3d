// ============================================================
// Immersa 3D - Parallax Projector Component
// Multi-layer depth separation for parallax effect
// ============================================================

import type { ReactElement } from 'react';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewportStore, useAnalysisStore, useMediaStore } from '../../../store';

/**
 * Depth layer configuration
 */
interface DepthLayer {
  minDepth: number;
  maxDepth: number;
  zOffset: number;
}

/**
 * Props for ParallaxProjector component
 */
interface ParallaxProjectorProps {
  layers?: number;
  layerSpacing?: number;
  subdivisions?: number;
  onReady?: () => void;
}

// Default layer configuration (3 layers)
const DEFAULT_LAYERS: DepthLayer[] = [
  { minDepth: 0.0, maxDepth: 0.33, zOffset: 0.0 },    // Background
  { minDepth: 0.33, maxDepth: 0.66, zOffset: 0.3 },   // Midground
  { minDepth: 0.66, maxDepth: 1.0, zOffset: 0.6 },    // Foreground
];

/**
 * ParallaxProjector - Multi-layer parallax depth separation
 * 
 * Separates image into multiple depth layers based on depth map,
 * creating a layered parallax effect when viewed from different angles.
 */
export function ParallaxProjector({
  layers = 3,
  layerSpacing = 0.3,
  subdivisions = 128,
  onReady,
}: ParallaxProjectorProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  
  // Store subscriptions
  const depthIntensity = useViewportStore((s) => s.depthIntensity);
  const wireframe = useViewportStore((s) => s.wireframe);
  const currentMedia = useMediaStore((s) => s.currentMedia);
  const depthResult = useAnalysisStore((s) => s.getDepthResult());
  
  // Generate layer configurations
  const layerConfigs = useMemo(() => {
    if (layers === 3) return DEFAULT_LAYERS;
    
    const configs: DepthLayer[] = [];
    const step = 1.0 / layers;
    
    for (let i = 0; i < layers; i++) {
      configs.push({
        minDepth: i * step,
        maxDepth: (i + 1) * step,
        zOffset: i * layerSpacing,
      });
    }
    
    return configs;
  }, [layers, layerSpacing]);
  
  // Memoized textures (shared across layers)
  const { colorTexture, depthTexture } = useMemo(() => {
    const colorTex = new THREE.Texture();
    const depthTex = new THREE.Texture();
    
    colorTex.image = createPlaceholderImage('#333333');
    depthTex.image = createPlaceholderImage('#808080');
    
    colorTex.needsUpdate = true;
    depthTex.needsUpdate = true;
    
    return { colorTexture: colorTex, depthTexture: depthTex };
  }, []);
  
  // Aspect ratio state
  const aspectRef = useRef(1);
  
  // Update color texture when media changes
  useEffect(() => {
    if (currentMedia?.dataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        colorTexture.image = img;
        colorTexture.needsUpdate = true;
        aspectRef.current = img.width / img.height;
        
        // Update group scale
        if (groupRef.current) {
          groupRef.current.scale.set(aspectRef.current, 1, 1);
        }
      };
      img.src = currentMedia.dataUrl;
    }
  }, [currentMedia?.dataUrl, colorTexture]);
  
  // Update depth texture when analysis completes
  useEffect(() => {
    if (depthResult?.depthTextureUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        depthTexture.image = img;
        depthTexture.needsUpdate = true;
        onReady?.();
      };
      img.src = depthResult.depthTextureUrl;
    }
  }, [depthResult?.depthTextureUrl, depthTexture, onReady]);
  
  // Memoized layer geometries
  const layerGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(2, 2, subdivisions, subdivisions);
  }, [subdivisions]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      layerGeometry.dispose();
      colorTexture.dispose();
      depthTexture.dispose();
    };
  }, [layerGeometry, colorTexture, depthTexture]);
  
  // Create layer materials
  const layerMaterials = useMemo(() => {
    return layerConfigs.map((config) => {
      return new THREE.ShaderMaterial({
        vertexShader: parallaxVertexShader,
        fragmentShader: parallaxFragmentShader,
        uniforms: {
          uColorMap: { value: colorTexture },
          uDepthMap: { value: depthTexture },
          uMinDepth: { value: config.minDepth },
          uMaxDepth: { value: config.maxDepth },
          uDepthIntensity: { value: depthIntensity },
        },
        transparent: true,
        side: THREE.DoubleSide,
        wireframe,
        depthWrite: true,
      });
    });
  }, [layerConfigs, colorTexture, depthTexture, depthIntensity, wireframe]);
  
  // Update uniforms
  useEffect(() => {
    layerMaterials.forEach((mat) => {
      mat.uniforms.uDepthIntensity.value = depthIntensity;
      mat.wireframe = wireframe;
    });
  }, [layerMaterials, depthIntensity, wireframe]);
  
  // Cleanup materials
  useEffect(() => {
    return () => {
      layerMaterials.forEach((mat) => mat.dispose());
    };
  }, [layerMaterials]);
  
  // Render loop
  useFrame(() => {
    // Reserved for time-based parallax animations
  });
  
  return (
    <group ref={groupRef}>
      {layerConfigs.map((config, index) => (
        <mesh
          key={index}
          geometry={layerGeometry}
          material={layerMaterials[index]}
          position={[0, 0, config.zOffset * depthIntensity]}
        />
      ))}
    </group>
  );
}

/**
 * Parallax layer vertex shader
 */
const parallaxVertexShader = `
  uniform sampler2D uDepthMap;
  uniform float uMinDepth;
  uniform float uMaxDepth;
  uniform float uDepthIntensity;
  
  varying vec2 vUv;
  varying float vAlpha;
  
  void main() {
    vUv = uv;
    
    // Sample depth
    float depth = texture2D(uDepthMap, uv).r;
    
    // Check if this vertex belongs to this layer
    vAlpha = (depth >= uMinDepth && depth < uMaxDepth) ? 1.0 : 0.0;
    
    // Small displacement based on depth within layer
    float layerDepth = (depth - uMinDepth) / (uMaxDepth - uMinDepth);
    float displacement = layerDepth * uDepthIntensity * 0.1;
    
    vec3 pos = position;
    pos.z += displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

/**
 * Parallax layer fragment shader
 */
const parallaxFragmentShader = `
  uniform sampler2D uColorMap;
  uniform sampler2D uDepthMap;
  uniform float uMinDepth;
  uniform float uMaxDepth;
  
  varying vec2 vUv;
  varying float vAlpha;
  
  void main() {
    // Sample depth again for accurate masking
    float depth = texture2D(uDepthMap, vUv).r;
    
    // Smooth layer transition
    float inLayer = smoothstep(uMinDepth - 0.02, uMinDepth + 0.02, depth) *
                    (1.0 - smoothstep(uMaxDepth - 0.02, uMaxDepth + 0.02, depth));
    
    if (inLayer < 0.01) {
      discard;
    }
    
    vec4 color = texture2D(uColorMap, vUv);
    gl_FragColor = vec4(color.rgb, color.a * inLayer);
  }
`;

/**
 * Create placeholder image
 */
function createPlaceholderImage(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
  }
  
  return canvas;
}

export default ParallaxProjector;
