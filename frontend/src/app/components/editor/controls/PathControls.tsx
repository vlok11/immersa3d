'use client';

import React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PathControlsProps {
  enabled?: boolean;
  path: CameraPath;
  onComplete?: () => void;
  loop?: boolean;
}

export interface CameraPath {
  points: Array<{ position: [number, number, number]; lookAt?: [number, number, number] }>;
  duration: number;  // 总时长（秒）
  easing?: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
}

/**
 * 路径控制器
 * 沿样条曲线驱动相机位置
 */
export default function PathControls({
  enabled = true,
  path,
  onComplete,
  loop = false
}: PathControlsProps) {
  const { camera } = useThree();
  const progressRef = React.useRef(0);
  const curveRef = React.useRef<THREE.CatmullRomCurve3 | null>(null);
  const lookAtCurveRef = React.useRef<THREE.CatmullRomCurve3 | null>(null);
  
  // 创建样条曲线
  React.useEffect(() => {
    if (path.points.length < 2) return;
    
    // 位置曲线
    const positionPoints = path.points.map(p => new THREE.Vector3(...p.position));
    curveRef.current = new THREE.CatmullRomCurve3(positionPoints, loop, 'catmullrom', 0.5);
    
    // LookAt 曲线（如果有）
    const hasLookAt = path.points.some(p => p.lookAt);
    if (hasLookAt) {
      const lookAtPoints = path.points.map(p => {
        if (p.lookAt) return new THREE.Vector3(...p.lookAt);
        return new THREE.Vector3(0, 0, 0);
      });
      lookAtCurveRef.current = new THREE.CatmullRomCurve3(lookAtPoints, loop, 'catmullrom', 0.5);
    }
    
    // 重置进度
    progressRef.current = 0;
  }, [path, loop]);
  
  // 缓动函数
  const easeFunc = React.useCallback((t: number): number => {
    switch (path.easing) {
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return 1 - (1 - t) * (1 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default: // linear
        return t;
    }
  }, [path.easing]);
  
  useFrame((_, delta) => {
    if (!enabled || !curveRef.current) return;
    
    // 更新进度
    progressRef.current += delta / path.duration;
    
    if (progressRef.current >= 1) {
      if (loop) {
        progressRef.current = 0;
      } else {
        progressRef.current = 1;
        onComplete?.();
      }
    }
    
    // 应用缓动
    const easedProgress = easeFunc(progressRef.current);
    
    // 获取当前位置
    const position = curveRef.current.getPoint(easedProgress);
    camera.position.copy(position);
    
    // 获取 LookAt
    if (lookAtCurveRef.current) {
      const lookAt = lookAtCurveRef.current.getPoint(easedProgress);
      camera.lookAt(lookAt);
    } else {
      // 默认看向下一个点
      const nextProgress = Math.min(easedProgress + 0.01, 1);
      const nextPosition = curveRef.current.getPoint(nextProgress);
      camera.lookAt(nextPosition);
    }
  });
  
  return null;
}

/**
 * 创建圆形轨道路径
 */
export function createCircularPath(
  center: [number, number, number],
  radius: number,
  height: number,
  numPoints: number = 32,
  duration: number = 10
): CameraPath {
  const points: CameraPath['points'] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const x = center[0] + Math.cos(angle) * radius;
    const z = center[2] + Math.sin(angle) * radius;
    const y = center[1] + height;
    
    points.push({
      position: [x, y, z],
      lookAt: center
    });
  }
  
  return { points, duration, easing: 'linear' };
}

/**
 * 创建推拉路径
 */
export function createDollyPath(
  start: [number, number, number],
  end: [number, number, number],
  lookAt: [number, number, number],
  duration: number = 3
): CameraPath {
  return {
    points: [
      { position: start, lookAt },
      { position: end, lookAt }
    ],
    duration,
    easing: 'easeInOut'
  };
}

/**
 * 创建横移路径
 */
export function createTruckPath(
  center: [number, number, number],
  distance: number,
  axis: 'x' | 'y' | 'z',
  duration: number = 3
): CameraPath {
  const start: [number, number, number] = [...center];
  const end: [number, number, number] = [...center];
  
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  start[axisIndex] -= distance / 2;
  end[axisIndex] += distance / 2;
  
  return {
    points: [
      { position: start, lookAt: [0, 0, 0] },
      { position: center, lookAt: [0, 0, 0] },
      { position: end, lookAt: [0, 0, 0] }
    ],
    duration,
    easing: 'easeInOut'
  };
}
