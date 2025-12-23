'use client';

import React from 'react';
import { useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  TrackballControls, 
  FlyControls, 
  FirstPersonControls,
  TransformControls
} from '@react-three/drei';
import * as THREE from 'three';

export type ControllerType = 'orbit' | 'trackball' | 'fly' | 'firstPerson' | 'transform';

interface ControllerManagerProps {
  type?: ControllerType;
  enabled?: boolean;
  target?: THREE.Vector3 | [number, number, number];
  // Orbit 参数
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableDamping?: boolean;
  dampingFactor?: number;
  // Fly 参数
  movementSpeed?: number;
  rollSpeed?: number;
  // Transform 参数
  transformObject?: THREE.Object3D | null;
  transformMode?: 'translate' | 'rotate' | 'scale';
}

/**
 * 相机控制器管理组件
 * 支持切换多种控制器模式
 */
export default function ControllerManager({
  type = 'orbit',
  enabled = true,
  target = [0, 0, 0],
  autoRotate = false,
  autoRotateSpeed = 2,
  enableDamping = true,
  dampingFactor = 0.05,
  movementSpeed = 1,
  rollSpeed = 0.5,
  transformObject = null,
  transformMode = 'translate'
}: ControllerManagerProps) {
  const { camera, gl } = useThree();
  
  // 根据类型渲染对应的控制器
  switch (type) {
    case 'orbit':
      return (
        <OrbitControls
          args={[camera, gl.domElement]}
          enabled={enabled}
          target={Array.isArray(target) ? new THREE.Vector3(...target) : target}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          enableDamping={enableDamping}
          dampingFactor={dampingFactor}
        />
      );
      
    case 'trackball':
      return (
        <TrackballControls
          args={[camera, gl.domElement]}
          enabled={enabled}
        />
      );
      
    case 'fly':
      return (
        <FlyControls
          args={[camera, gl.domElement]}
          {...{ enabled } as any} // 绕过类型定义缺失问题
          movementSpeed={movementSpeed}
          rollSpeed={rollSpeed}
          dragToLook={true}
        />
      );
      
    case 'firstPerson':
      return (
        <FirstPersonControls
          args={[camera, gl.domElement]}
          enabled={enabled}
          movementSpeed={movementSpeed}
          lookSpeed={0.1}
        />
      );
      
    case 'transform':
      if (!transformObject) {
        return (
          <OrbitControls
            args={[camera, gl.domElement]}
            enabled={enabled}
          />
        );
      }
      return (
        <>
          <OrbitControls
            args={[camera, gl.domElement]}
            enabled={enabled}
          />
          <TransformControls
            object={transformObject}
            mode={transformMode}
          />
        </>
      );
      
    default:
      return null;
  }
}
