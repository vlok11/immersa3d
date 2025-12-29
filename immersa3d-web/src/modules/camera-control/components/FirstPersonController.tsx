// ============================================================
// Immersa 3D - First Person Controller Component
// WASD navigation with pointer lock
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewportStore } from '../../../store';
import { eventBus } from '../../../core/events';

/**
 * First Person Controller Props
 */
interface FirstPersonControllerProps {
  enabled?: boolean;
  moveSpeed?: number;
  lookSpeed?: number;
  enableVerticalMovement?: boolean;
}

// Reusable objects (Object Pooling - Performance Red Line)
const EULER = new THREE.Euler(0, 0, 0, 'YXZ');
const DIRECTION = new THREE.Vector3();
const FRONT_VECTOR = new THREE.Vector3();
const SIDE_VECTOR = new THREE.Vector3();

/**
 * Key state tracker
 */
interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

/**
 * FirstPersonController - WASD navigation with pointer lock
 * 
 * Provides first-person camera control similar to FPS games.
 * Uses Pointer Lock API for mouse capture.
 */
export function FirstPersonController({
  enabled = true,
  moveSpeed = 5.0,
  lookSpeed = 0.002,
  enableVerticalMovement = true,
}: FirstPersonControllerProps): null {
  const { camera, gl } = useThree();
  const isLockedRef = useRef(false);
  const keyStateRef = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });
  
  const updateCamera = useViewportStore((s) => s.updateCamera);
  
  /**
   * Handle pointer lock change
   */
  const handleLockChange = useCallback(() => {
    isLockedRef.current = document.pointerLockElement === gl.domElement;
    
    if (isLockedRef.current) {
      eventBus.emit('camera:pointerLocked', {});
    } else {
      eventBus.emit('camera:pointerUnlocked', {});
    }
  }, [gl.domElement]);
  
  /**
   * Handle mouse movement
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isLockedRef.current || !enabled) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    EULER.setFromQuaternion(camera.quaternion);
    
    EULER.y -= movementX * lookSpeed;
    EULER.x -= movementY * lookSpeed;
    
    // Clamp vertical rotation
    EULER.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, EULER.x));
    
    camera.quaternion.setFromEuler(EULER);
  }, [camera, enabled, lookSpeed]);
  
  /**
   * Handle key down
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        keyStateRef.current.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keyStateRef.current.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keyStateRef.current.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keyStateRef.current.right = true;
        break;
      case 'Space':
        if (enableVerticalMovement) {
          keyStateRef.current.up = true;
        }
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        if (enableVerticalMovement) {
          keyStateRef.current.down = true;
        }
        break;
    }
  }, [enabled, enableVerticalMovement]);
  
  /**
   * Handle key up
   */
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        keyStateRef.current.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keyStateRef.current.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keyStateRef.current.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keyStateRef.current.right = false;
        break;
      case 'Space':
        keyStateRef.current.up = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keyStateRef.current.down = false;
        break;
    }
  }, []);
  
  /**
   * Request pointer lock on click
   */
  const handleClick = useCallback(() => {
    if (!enabled || isLockedRef.current) return;
    gl.domElement.requestPointerLock();
  }, [enabled, gl.domElement]);
  
  // Setup event listeners
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('pointerlockchange', handleLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    gl.domElement.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      gl.domElement.removeEventListener('click', handleClick);
      
      // Exit pointer lock on cleanup
      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock();
      }
    };
  }, [
    enabled,
    gl.domElement,
    handleLockChange,
    handleMouseMove,
    handleKeyDown,
    handleKeyUp,
    handleClick,
  ]);
  
  // Movement update loop
  useFrame((_, delta) => {
    if (!enabled || !isLockedRef.current) return;
    
    const keys = keyStateRef.current;
    const speed = moveSpeed * delta;
    
    // Calculate movement direction
    DIRECTION.set(0, 0, 0);
    
    camera.getWorldDirection(FRONT_VECTOR);
    FRONT_VECTOR.y = 0;
    FRONT_VECTOR.normalize();
    
    SIDE_VECTOR.crossVectors(camera.up, FRONT_VECTOR).normalize();
    
    if (keys.forward) DIRECTION.add(FRONT_VECTOR);
    if (keys.backward) DIRECTION.sub(FRONT_VECTOR);
    if (keys.left) DIRECTION.add(SIDE_VECTOR);
    if (keys.right) DIRECTION.sub(SIDE_VECTOR);
    
    if (enableVerticalMovement) {
      if (keys.up) DIRECTION.y += 1;
      if (keys.down) DIRECTION.y -= 1;
    }
    
    // Apply movement
    if (DIRECTION.lengthSq() > 0) {
      DIRECTION.normalize().multiplyScalar(speed);
      camera.position.add(DIRECTION);
      
      // Update store
      updateCamera({
        position: [camera.position.x, camera.position.y, camera.position.z],
      });
    }
  });
  
  return null;
}

export default FirstPersonController;
