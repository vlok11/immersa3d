// ============================================================
// Immersa 3D - DepthMesh Component
// Core 3D depth-displaced mesh using displacement shaders
// ============================================================

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewportStore, useAnalysisStore, useMediaStore } from '../../../store';

// Import shaders as raw strings
// Note: Requires vite-plugin-glsl or inline shaders
import vertexShader from '../shaders/displacement.vert?raw';
import fragmentShader from '../shaders/displacement.frag?raw';

// Object pool to avoid GC in render loop - per spec requirement
// Uncomment when implementing time-based animations:
// const TEMP_VECTOR = new THREE.Vector3();

/**
 * Props for DepthMesh component
 */
interface DepthMeshProps {
  onReady?: () => void;
}

/**
 * DepthMesh - Atomic 3D component for depth-displaced mesh
 * 
 * This component is allowed to use useFrame as it's an atomic-level 3D component.
 * Per spec: "useFrame must only exist in atomic-level 3D components (e.g., DepthMesh.tsx)"
 */
export function DepthMesh({ onReady }: DepthMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // useThree provides access to THREE.js context (gl, camera, scene, etc.)
  // Reserved for future use
  
  // Store subscriptions
  const depthIntensity = useViewportStore((s) => s.depthIntensity);
  const meshSubdivisions = useViewportStore((s) => s.meshSubdivisions);
  const wireframe = useViewportStore((s) => s.wireframe);
  const currentMedia = useMediaStore((s) => s.currentMedia);
  const depthResult = useAnalysisStore((s) => s.getDepthResult());
  
  // Memoized geometry - per spec: use useMemo for 3D objects
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      2, // width (will be scaled by aspect ratio)
      2, // height
      meshSubdivisions,
      meshSubdivisions
    );
    return geo;
  }, [meshSubdivisions]);
  
  // Cleanup geometry on unmount or change
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);
  
  // Memoized textures
  const { colorTexture, depthTexture } = useMemo(() => {
    const colorTex = new THREE.Texture();
    const depthTex = new THREE.Texture();
    
    // Default gray textures
    colorTex.image = createPlaceholderImage('#333333');
    depthTex.image = createPlaceholderImage('#808080');
    
    colorTex.needsUpdate = true;
    depthTex.needsUpdate = true;
    
    return { colorTexture: colorTex, depthTexture: depthTex };
  }, []);
  
  // Update color texture when media changes
  useEffect(() => {
    if (currentMedia?.dataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        colorTexture.image = img;
        colorTexture.needsUpdate = true;
        
        // Update geometry aspect ratio
        if (meshRef.current) {
          const aspect = img.width / img.height;
          meshRef.current.scale.set(aspect, 1, 1);
        }
      };
      img.src = currentMedia.dataUrl;
    }
    
    return () => {
      // Cleanup is handled by texture dispose
    };
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
  
  // Memoized shader material - per spec: complex materials must be memoized
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColorMap: { value: colorTexture },
        uDepthMap: { value: depthTexture },
        uDepthIntensity: { value: depthIntensity },
        uDepthScale: { value: 1.0 },
        uShowDepth: { value: false },
        uOpacity: { value: 1.0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: wireframe,
    });
  }, [colorTexture, depthTexture, depthIntensity, wireframe]);
  
  // Store material ref for uniform updates
  useEffect(() => {
    materialRef.current = shaderMaterial;
  }, [shaderMaterial]);
  
  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      shaderMaterial.dispose();
      colorTexture.dispose();
      depthTexture.dispose();
    };
  }, [shaderMaterial, colorTexture, depthTexture]);
  
  // Update uniforms reactively (outside render loop)
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uDepthIntensity.value = depthIntensity;
    }
  }, [depthIntensity]);
  
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.wireframe = wireframe;
    }
  }, [wireframe]);
  
  // Render loop - only for time-based animations
  // Per spec: Minimal work in useFrame, use object pool
  useFrame(() => {
    // Render loop reserved for time-based animations
    // Using object pool pattern: _TEMP_VECTOR.set(...) instead of new THREE.Vector3()
  });
  
  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial}>
      {/* Geometry and material attached via props */}
    </mesh>
  );
}

/**
 * Create a simple placeholder image
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
