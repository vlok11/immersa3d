'use client';

import React from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface PeppersGhostExporterRef {
  exportPeppersGhost: () => void;
  exportPeppersGhostVideo: () => void;
}

interface PeppersGhostExporterProps {
  // 视角配置
  cameraDistance?: number;
  viewAngle?: number;  // 每个视角的偏移角度
}

/**
 * Pepper's Ghost 四视图导出器
 * 生成上/下/左/右四个视角的十字布局图像
 * 用于金字塔全息投影
 */
const PeppersGhostExporter = React.forwardRef<PeppersGhostExporterRef, PeppersGhostExporterProps>(({
  cameraDistance = 8,
  viewAngle = 45
}, ref) => {
  const { gl, scene, camera } = useThree();
  
  // 四个方向的相机
  const cameras = React.useMemo(() => {
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 50;
    const aspect = 1; // 正方形视图
    
    return {
      top: new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000),
      bottom: new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000),
      left: new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000),
      right: new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000)
    };
  }, [camera]);
  
  // 更新四个相机的位置
  const updateCameras = React.useCallback(() => {
    const angleRad = THREE.MathUtils.degToRad(viewAngle);
    const target = new THREE.Vector3(0, 0, 0);
    
    // 上视角（从上向下看）
    cameras.top.position.set(0, cameraDistance * Math.sin(angleRad), cameraDistance * Math.cos(angleRad));
    cameras.top.lookAt(target);
    
    // 下视角（从下向上看，图像需要翻转）
    cameras.bottom.position.set(0, -cameraDistance * Math.sin(angleRad), cameraDistance * Math.cos(angleRad));
    cameras.bottom.lookAt(target);
    
    // 左视角
    cameras.left.position.set(-cameraDistance * Math.sin(angleRad), 0, cameraDistance * Math.cos(angleRad));
    cameras.left.lookAt(target);
    
    // 右视角
    cameras.right.position.set(cameraDistance * Math.sin(angleRad), 0, cameraDistance * Math.cos(angleRad));
    cameras.right.lookAt(target);
    
    Object.values(cameras).forEach(cam => cam.updateMatrixWorld());
  }, [cameras, cameraDistance, viewAngle]);
  
  // 导出 Pepper's Ghost 静态图
  const exportPeppersGhost = React.useCallback(() => {
    updateCameras();
    
    const viewSize = 512;  // 每个视图尺寸
    const totalSize = viewSize * 3;  // 3x3 布局
    
    // 创建 RenderTarget
    const renderTarget = new THREE.WebGLRenderTarget(viewSize, viewSize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
    
    // 创建画布
    const canvas = document.createElement('canvas');
    canvas.width = totalSize;
    canvas.height = totalSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 填充黑色背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, totalSize, totalSize);
    
    // 渲染四个视角
    const positions = [
      { cam: cameras.top, x: viewSize, y: 0, rotate: 180 },      // 上（中上）
      { cam: cameras.bottom, x: viewSize, y: viewSize * 2, rotate: 0 },  // 下（中下）
      { cam: cameras.left, x: 0, y: viewSize, rotate: 90 },      // 左（左中）
      { cam: cameras.right, x: viewSize * 2, y: viewSize, rotate: -90 }  // 右（右中）
    ];
    
    const buffer = new Uint8Array(viewSize * viewSize * 4);
    
    positions.forEach(({ cam, x, y, rotate }) => {
      // 渲染
      gl.setRenderTarget(renderTarget);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, true, true);
      gl.render(scene, cam);
      
      // 读取像素
      gl.readRenderTargetPixels(renderTarget, 0, 0, viewSize, viewSize, buffer);
      
      // 创建临时画布进行旋转
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = viewSize;
      tempCanvas.height = viewSize;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      // WebGL 读取的数据是倒置的，需要翻转
      const imageData = new ImageData(viewSize, viewSize);
      for (let row = 0; row < viewSize; row++) {
        const srcRow = viewSize - 1 - row;
        const srcStart = srcRow * viewSize * 4;
        const dstStart = row * viewSize * 4;
        imageData.data.set(buffer.subarray(srcStart, srcStart + viewSize * 4), dstStart);
      }
      tempCtx.putImageData(imageData, 0, 0);
      
      // 旋转并绘制到主画布
      ctx.save();
      ctx.translate(x + viewSize / 2, y + viewSize / 2);
      ctx.rotate(THREE.MathUtils.degToRad(rotate));
      ctx.drawImage(tempCanvas, -viewSize / 2, -viewSize / 2);
      ctx.restore();
    });
    
    gl.setRenderTarget(null);
    renderTarget.dispose();
    
    // 下载
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'immersa-peppers-ghost.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
    
  }, [gl, scene, cameras, updateCameras]);
  
  // 导出 Pepper's Ghost 视频
  const exportPeppersGhostVideo = React.useCallback(() => {
    updateCameras();
    
    const viewSize = 512;
    const totalSize = viewSize * 3;
    const fps = 30;
    const durationSeconds = 5;
    const totalFrames = fps * durationSeconds;
    
    // 创建画布
    const canvas = document.createElement('canvas');
    canvas.width = totalSize;
    canvas.height = totalSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 创建 MediaRecorder
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'immersa-peppers-ghost.webm';
      a.click();
      URL.revokeObjectURL(url);
    };
    
    mediaRecorder.start();
    
    // 动画渲染
    let frame = 0;
    const renderTarget = new THREE.WebGLRenderTarget(viewSize, viewSize);
    
    const renderFrame = () => {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        renderTarget.dispose();
        return;
      }
      
      // 旋转场景
      const angle = (frame / totalFrames) * Math.PI * 2;
      Object.values(cameras).forEach(cam => {
        cam.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle / totalFrames);
        cam.lookAt(0, 0, 0);
        cam.updateMatrixWorld();
      });
      
      // 渲染四个视图（简化版，实际需要完整实现）
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, totalSize, totalSize);
      
      // ... 渲染逻辑同上
      
      frame++;
      requestAnimationFrame(renderFrame);
    };
    
    renderFrame();
    
  }, [cameras, updateCameras]);
  
  React.useImperativeHandle(ref, () => ({
    exportPeppersGhost,
    exportPeppersGhostVideo
  }));
  
  return null;
});

PeppersGhostExporter.displayName = 'PeppersGhostExporter';

export default PeppersGhostExporter;
