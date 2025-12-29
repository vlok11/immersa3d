// ============================================================
// Immersa 3D - Particle System Component
// GPGPU-accelerated particle effects
// ============================================================

import type { ReactElement } from 'react';
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Particle system configuration
 */
interface ParticleSystemProps {
  type: 'rain' | 'snow' | 'dust' | 'fireflies';
  count?: number;
  speed?: number;
  size?: number;
  color?: string;
  opacity?: number;
  areaSize?: [number, number, number];
  enabled?: boolean;
}

/**
 * Generate random particle data outside of render
 */
function generateParticleData(
  count: number,
  size: number,
  areaSize: [number, number, number],
  particleConfig: ReturnType<typeof getParticleConfig>
) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // Random position within area
    positions[i3] = (Math.random() - 0.5) * areaSize[0];
    positions[i3 + 1] = (Math.random() - 0.5) * areaSize[1];
    positions[i3 + 2] = (Math.random() - 0.5) * areaSize[2];
    
    // Random velocity based on particle type
    velocities[i3] = (Math.random() - 0.5) * particleConfig.velocityVariance.x;
    velocities[i3 + 1] = particleConfig.baseVelocity.y + (Math.random() - 0.5) * particleConfig.velocityVariance.y;
    velocities[i3 + 2] = (Math.random() - 0.5) * particleConfig.velocityVariance.z;
    
    // Random size variation
    sizes[i] = size * (0.5 + Math.random() * 0.5);
    
    // Random phase for animation
    phases[i] = Math.random() * Math.PI * 2;
  }
  
  return { positions, velocities, sizes, phases };
}

/**
 * ParticleSystem - GPU-accelerated particle effects
 * 
 * Atomic-level 3D component with useFrame for animation.
 * Supports various particle types with configurable behavior.
 */
export function ParticleSystem({
  type,
  count = 1000,
  speed = 1.0,
  size = 0.02,
  color = '#ffffff',
  opacity = 0.8,
  areaSize = [10, 10, 10],
  enabled = true,
}: ParticleSystemProps): ReactElement | null {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const { clock } = useThree();
  
  // Initialize geometry and material once
  useEffect(() => {
    const particleConfig = getParticleConfig(type);
    const data = generateParticleData(count, size, areaSize, particleConfig);
    
    // Store velocities for animation
    velocitiesRef.current = data.velocities;
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(data.phases, 1));
    geometryRef.current = geometry;
    
    // Create material
    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(particleConfig.color || color) },
        uOpacity: { value: opacity },
        uSpeed: { value: speed },
        uType: { value: getTypeIndex(type) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    materialRef.current = material;
    
    // Attach to points
    if (pointsRef.current) {
      pointsRef.current.geometry = geometry;
      pointsRef.current.material = material;
    }
    
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [count, size, areaSize, type, color, opacity, speed]);
  
  // Animation loop
  useFrame(() => {
    if (!enabled || !pointsRef.current || !geometryRef.current || !materialRef.current || !velocitiesRef.current) return;
    
    const material = materialRef.current;
    const geometry = geometryRef.current;
    const velocities = velocitiesRef.current;
    
    material.uniforms.uTime.value = clock.getElapsedTime();
    
    // Update particle positions on CPU (for wrapping)
    const positions = geometry.attributes.position.array as Float32Array;
    
    const halfX = areaSize[0] / 2;
    const halfY = areaSize[1] / 2;
    const halfZ = areaSize[2] / 2;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Apply velocity
      positions[i3] += velocities[i3] * speed * 0.016;
      positions[i3 + 1] += velocities[i3 + 1] * speed * 0.016;
      positions[i3 + 2] += velocities[i3 + 2] * speed * 0.016;
      
      // Wrap particles
      if (positions[i3 + 1] < -halfY) positions[i3 + 1] = halfY;
      if (positions[i3 + 1] > halfY) positions[i3 + 1] = -halfY;
      if (positions[i3] < -halfX) positions[i3] = halfX;
      if (positions[i3] > halfX) positions[i3] = -halfX;
      if (positions[i3 + 2] < -halfZ) positions[i3 + 2] = halfZ;
      if (positions[i3 + 2] > halfZ) positions[i3 + 2] = -halfZ;
    }
    
    geometry.attributes.position.needsUpdate = true;
  });
  
  if (!enabled) return null;
  
  return <points ref={pointsRef} />;
}

