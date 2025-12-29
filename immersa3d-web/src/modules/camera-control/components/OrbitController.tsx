// ============================================================
// Immersa 3D - Orbit Controller Component
// Orbital camera control with damping and constraints
// ============================================================

import { useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import CameraControls from 'camera-controls';
import * as THREE from 'three';
import { useViewportStore } from '../../../store';
import { eventBus } from '../../../core/events';

// Install camera-controls
CameraControls.install({ THREE });

/**
 * Orbit Controller Props
 */
interface OrbitControllerProps {
  enabled?: boolean;
  enableDamping?: boolean;
  dampingFactor?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

// Reusable vector constants (Object Pooling - Performance Red Line)
const TEMP_VEC3 = new THREE.Vector3();

/**
 * OrbitController - Orbital camera control component
 * 
 * Uses camera-controls library for smooth orbital navigation
 * with inertia damping and polar/azimuth angle constraints.
 */
export function OrbitController({
  enabled = true,
  enableDamping = true,
  dampingFactor = 0.05,
  enableZoom = true,
  enablePan = true,
  enableRotate = true,
  minDistance = 0.5,
  maxDistance = 100,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
  minAzimuthAngle = -Infinity,
  maxAzimuthAngle = Infinity,
  autoRotate = false,
  autoRotateSpeed = 2.0,
}: OrbitControllerProps): null {
  const { camera, gl } = useThree();
  const controlsRef = useRef<CameraControls | null>(null);
  
  // Get camera state from store
  const cameraState = useViewportStore((s) => s.camera);
  const updateCamera = useViewportStore((s) => s.updateCamera);
  
  // Create camera controls instance
  // Note: cameraState intentionally excluded from deps to avoid infinite loop
  // (controls update → cameraState change → controls recreate → loop)
  const controls = useMemo(() => {
    const ctrl = new CameraControls(camera, gl.domElement);
    
    // Set initial position
    ctrl.setLookAt(
      cameraState.position[0],
      cameraState.position[1],
      cameraState.position[2],
      cameraState.target[0],
      cameraState.target[1],
      cameraState.target[2],
      false
    );
    
    return ctrl;
  }, [camera, gl.domElement]);
  
  // Store ref
  controlsRef.current = controls;
  
  // Update controls configuration
  useEffect(() => {
    if (!controls) return;
    
    controls.enabled = enabled;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.minPolarAngle = minPolarAngle;
    controls.maxPolarAngle = maxPolarAngle;
    controls.minAzimuthAngle = minAzimuthAngle;
    controls.maxAzimuthAngle = maxAzimuthAngle;
    
    // Damping settings
    controls.smoothTime = enableDamping ? dampingFactor * 10 : 0;
    controls.draggingSmoothTime = enableDamping ? dampingFactor * 5 : 0;
    
    // Enable/disable features
    controls.dollySpeed = enableZoom ? 1.0 : 0;
    controls.truckSpeed = enablePan ? 2.0 : 0;
    controls.azimuthRotateSpeed = enableRotate ? 1.0 : 0;
    controls.polarRotateSpeed = enableRotate ? 1.0 : 0;
    
  }, [
    controls,
    enabled,
    enableDamping,
    dampingFactor,
    enableZoom,
    enablePan,
    enableRotate,
    minDistance,
    maxDistance,
    minPolarAngle,
    maxPolarAngle,
    minAzimuthAngle,
    maxAzimuthAngle,
  ]);
  
  // Handle transition requests
  useEffect(() => {
    const handleTransitionRequest = (payload: {
      position: [number, number, number];
      lookAt: [number, number, number];
      duration: number;
    }) => {
      if (!controls) return;
      
      eventBus.emit('camera:transitionStart', {});
      
      controls.setLookAt(
        payload.position[0],
        payload.position[1],
        payload.position[2],
        payload.lookAt[0],
        payload.lookAt[1],
        payload.lookAt[2],
        true // Enable animation
      ).then(() => {
        eventBus.emit('camera:transitionEnd', {});
      });
    };
    
    eventBus.on('camera:transitionRequest', handleTransitionRequest);
    
    return () => {
      eventBus.off('camera:transitionRequest', handleTransitionRequest);
    };
  }, [controls]);
  
  // Update loop with delta time
  useFrame((_, delta) => {
    if (!controls) return;
    
    // Auto-rotate
    if (autoRotate && enabled) {
      controls.azimuthAngle += autoRotateSpeed * delta * THREE.MathUtils.DEG2RAD;
    }
    
    // Update controls
    const hasUpdated = controls.update(delta);
    
    // Sync state to store (throttled)
    if (hasUpdated) {
      controls.getPosition(TEMP_VEC3);
      const pos: [number, number, number] = [TEMP_VEC3.x, TEMP_VEC3.y, TEMP_VEC3.z];
      
      controls.getTarget(TEMP_VEC3);
      const target: [number, number, number] = [TEMP_VEC3.x, TEMP_VEC3.y, TEMP_VEC3.z];
      
      // Only update if significantly changed
      const posChanged = 
        Math.abs(pos[0] - cameraState.position[0]) > 0.001 ||
        Math.abs(pos[1] - cameraState.position[1]) > 0.001 ||
        Math.abs(pos[2] - cameraState.position[2]) > 0.001;
      
      if (posChanged) {
        updateCamera({ position: pos, target });
      }
    }
  });
  
  // Cleanup
  useEffect(() => {
    return () => {
      controls.dispose();
    };
  }, [controls]);
  
  // This component doesn't render anything
  return null;
}

export default OrbitController;
