/**
 * 运镜模板定义
 * 预设的相机运动轨迹
 */

import * as THREE from 'three';

export type MotionTemplateType = 
  | 'orbit'
  | 'dolly'
  | 'truck'
  | 'crane'
  | 'parallax'
  | 'dolly-zoom'
  | 'custom';

export interface MotionTemplate {
  type: MotionTemplateType;
  name: string;
  description: string;
  params: MotionParams;
}

export interface MotionParams {
  // 通用参数
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  loop: boolean;
  
  // Orbit 参数
  orbitRadius?: number;
  orbitHeight?: number;
  orbitSpeed?: number;
  orbitDirection?: 1 | -1;
  
  // Dolly 参数
  dollyStart?: number;
  dollyEnd?: number;
  
  // Truck 参数
  truckAxis?: 'x' | 'y' | 'z';
  truckDistance?: number;
  
  // Crane 参数
  craneStartHeight?: number;
  craneEndHeight?: number;
  
  // Parallax 参数
  parallaxAmplitude?: number;
  parallaxFrequency?: number;
  
  // Dolly Zoom 参数
  dollyZoomFovStart?: number;
  dollyZoomFovEnd?: number;
  dollyZoomDistanceStart?: number;
  dollyZoomDistanceEnd?: number;
}

/**
 * 预设运镜模板
 */
export const MOTION_PRESETS: Record<string, MotionTemplate> = {
  // 环绕展示
  orbitShowcase: {
    type: 'orbit',
    name: '环绕展示',
    description: '360° 环绕主体旋转',
    params: {
      duration: 10,
      easing: 'linear',
      loop: true,
      orbitRadius: 5,
      orbitHeight: 2,
      orbitSpeed: 1,
      orbitDirection: 1
    }
  },
  
  // 慢速环绕
  orbitSlow: {
    type: 'orbit',
    name: '慢速环绕',
    description: '缓慢环绕，适合产品展示',
    params: {
      duration: 20,
      easing: 'linear',
      loop: true,
      orbitRadius: 4,
      orbitHeight: 1,
      orbitSpeed: 0.5,
      orbitDirection: 1
    }
  },
  
  // 推进
  dollyIn: {
    type: 'dolly',
    name: '推进',
    description: '相机向前推进',
    params: {
      duration: 3,
      easing: 'easeInOut',
      loop: false,
      dollyStart: 8,
      dollyEnd: 3
    }
  },
  
  // 拉远
  dollyOut: {
    type: 'dolly',
    name: '拉远',
    description: '相机向后拉远',
    params: {
      duration: 3,
      easing: 'easeInOut',
      loop: false,
      dollyStart: 3,
      dollyEnd: 8
    }
  },
  
  // 横移
  truckHorizontal: {
    type: 'truck',
    name: '水平横移',
    description: '相机水平移动',
    params: {
      duration: 4,
      easing: 'easeInOut',
      loop: false,
      truckAxis: 'x',
      truckDistance: 4
    }
  },
  
  // 升降
  craneUp: {
    type: 'crane',
    name: '升降拍摄',
    description: '相机垂直升降',
    params: {
      duration: 4,
      easing: 'easeInOut',
      loop: false,
      craneStartHeight: 0,
      craneEndHeight: 5
    }
  },
  
  // 视差展示
  parallaxShowcase: {
    type: 'parallax',
    name: '视差展示',
    description: '小幅左右移动增强立体感',
    params: {
      duration: 2,
      easing: 'easeInOut',
      loop: true,
      parallaxAmplitude: 0.5,
      parallaxFrequency: 1
    }
  },
  
  // 希区柯克变焦
  dollyZoom: {
    type: 'dolly-zoom',
    name: '希区柯克变焦',
    description: '推拉同时变焦，保持主体大小不变',
    params: {
      duration: 4,
      easing: 'easeInOut',
      loop: false,
      dollyZoomFovStart: 30,
      dollyZoomFovEnd: 75,
      dollyZoomDistanceStart: 10,
      dollyZoomDistanceEnd: 3
    }
  }
};

/**
 * 计算环绕动画的相机位置
 */
export function calculateOrbitPosition(
  t: number,
  params: MotionParams,
  centerTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
): THREE.Vector3 {
  const radius = params.orbitRadius || 5;
  const height = params.orbitHeight || 2;
  const direction = params.orbitDirection || 1;
  
  const angle = t * Math.PI * 2 * direction;
  
  return new THREE.Vector3(
    centerTarget.x + Math.cos(angle) * radius,
    centerTarget.y + height,
    centerTarget.z + Math.sin(angle) * radius
  );
}

/**
 * 计算推拉动画的相机位置
 */
export function calculateDollyPosition(
  t: number,
  params: MotionParams,
  _direction: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
): number {
  const start = params.dollyStart || 8;
  const end = params.dollyEnd || 3;
  
  return start + (end - start) * t;
}

/**
 * 计算视差动画的相机位置
 */
export function calculateParallaxPosition(
  t: number,
  params: MotionParams
): number {
  const amplitude = params.parallaxAmplitude || 0.5;
  const frequency = params.parallaxFrequency || 1;
  
  return Math.sin(t * Math.PI * 2 * frequency) * amplitude;
}

/**
 * 缓动函数
 */
export function applyEasing(t: number, easing: MotionParams['easing']): number {
  switch (easing) {
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}