/**
 * Get particle configuration for type
 */
function getParticleConfig(type: string) {
  switch (type) {
    case 'rain':
      return {
        baseVelocity: { x: 0, y: -5, z: 0 },
        velocityVariance: { x: 0.5, y: 1, z: 0.5 },
        color: '#aaccff',
      };
    case 'snow':
      return {
        baseVelocity: { x: 0, y: -0.5, z: 0 },
        velocityVariance: { x: 0.2, y: 0.2, z: 0.2 },
        color: '#ffffff',
      };
    case 'dust':
      return {
        baseVelocity: { x: 0.1, y: 0.05, z: 0 },
        velocityVariance: { x: 0.1, y: 0.05, z: 0.1 },
        color: '#ddccaa',
      };
    case 'fireflies':
      return {
        baseVelocity: { x: 0, y: 0.02, z: 0 },
        velocityVariance: { x: 0.05, y: 0.05, z: 0.05 },
        color: '#ffffaa',
      };
    default:
      return {
        baseVelocity: { x: 0, y: -1, z: 0 },
        velocityVariance: { x: 0.1, y: 0.1, z: 0.1 },
        color: '#ffffff',
      };
  }
}

/**
 * Get type index for shader
 */
function getTypeIndex(type: string): number {
  switch (type) {
    case 'rain': return 0;
    case 'snow': return 1;
    case 'dust': return 2;
    case 'fireflies': return 3;
    default: return 0;
  }
}

/**
 * Particle vertex shader
 */
const particleVertexShader = `
  attribute float size;
  attribute float phase;
  
  uniform float uTime;
  uniform float uSpeed;
  uniform float uType;
  
  varying float vPhase;
  varying float vType;
  
  void main() {
    vPhase = phase;
    vType = uType;
    
    vec3 pos = position;
    
    // Type-specific movement
    if (uType == 1.0) {
      // Snow: gentle swaying
      pos.x += sin(uTime * 2.0 + phase) * 0.1;
      pos.z += cos(uTime * 1.5 + phase) * 0.1;
    } else if (uType == 3.0) {
      // Fireflies: orbiting movement
      float radius = 0.1;
      pos.x += sin(uTime * 0.5 + phase) * radius;
      pos.y += sin(uTime * 0.3 + phase * 2.0) * radius;
      pos.z += cos(uTime * 0.4 + phase) * radius;
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = size * (300.0 / -mvPosition.z);
    
    // Rain particles are elongated (hack via larger size)
    if (uType == 0.0) {
      gl_PointSize *= 2.0;
    }
  }
`;

/**
 * Particle fragment shader
 */
const particleFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uType;
  
  varying float vPhase;
  varying float vType;
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    float alpha = uOpacity;
    vec3 color = uColor;
    
    if (vType == 0.0) {
      // Rain: elongated ellipse
      float rainShape = smoothstep(0.5, 0.0, abs(center.y)) * smoothstep(0.15, 0.0, abs(center.x));
      alpha *= rainShape;
    } else if (vType == 3.0) {
      // Fireflies: pulsing glow
      float glow = 1.0 - dist * 2.0;
      glow = pow(max(glow, 0.0), 2.0);
      float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + vPhase * 10.0);
      alpha *= glow * pulse;
      color = mix(color, vec3(1.0, 1.0, 0.5), pulse * 0.5);
    } else {
      // Default: soft circle
      alpha *= 1.0 - smoothstep(0.3, 0.5, dist);
    }
    
    if (alpha < 0.01) discard;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export default ParticleSystem;
