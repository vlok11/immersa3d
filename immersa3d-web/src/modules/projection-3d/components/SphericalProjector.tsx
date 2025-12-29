// ============================================================
// Immersa 3D - Spherical Projector Component
// 360-degree VR panoramic projection
// ============================================================

import type { ReactElement } from 'react';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewportStore, useAnalysisStore, useMediaStore } from '../../../store';

import vertexShader from '../shaders/spherical.vert?raw';
import fragmentShader from '../shaders/spherical.frag?raw';

/**
 * Props for SphericalProjector component
 */
interface SphericalProjectorProps {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  onReady?: () => void;
}

/**
 * SphericalProjector - 360° VR panoramic projection
 * 
 * Projects image onto a sphere interior for VR viewing.
 * Uses BackSide material to view from inside the sphere.
 */
export function SphericalProjector({
  radius = 50,
  widthSegments = 64,
  heightSegments = 32,
  onReady,
}: SphericalProjectorProps): ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Store subscriptions
  const depthIntensity = useViewportStore((s) => s.depthIntensity);
  const wireframe = useViewportStore((s) => s.wireframe);
  const currentMedia = useMediaStore((s) => s.currentMedia);
  const depthResult = useAnalysisStore((s) => s.getDepthResult());
  
  // Memoized sphere geometry - BackSide for interior viewing
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(
      radius,
      widthSegments,
      heightSegments
    );
    
    // Flip normals for interior viewing
    geo.scale(-1, 1, 1);
    
    return geo;
  }, [radius, widthSegments, heightSegments]);
  
  // Cleanup geometry
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);
  
  // Memoized textures
  const { colorTexture, depthTexture } = useMemo(() => {
    const colorTex = new THREE.Texture();
    const depthTex = new THREE.Texture();
    
    colorTex.image = createPlaceholderImage('#1a1a2e');
    depthTex.image = createPlaceholderImage('#808080');
    
    colorTex.needsUpdate = true;
    depthTex.needsUpdate = true;
    
    // Set wrapping for spherical mapping
    colorTex.wrapS = THREE.RepeatWrapping;
    colorTex.wrapT = THREE.ClampToEdgeWrapping;
    depthTex.wrapS = THREE.RepeatWrapping;
    depthTex.wrapT = THREE.ClampToEdgeWrapping;
    
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
  
  // Memoized shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColorMap: { value: colorTexture },
        uDepthMap: { value: depthTexture },
        uDepthIntensity: { value: depthIntensity },
        uRadius: { value: radius },
        uOpacity: { value: 1.0 },
      },
      side: THREE.BackSide,
      transparent: true,
      wireframe,
    });
  }, [colorTexture, depthTexture, depthIntensity, radius, wireframe]);
  
  // Store material ref
  useEffect(() => {
    materialRef.current = shaderMaterial;
  }, [shaderMaterial]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      shaderMaterial.dispose();
      colorTexture.dispose();
      depthTexture.dispose();
    };
  }, [shaderMaterial, colorTexture, depthTexture]);
  
  // Update uniforms reactively
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
  
  // Render loop for animations
  useFrame(() => {
    // Reserved for time-based animations
  });
  
  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial} />
  );
}

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

export default SphericalProjector;
