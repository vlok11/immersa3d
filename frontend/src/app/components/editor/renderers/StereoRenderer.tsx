'use client';

import React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface StereoRendererRef {
  exportSBS: () => void;
  exportTB: () => void;
  exportAnaglyph: () => void;
}

interface StereoRendererProps {
  enabled?: boolean;
  eyeSeparation?: number;  // 眼距，默认 0.064m (64mm)
  mode?: 'sbs' | 'tb' | 'anaglyph';  // Side-by-Side, Top-Bottom, 红蓝
  convergence?: number;  // 聚合距离
}

/**
 * 立体渲染器
 * 支持 SBS (左右)、TB (上下)、Anaglyph (红蓝) 三种模式
 */
const StereoRenderer = React.forwardRef<StereoRendererRef, StereoRendererProps>(({
  enabled = false,
  eyeSeparation = 0.064,
  mode = 'sbs',
  convergence = 10
}, ref) => {
  const { gl, scene, camera, size } = useThree();
  
  // 创建两个相机和 RenderTarget
  const leftCamera = React.useMemo(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      return camera.clone();
    }
    return new THREE.PerspectiveCamera(50, size.width / size.height, 0.1, 1000);
  }, [camera, size]);
  
  const rightCamera = React.useMemo(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      return camera.clone();
    }
    return new THREE.PerspectiveCamera(50, size.width / size.height, 0.1, 1000);
  }, [camera, size]);
  
  // RenderTargets
  const leftTarget = React.useMemo(() => {
    return new THREE.WebGLRenderTarget(size.width / 2, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
  }, [size]);
  
  const rightTarget = React.useMemo(() => {
    return new THREE.WebGLRenderTarget(size.width / 2, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
  }, [size]);
  
  // Anaglyph Shader
  const anaglyphMaterial = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        leftTex: { value: null },
        rightTex: { value: null }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D leftTex;
        uniform sampler2D rightTex;
        varying vec2 vUv;
        
        void main() {
          vec4 left = texture2D(leftTex, vUv);
          vec4 right = texture2D(rightTex, vUv);
          
          // 红蓝立体：左眼红色通道，右眼蓝绿通道
          gl_FragColor = vec4(left.r, right.g, right.b, 1.0);
        }
      `
    });
  }, []);
  
  // 合成用的全屏四边形
  const compositeScene = React.useMemo(() => {
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, anaglyphMaterial);
    scene.add(mesh);
    return scene;
  }, [anaglyphMaterial]);
  
  const compositeCamera = React.useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }, []);
  
  // 更新相机位置
  const updateCameras = React.useCallback(() => {
    if (!camera) return;
    
    // 复制主相机属性
    leftCamera.matrix.copy(camera.matrix);
    leftCamera.matrixWorld.copy(camera.matrixWorld);
    leftCamera.projectionMatrix.copy(camera.projectionMatrix);
    
    rightCamera.matrix.copy(camera.matrix);
    rightCamera.matrixWorld.copy(camera.matrixWorld);
    rightCamera.projectionMatrix.copy(camera.projectionMatrix);
    
    // 计算相机右向量
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    // 偏移左右相机
    leftCamera.position.copy(camera.position).addScaledVector(right, -eyeSeparation / 2);
    rightCamera.position.copy(camera.position).addScaledVector(right, eyeSeparation / 2);
    
    // 聚合点（让两眼视线在聚合距离处相交）
    const lookAt = new THREE.Vector3(0, 0, -convergence).applyMatrix4(camera.matrixWorld);
    leftCamera.lookAt(lookAt);
    rightCamera.lookAt(lookAt);
    
    leftCamera.updateMatrixWorld();
    rightCamera.updateMatrixWorld();
  }, [camera, leftCamera, rightCamera, eyeSeparation, convergence]);
  
  // 导出函数
  const exportStereo = React.useCallback((outputMode: 'sbs' | 'tb' | 'anaglyph') => {
    updateCameras();
    
    const width = size.width;
    const height = size.height;
    
    // 创建临时画布
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (outputMode === 'sbs') {
      canvas.width = width;
      canvas.height = height / 2;
      
      // 渲染左眼
      gl.setRenderTarget(leftTarget);
      gl.render(scene, leftCamera);
      
      // 渲染右眼
      gl.setRenderTarget(rightTarget);
      gl.render(scene, rightCamera);
      
      gl.setRenderTarget(null);
      
      // 拼接
      // 将 WebGL 渲染结果绘制到 Canvas
      const leftData = new Uint8Array(width / 2 * height * 4);
      const rightData = new Uint8Array(width / 2 * height * 4);
      
      gl.readRenderTargetPixels(leftTarget, 0, 0, width / 2, height, leftData);
      gl.readRenderTargetPixels(rightTarget, 0, 0, width / 2, height, rightData);
      
      // 创建 ImageData
      const leftImageData = new ImageData(new Uint8ClampedArray(leftData), width / 2, height);
      const rightImageData = new ImageData(new Uint8ClampedArray(rightData), width / 2, height);
      
      ctx.putImageData(leftImageData, 0, 0);
      ctx.putImageData(rightImageData, width / 2, 0);
      
    } else if (outputMode === 'tb') {
      canvas.width = width / 2;
      canvas.height = height;
      
      // 类似 SBS 但上下排列
      gl.setRenderTarget(leftTarget);
      gl.render(scene, leftCamera);
      gl.setRenderTarget(rightTarget);
      gl.render(scene, rightCamera);
      gl.setRenderTarget(null);
      
    } else if (outputMode === 'anaglyph') {
      canvas.width = width / 2;
      canvas.height = height / 2;
      
      // 渲染两眼
      gl.setRenderTarget(leftTarget);
      gl.render(scene, leftCamera);
      gl.setRenderTarget(rightTarget);
      gl.render(scene, rightCamera);
      
      // 使用 anaglyph shader 合成
      anaglyphMaterial.uniforms.leftTex.value = leftTarget.texture;
      anaglyphMaterial.uniforms.rightTex.value = rightTarget.texture;
      
      const anaglyphTarget = new THREE.WebGLRenderTarget(width / 2, height / 2);
      gl.setRenderTarget(anaglyphTarget);
      gl.render(compositeScene, compositeCamera);
      gl.setRenderTarget(null);
    }
    
    // 下载
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `immersa-stereo-${outputMode}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
    
  }, [gl, scene, leftCamera, rightCamera, leftTarget, rightTarget, size, updateCameras, anaglyphMaterial, compositeScene, compositeCamera]);
  
  React.useImperativeHandle(ref, () => ({
    exportSBS: () => exportStereo('sbs'),
    exportTB: () => exportStereo('tb'),
    exportAnaglyph: () => exportStereo('anaglyph')
  }));
  
  // 实时立体渲染（可选）
  useFrame(() => {
    if (!enabled) return;
    
    updateCameras();
    
    if (mode === 'anaglyph') {
      // Anaglyph 模式：渲染两眼然后合成
      gl.setRenderTarget(leftTarget);
      gl.render(scene, leftCamera);
      gl.setRenderTarget(rightTarget);
      gl.render(scene, rightCamera);
      
      anaglyphMaterial.uniforms.leftTex.value = leftTarget.texture;
      anaglyphMaterial.uniforms.rightTex.value = rightTarget.texture;
      
      gl.setRenderTarget(null);
      gl.render(compositeScene, compositeCamera);
    }
  });
  
  // 清理
  React.useEffect(() => {
    return () => {
      leftTarget.dispose();
      rightTarget.dispose();
      anaglyphMaterial.dispose();
    };
  }, [leftTarget, rightTarget, anaglyphMaterial]);
  
  return null;
});

StereoRenderer.displayName = 'StereoRenderer';

export default StereoRenderer;
