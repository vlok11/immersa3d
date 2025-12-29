// ============================================================
// ============================================================
// Immersa 3D - Skybox Manager Component
// Background environment management
// Note: Scene modification is standard Three.js practice
// ============================================================

import type { ReactElement } from 'react';
import { useMemo, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Skybox type
 */
type SkyboxType = 'color' | 'gradient' | 'hdri';

/**
 * Skybox manager props
 */
interface SkyboxManagerProps {
  type?: SkyboxType;
  color?: string;
  gradientTop?: string;
  gradientBottom?: string;
  enabled?: boolean;
}

/**
 * SkyboxManager - Manage scene background
 * 
 * Supports:
 * - Solid color background
 * - Gradient background (requires custom shader)
 * - HDRI environment maps (loaded separately)
 */
export function SkyboxManager({
  type = 'gradient',
  color = '#1a1a2e',
  gradientTop = '#1a1a2e',
  gradientBottom = '#2d2d44',
  enabled = true,
}: SkyboxManagerProps): ReactElement | null {
  const { scene } = useThree();
  const textureRef = useRef<THREE.Texture | null>(null);
  
  // Create background based on type
  useEffect(() => {
    if (!enabled) {
      scene.background = null;
      return;
    }
    
    switch (type) {
      case 'color':
        scene.background = new THREE.Color(color);
        break;
      
      case 'gradient': {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 256;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 0, 256);
          gradient.addColorStop(0, gradientTop);
          gradient.addColorStop(1, gradientBottom);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 2, 256);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        textureRef.current = texture;
        scene.background = texture;
        break;
      }
      
      case 'hdri':
        // HDRI loading handled externally
        break;
    }
    
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      scene.background = null;
    };
  }, [scene, type, color, gradientTop, gradientBottom, enabled]);
  
  // Render gradient mesh for more control (alternative approach)
  if (type === 'gradient' && enabled) {
    return <GradientBackground topColor={gradientTop} bottomColor={gradientBottom} />;
  }
  
  return null;
}

/**
 * Gradient background mesh
 */
function GradientBackground({ 
  topColor, 
  bottomColor 
}: { 
  topColor: string; 
  bottomColor: string;
}): ReactElement {
  const { scene } = useThree();
  
  // Create gradient material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        varying vec2 vUv;
        
        void main() {
          vec3 color = mix(uBottomColor, uTopColor, vUv.y);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uTopColor: { value: new THREE.Color(topColor) },
        uBottomColor: { value: new THREE.Color(bottomColor) },
      },
      depthWrite: false,
      depthTest: false,
    });
  }, [topColor, bottomColor]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);
  
  // Set scene background color as fallback
  useEffect(() => {
    scene.background = new THREE.Color(bottomColor);
    return () => {
      scene.background = null;
    };
  }, [scene, bottomColor]);
  
  return <></>;
}

export default SkyboxManager;
