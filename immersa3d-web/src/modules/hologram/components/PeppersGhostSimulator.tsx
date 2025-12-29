// ============================================================
// Immersa 3D - Peppers Ghost Simulator
// Screen-based Pepper's Ghost hologram effect
// ============================================================

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Peppers Ghost Simulator Props
 */
interface PeppersGhostSimulatorProps {
  /** Scene to render */
  scene: THREE.Scene | null;
  /** Enable glow effect */
  enableGlow?: boolean;
  /** Glow intensity */
  glowIntensity?: number;
  /** Ghost opacity */
  opacity?: number;
  /** Output resolution */
  resolution?: number;
  /** Reflection flip mode */
  flipMode?: 'horizontal' | 'vertical' | 'both';
  /** Background color */
  backgroundColor?: string;
  /** Callback with output texture */
  onRender?: (texture: THREE.Texture) => void;
}

/**
 * Peppers Ghost post-processing shader
 */
const GHOST_SHADER = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: /* glsl */ `
    uniform sampler2D uScene;
    uniform float uOpacity;
    uniform float uGlowIntensity;
    uniform bool uFlipHorizontal;
    uniform bool uFlipVertical;
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      
      // Apply flip
      if (uFlipHorizontal) uv.x = 1.0 - uv.x;
      if (uFlipVertical) uv.y = 1.0 - uv.y;
      
      vec4 color = texture2D(uScene, uv);
      
      // Calculate luminance for glow
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      
      // Add glow to bright areas
      vec3 glow = color.rgb * luminance * uGlowIntensity;
      color.rgb += glow;
      
      // Apply opacity
      color.a *= uOpacity;
      
      // Pepper's Ghost effect works best with high contrast
      // Enhance bright areas, suppress dark areas
      color.rgb = pow(color.rgb, vec3(0.8));
      
      gl_FragColor = color;
    }
  `,
};

/**
 * Peppers Ghost Simulator Component
 * Simulates the classic Pepper's Ghost illusion effect
 */
export function PeppersGhostSimulator({
  scene,
  enableGlow = true,
  glowIntensity = 0.5,
  opacity = 0.8,
  resolution = 1024,
  flipMode = 'vertical',
  backgroundColor = '#000000',
  onRender,
}: PeppersGhostSimulatorProps) {
  const { gl, camera } = useThree();
  
  // Create FBO for scene rendering
  const sceneFBO = useFBO(resolution, resolution, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  
  // Create FBO for final output
  const outputFBO = useFBO(resolution, resolution);
  
  // Ghost effect material
  const ghostMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: null },
        uOpacity: { value: opacity },
        uGlowIntensity: { value: glowIntensity },
        uFlipHorizontal: { value: flipMode === 'horizontal' || flipMode === 'both' },
        uFlipVertical: { value: flipMode === 'vertical' || flipMode === 'both' },
      },
      vertexShader: GHOST_SHADER.vertexShader,
      fragmentShader: GHOST_SHADER.fragmentShader,
      transparent: true,
    });
  }, [opacity, glowIntensity, flipMode]);
  
  // Post-processing scene
  const postScene = useMemo(() => {
    const s = new THREE.Scene();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      ghostMaterial
    );
    s.add(mesh);
    return s;
  }, [ghostMaterial]);
  
  const postCamera = useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }, []);
  
  // Update uniforms
  useEffect(() => {
    ghostMaterial.uniforms.uOpacity.value = opacity;
    ghostMaterial.uniforms.uGlowIntensity.value = enableGlow ? glowIntensity : 0;
    ghostMaterial.uniforms.uFlipHorizontal.value = flipMode === 'horizontal' || flipMode === 'both';
    ghostMaterial.uniforms.uFlipVertical.value = flipMode === 'vertical' || flipMode === 'both';
  }, [opacity, glowIntensity, enableGlow, flipMode, ghostMaterial]);
  
  // Render loop
  useFrame(() => {
    if (!scene) return;
    
    const bgColor = new THREE.Color(backgroundColor);
    const currentRT = gl.getRenderTarget();
    const currentClearColor = gl.getClearColor(new THREE.Color());
    const currentClearAlpha = gl.getClearAlpha();
    
    // Render scene to FBO
    gl.setRenderTarget(sceneFBO);
    gl.setClearColor(bgColor, 0);
    gl.clear();
    gl.render(scene, camera);
    
    // Apply ghost effect
    ghostMaterial.uniforms.uScene.value = sceneFBO.texture;
    
    gl.setRenderTarget(outputFBO);
    gl.setClearColor(bgColor, 0);
    gl.clear();
    gl.render(postScene, postCamera);
    
    // Restore
    gl.setClearColor(currentClearColor, currentClearAlpha);
    gl.setRenderTarget(currentRT);
    
    // Callback
    onRender?.(outputFBO.texture);
  });
  
  return null;
}

/**
 * Peppers Ghost Display Component
 * Renders the ghost effect to screen with proper layering
 */
interface PeppersGhostDisplayProps {
  /** Texture from PeppersGhostSimulator */
  texture: THREE.Texture | null;
  /** Display scale */
  scale?: number;
  /** Position offset */
  position?: [number, number, number];
}

export function PeppersGhostDisplay({
  texture,
  scale = 1,
  position = [0, 0, 0],
}: PeppersGhostDisplayProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [texture]);
  
  useEffect(() => {
    if (material) {
      material.map = texture;
      material.needsUpdate = true;
    }
  }, [texture, material]);
  
  if (!texture) return null;
  
  return (
    <mesh ref={meshRef} position={position} scale={[scale, scale, 1]}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default PeppersGhostSimulator;
