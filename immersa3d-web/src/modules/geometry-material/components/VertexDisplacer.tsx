// ============================================================
// Immersa 3D - Vertex Displacer Component
// Displacement map strength control
// ============================================================

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { eventBus } from '../../../core/events';

/**
 * Vertex Displacer Props
 */
interface VertexDisplacerProps {
  /** Displacement map texture */
  displacementMap: THREE.Texture | null;
  /** Displacement scale (strength) */
  scale: number;
  /** Bias offset */
  bias?: number;
  /** Normal map for displacement shading */
  normalMap?: THREE.Texture | null;
  /** Target mesh ref */
  meshRef?: React.RefObject<THREE.Mesh>;
  /** Whether displacement is enabled */
  enabled?: boolean;
  /** Animate displacement */
  animated?: boolean;
  /** Animation speed */
  animationSpeed?: number;
}

/**
 * Displacement material uniform interface
 */
interface DisplacementUniforms {
  uDisplacementMap: { value: THREE.Texture | null };
  uDisplacementScale: { value: number };
  uDisplacementBias: { value: number };
  uTime: { value: number };
  uAnimated: { value: boolean };
}

/**
 * Create displacement shader material
 */
function createDisplacementMaterial(
  uniforms: DisplacementUniforms,
  baseColor: THREE.Color = new THREE.Color(0xffffff)
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uColor: { value: baseColor },
    },
    vertexShader: /* glsl */ `
      uniform sampler2D uDisplacementMap;
      uniform float uDisplacementScale;
      uniform float uDisplacementBias;
      uniform float uTime;
      uniform bool uAnimated;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vDisplacement;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        // Sample displacement from texture
        float displacement = texture2D(uDisplacementMap, uv).r;
        
        // Apply bias
        displacement = displacement - 0.5 + uDisplacementBias;
        
        // Optional animation
        if (uAnimated) {
          displacement *= 1.0 + sin(uTime * 2.0) * 0.1;
        }
        
        // Scale displacement
        displacement *= uDisplacementScale;
        vDisplacement = displacement;
        
        // Displace position along normal
        vec3 displacedPosition = position + normal * displacement;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vDisplacement;
      
      void main() {
        // Simple lighting based on normal
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        float diffuse = max(dot(vNormal, lightDir), 0.0);
        
        // Add depth shading based on displacement
        float depthShading = 0.5 + vDisplacement * 0.5;
        
        vec3 color = uColor * diffuse * depthShading;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

/**
 * Vertex Displacer Component
 * Applies displacement mapping to mesh geometry
 */
export function VertexDisplacer({
  displacementMap,
  scale,
  bias = 0,
  // normalMap reserved for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  normalMap: _normalMap,
  meshRef,
  enabled = true,
  animated = false,
  animationSpeed = 1.0,
}: VertexDisplacerProps) {
  const timeRef = useRef<number>(0);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  // Create uniforms using ref to avoid React hooks immutability issues
  // Using == null pattern as recommended by React for lazy ref initialization
  const uniformsRef = useRef<DisplacementUniforms | null>(null);
  if (uniformsRef.current == null) {
    uniformsRef.current = {
      uDisplacementMap: { value: displacementMap },
      uDisplacementScale: { value: scale },
      uDisplacementBias: { value: bias },
      uTime: { value: 0 },
      uAnimated: { value: animated },
    };
  }
  
  // Update uniforms when props change
  useEffect(() => {
    if (!uniformsRef.current) return;
    uniformsRef.current.uDisplacementMap.value = displacementMap;
    uniformsRef.current.uDisplacementScale.value = scale;
    uniformsRef.current.uDisplacementBias.value = bias;
    uniformsRef.current.uAnimated.value = animated;
    
    eventBus.emit('geometry:displacementUpdate', { scale, bias });
  }, [displacementMap, scale, bias, animated]);
  
  // Apply material to mesh
  useEffect(() => {
    if (!meshRef?.current || !enabled || !uniformsRef.current) return;
    
    const mesh = meshRef.current;
    const originalMaterial = mesh.material;
    
    // Create displacement material
    materialRef.current = createDisplacementMaterial(uniformsRef.current);
    mesh.material = materialRef.current;
    
    return () => {
      // Restore original material
      if (mesh && originalMaterial) {
        mesh.material = originalMaterial;
      }
      materialRef.current?.dispose();
    };
  }, [meshRef, enabled]);
  
  // Animate
  useFrame((_, delta) => {
    if (!animated || !materialRef.current || !uniformsRef.current) return;
    
    timeRef.current += delta * animationSpeed;
    uniformsRef.current.uTime.value = timeRef.current;
  });
  
  return null;
}

/**
 * Hook to apply displacement to an existing material
 * Note: This modifies the material parameter which is intentional 
 * for Three.js material manipulation
 */
export function useDisplacement(
  material: THREE.MeshStandardMaterial | null,
  displacementMap: THREE.Texture | null,
  scale: number
): void {
  useEffect(() => {
    if (!material || !displacementMap) return;
    
    // Intentionally modifying material - this is a Three.js pattern
    // Three.js materials are mutable objects that need to be modified directly
    material.displacementMap = displacementMap;
    material.displacementScale = scale;
    material.needsUpdate = true;
    
    return () => {
      material.displacementMap = null;
      material.displacementScale = 0;
      material.needsUpdate = true;
    };
  }, [material, displacementMap, scale]);
}

export default VertexDisplacer;
