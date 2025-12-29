// ============================================================
// Immersa 3D - Pyramid View Generator
// Generates 4 views rotated 90° for hologram pyramid
// ============================================================

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

import { hologramModule } from '../HologramModule';

/**
 * Pyramid View Generator Props
 */
interface PyramidViewGeneratorProps {
  /** Scene to render */
  scene: THREE.Scene;
  /** View resolution */
  resolution?: number;
  /** Background color */
  backgroundColor?: string;
  /** Background opacity */
  backgroundOpacity?: number;
  /** Callback with combined texture */
  onRender?: (texture: THREE.Texture) => void;
}

// View rendering handled in useFrame loop

/**
 * Pyramid View Generator Component
 * Renders scene from 4 angles (0°, 90°, 180°, 270°) for hologram pyramid display
 */
export function PyramidViewGenerator({
  scene,
  resolution = 512,
  backgroundColor = '#000000',
  backgroundOpacity = 0,
  onRender,
}: PyramidViewGeneratorProps) {
  const { gl } = useThree();
  
  // Create cameras for each view
  const cameras = useMemo(() => {
    return [0, 90, 180, 270].map((angle) => {
      const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      // Position will be set in render loop
      return { camera: cam, angle };
    });
  }, []);
  
  // Create FBOs for each view
  const fbo0 = useFBO(resolution, resolution);
  const fbo1 = useFBO(resolution, resolution);
  const fbo2 = useFBO(resolution, resolution);
  const fbo3 = useFBO(resolution, resolution);
  const fbos = [fbo0, fbo1, fbo2, fbo3];
  
  // Combined FBO (2x2 grid)
  const combinedFBO = useFBO(resolution * 2, resolution * 2);
  
  // Material for combining views
  const combineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uView0: { value: fbo0.texture },
        uView1: { value: fbo1.texture },
        uView2: { value: fbo2.texture },
        uView3: { value: fbo3.texture },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uView0;
        uniform sampler2D uView1;
        uniform sampler2D uView2;
        uniform sampler2D uView3;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          vec4 color;
          
          // 2x2 grid layout
          // Top-left: view 0 (Top)
          // Top-right: view 1 (Right) 
          // Bottom-left: view 3 (Left)
          // Bottom-right: view 2 (Bottom)
          
          if (uv.x < 0.5 && uv.y >= 0.5) {
            // Top-left
            color = texture2D(uView0, vec2(uv.x * 2.0, (uv.y - 0.5) * 2.0));
          } else if (uv.x >= 0.5 && uv.y >= 0.5) {
            // Top-right
            color = texture2D(uView1, vec2((uv.x - 0.5) * 2.0, (uv.y - 0.5) * 2.0));
          } else if (uv.x < 0.5 && uv.y < 0.5) {
            // Bottom-left
            color = texture2D(uView3, vec2(uv.x * 2.0, uv.y * 2.0));
          } else {
            // Bottom-right
            color = texture2D(uView2, vec2((uv.x - 0.5) * 2.0, uv.y * 2.0));
          }
          
          gl_FragColor = color;
        }
      `,
    });
  }, [fbo0, fbo1, fbo2, fbo3]);
  
  // Combine scene and camera for offscreen rendering
  const combineScene = useMemo(() => {
    const s = new THREE.Scene();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      combineMaterial
    );
    s.add(mesh);
    return s;
  }, [combineMaterial]);
  
  const combineCamera = useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }, []);
  
  // Center point to orbit around
  const orbitCenter = useRef(new THREE.Vector3(0, 0, 0));
  const orbitRadius = 5;
  const orbitHeight = 1;
  
  // Render each view
  useFrame(() => {
    if (!scene) return;
    
    const baseRotation = hologramModule.getRotation();
    const bgColor = new THREE.Color(backgroundColor);
    
    // Render each view
    cameras.forEach(({ camera, angle }, index) => {
      const totalAngle = (angle + baseRotation) * (Math.PI / 180);
      
      // Position camera on orbit
      camera.position.set(
        orbitCenter.current.x + Math.sin(totalAngle) * orbitRadius,
        orbitCenter.current.y + orbitHeight,
        orbitCenter.current.z + Math.cos(totalAngle) * orbitRadius
      );
      camera.lookAt(orbitCenter.current);
      
      // Render to FBO
      const currentRT = gl.getRenderTarget();
      const currentClearColor = gl.getClearColor(new THREE.Color());
      const currentClearAlpha = gl.getClearAlpha();
      
      gl.setRenderTarget(fbos[index]);
      gl.setClearColor(bgColor, backgroundOpacity);
      gl.clear();
      gl.render(scene, camera);
      
      gl.setClearColor(currentClearColor, currentClearAlpha);
      gl.setRenderTarget(currentRT);
    });
    
    // Combine views
    combineMaterial.uniforms.uView0.value = fbo0.texture;
    combineMaterial.uniforms.uView1.value = fbo1.texture;
    combineMaterial.uniforms.uView2.value = fbo2.texture;
    combineMaterial.uniforms.uView3.value = fbo3.texture;
    
    const currentRT = gl.getRenderTarget();
    gl.setRenderTarget(combinedFBO);
    gl.render(combineScene, combineCamera);
    gl.setRenderTarget(currentRT);
    
    // Callback with combined texture
    onRender?.(combinedFBO.texture);
  });
  
  // Cleanup
  // Note: FBOs are cleaned up by useFBO hook
  
  return null;
}

export default PyramidViewGenerator;
