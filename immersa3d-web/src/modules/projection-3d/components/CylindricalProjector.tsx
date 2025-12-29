// ============================================================
// Immersa 3D - Cylindrical Projector Component
// 180-degree panoramic cylindrical projection
// ============================================================

import type { ReactElement } from 'react';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewportStore, useAnalysisStore, useMediaStore } from '../../../store';

import vertexShader from '../shaders/cylindrical.vert?raw';
import fragmentShader from '../shaders/cylindrical.frag?raw';

/**
 * Props for CylindricalProjector component
 */
interface CylindricalProjectorProps {
  radius?: number;
  height?: number;
  radialSegments?: number;
  heightSegments?: number;
  thetaStart?: number;
  thetaLength?: number;
  onReady?: () => void;
}

/**
 * CylindricalProjector - 180° panoramic projection
 * 
 * Projects image onto a cylindrical surface for wide-angle viewing.
 * Suitable for panoramic images that don't cover full 360°.
 */
export function CylindricalProjector({
  radius = 10,
  height = 6,
  radialSegments = 64,
  heightSegments = 32,
  thetaStart = Math.PI * 0.25,
  thetaLength = Math.PI * 0.5,
  onReady,
}: CylindricalProjectorProps): ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Store subscriptions
  const depthIntensity = useViewportStore((s) => s.depthIntensity);
  const wireframe = useViewportStore((s) => s.wireframe);
  const currentMedia = useMediaStore((s) => s.currentMedia);
  const depthResult = useAnalysisStore((s) => s.getDepthResult());
  
  // Memoized cylinder geometry
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      radius,           // radiusTop
      radius,           // radiusBottom
      height,           // height
      radialSegments,   // radialSegments
      heightSegments,   // heightSegments
      true,             // openEnded
      thetaStart,       // thetaStart
      thetaLength       // thetaLength
    );
    
    // Flip for interior viewing
    geo.scale(-1, 1, 1);
    
    // Rotate to face camera
    geo.rotateY(Math.PI);
    
    return geo;
  }, [radius, height, radialSegments, heightSegments, thetaStart, thetaLength]);
  
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
  
  // Render loop
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

export default CylindricalProjector;
