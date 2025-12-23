'use client';

import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  enabled?: boolean;
  count?: number;
  size?: number;
  color?: string;
  type?: 'dust' | 'snow' | 'rain' | 'fireflies';
  area?: [number, number, number];  // 粒子活动区域尺寸
  speed?: number;
}

/**
 * 粒子系统组件
 * 用于创建氛围粒子效果（尘埃、雪、雨等）
 */
export default function ParticleSystem({
  enabled = true,
  count = 1000,
  size = 0.05,
  color = '#ffffff',
  type = 'dust',
  area = [10, 10, 10],
  speed = 1
}: ParticleSystemProps) {
  const pointsRef = React.useRef<THREE.Points>(null);
  const velocitiesRef = React.useRef<Float32Array | null>(null);
  
  // 根据类型设置粒子行为
  const particleConfig = React.useMemo(() => {
    switch (type) {
      case 'snow':
        return {
          gravity: -0.02,
          drift: 0.01,
          turbulence: 0.002,
          sizeVariation: 0.5
        };
      case 'rain':
        return {
          gravity: -0.2,
          drift: 0.001,
          turbulence: 0,
          sizeVariation: 0.2
        };
      case 'fireflies':
        return {
          gravity: 0,
          drift: 0.02,
          turbulence: 0.01,
          sizeVariation: 0.8
        };
      default: // dust
        return {
          gravity: 0,
          drift: 0.005,
          turbulence: 0.002,
          sizeVariation: 0.3
        };
    }
  }, [type]);
  
  // 创建粒子几何体
  const geometry = React.useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // 随机位置
      positions[i * 3] = (Math.random() - 0.5) * area[0];
      positions[i * 3 + 1] = (Math.random() - 0.5) * area[1];
      positions[i * 3 + 2] = (Math.random() - 0.5) * area[2];
      
      // 随机尺寸
      sizes[i] = size * (1 + (Math.random() - 0.5) * particleConfig.sizeVariation);
      
      // 初始速度
      velocities[i * 3] = (Math.random() - 0.5) * particleConfig.drift;
      velocities[i * 3 + 1] = particleConfig.gravity;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * particleConfig.drift;
    }
    
    velocitiesRef.current = velocities;
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geo;
  }, [count, size, area, particleConfig]);
  
  // 创建材质
  const material = React.useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: size,
      sizeAttenuation: true,
      transparent: true,
      opacity: type === 'dust' ? 0.3 : type === 'fireflies' ? 0.8 : 0.6,
      blending: type === 'fireflies' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false
    });
  }, [color, size, type]);
  
  // 更新粒子位置
  useFrame((_, delta) => {
    if (!enabled || !pointsRef.current || !velocitiesRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const velocities = velocitiesRef.current;
    const effectiveDelta = delta * speed;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      // 添加湍流
      if (particleConfig.turbulence > 0) {
        velocities[idx] += (Math.random() - 0.5) * particleConfig.turbulence;
        velocities[idx + 1] += (Math.random() - 0.5) * particleConfig.turbulence;
        velocities[idx + 2] += (Math.random() - 0.5) * particleConfig.turbulence;
      }
      
      // 更新位置
      positions[idx] += velocities[idx] * effectiveDelta * 60;
      positions[idx + 1] += velocities[idx + 1] * effectiveDelta * 60;
      positions[idx + 2] += velocities[idx + 2] * effectiveDelta * 60;
      
      // 边界处理 - 循环
      for (let axis = 0; axis < 3; axis++) {
        const halfArea = area[axis] / 2;
        if (positions[idx + axis] < -halfArea) {
          positions[idx + axis] = halfArea;
        } else if (positions[idx + axis] > halfArea) {
          positions[idx + axis] = -halfArea;
        }
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  if (!enabled) return null;
  
  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}
