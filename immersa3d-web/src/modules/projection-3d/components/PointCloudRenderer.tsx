// ============================================================
// Immersa 3D - Point Cloud Renderer Component
// GPU-accelerated point cloud visualization
// ============================================================

import type { ReactElement } from 'react';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewportStore, useAnalysisStore, useMediaStore } from '../../../store';

import vertexShader from '../shaders/pointcloud.vert?raw';
import fragmentShader from '../shaders/pointcloud.frag?raw';

/**
 * Props for PointCloudRenderer component
 */
interface PointCloudRendererProps {
  resolution?: number;
  pointSize?: number;
  depthCutoff?: number;
  onReady?: () => void;
}

/**
 * PointCloudRenderer - GPU-accelerated point cloud visualization
 * 
 * Renders image as a 3D point cloud based on depth values.
 * Supports dynamic point size and depth-based culling.
 */
export function PointCloudRenderer({
  resolution = 256,
  pointSize = 3.0,
  depthCutoff = 0.05,
  onReady,
}: PointCloudRendererProps): ReactElement {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Store subscriptions
  const depthIntensity = useViewportStore((s) => s.depthIntensity);
  const currentMedia = useMediaStore((s) => s.currentMedia);
  const depthResult = useAnalysisStore((s) => s.getDepthResult());
  
  // Memoized textures
  const { colorTexture, depthTexture } = useMemo(() => {
    const colorTex = new THREE.Texture();
    const depthTex = new THREE.Texture();
    
    colorTex.image = createPlaceholderImage('#333333');
    depthTex.image = createPlaceholderImage('#808080');
    
    colorTex.needsUpdate = true;
    depthTex.needsUpdate = true;
    
    // Use nearest filtering for crisp sampling
    colorTex.minFilter = THREE.NearestFilter;
    colorTex.magFilter = THREE.NearestFilter;
    depthTex.minFilter = THREE.NearestFilter;
    depthTex.magFilter = THREE.NearestFilter;
    
    return { colorTexture: colorTex, depthTexture: depthTex };
  }, []);
  
  // Memoized point geometry
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // Create grid of points
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Normalized coordinates [-1, 1]
        const px = (x / (resolution - 1)) * 2 - 1;
        const py = (y / (resolution - 1)) * 2 - 1;
        
        positions.push(px, -py, 0); // Flip Y for image coordinates
        
        // UV coordinates [0, 1]
        uvs.push(x / (resolution - 1), 1 - y / (resolution - 1));
        
        indices.push(y * resolution + x);
      }
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    
    return geo;
  }, [resolution]);
  
  // Cleanup geometry
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);
  
  // Update color texture when media changes
  useEffect(() => {
    if (currentMedia?.dataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        colorTexture.image = img;
        colorTexture.needsUpdate = true;
        
        // Update aspect ratio
        if (pointsRef.current) {
          const aspect = img.width / img.height;
          pointsRef.current.scale.set(aspect, 1, 1);
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
  
  // Memoized shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColorMap: { value: colorTexture },
        uDepthMap: { value: depthTexture },
        uDepthIntensity: { value: depthIntensity },
        uPointSize: { value: pointSize },
        uDepthCutoff: { value: depthCutoff },
        uResolution: { value: new THREE.Vector2(resolution, resolution) },
      },
      transparent: true,
      depthWrite: true,
      depthTest: true,
    });
  }, [colorTexture, depthTexture, depthIntensity, pointSize, depthCutoff, resolution]);
  
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
      materialRef.current.uniforms.uPointSize.value = pointSize;
    }
  }, [pointSize]);
  
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uDepthCutoff.value = depthCutoff;
    }
  }, [depthCutoff]);
  
  // Render loop
  useFrame(() => {
    // Reserved for time-based animations
  });
  
  return (
    <points ref={pointsRef} geometry={geometry} material={shaderMaterial} />
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

export default PointCloudRenderer;
