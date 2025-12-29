// ============================================================
// Immersa 3D - Fly Controller Component
// 6 DOF camera movement simulation
// ============================================================

import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewportStore } from '../../../store';

/**
 * Fly Controller Props
 */
interface FlyControllerProps {
  enabled?: boolean;
  moveSpeed?: number;
  rollSpeed?: number;
  dragToLook?: boolean;
  autoForward?: boolean;
}

// Reusable objects (Object Pooling - Performance Red Line)
const MOVE_VECTOR = new THREE.Vector3();
const ROTATION_VECTOR = new THREE.Vector3();
const TEMP_QUATERNION = new THREE.Quaternion();

const EPS = 0.000001;

/**
 * Movement state tracker
 */
interface MoveState {
  forward: number;
  back: number;
  left: number;
  right: number;
  up: number;
  down: number;
  pitchUp: number;
  pitchDown: number;
  yawLeft: number;
  yawRight: number;
  rollLeft: number;
  rollRight: number;
}

/**
 * FlyController - 6 DOF free flight simulation
 * 
 * Provides aircraft-like camera control with roll, pitch, and yaw.
 * Supports keyboard and mouse inputs.
 */
export function FlyController({
  enabled = true,
  moveSpeed = 5.0,
  rollSpeed = 1.0,
  dragToLook = false,
  autoForward = false,
}: FlyControllerProps): null {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  
  const moveState = useRef<MoveState>({
    forward: 0,
    back: 0,
    left: 0,
    right: 0,
    up: 0,
    down: 0,
    pitchUp: 0,
    pitchDown: 0,
    yawLeft: 0,
    yawRight: 0,
    rollLeft: 0,
    rollRight: 0,
  });
  
  const updateCamera = useViewportStore((s) => s.updateCamera);
  
  /**
   * Update move vector based on state
   */
  const updateMoveVector = useCallback(() => {
    const state = moveState.current;
    
    MOVE_VECTOR.x = -state.left + state.right;
    MOVE_VECTOR.y = -state.down + state.up;
    MOVE_VECTOR.z = -state.forward + state.back;
  }, []);
  
  /**
   * Update rotation vector based on state
   */
  const updateRotationVector = useCallback(() => {
    const state = moveState.current;
    
    ROTATION_VECTOR.x = -state.pitchDown + state.pitchUp;
    ROTATION_VECTOR.y = -state.yawRight + state.yawLeft;
    ROTATION_VECTOR.z = -state.rollRight + state.rollLeft;
  }, []);
  
  /**
   * Handle key down
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || event.repeat) return;
    
    const state = moveState.current;
    
    switch (event.code) {
      case 'KeyW': state.forward = 1; break;
      case 'KeyS': state.back = 1; break;
      case 'KeyA': state.left = 1; break;
      case 'KeyD': state.right = 1; break;
      case 'KeyR': state.up = 1; break;
      case 'KeyF': state.down = 1; break;
      case 'ArrowUp': state.pitchUp = 1; break;
      case 'ArrowDown': state.pitchDown = 1; break;
      case 'ArrowLeft': state.yawLeft = 1; break;
      case 'ArrowRight': state.yawRight = 1; break;
      case 'KeyQ': state.rollLeft = 1; break;
      case 'KeyE': state.rollRight = 1; break;
    }
    
    updateMoveVector();
    updateRotationVector();
  }, [enabled, updateMoveVector, updateRotationVector]);
  
  /**
   * Handle key up
   */
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const state = moveState.current;
    
    switch (event.code) {
      case 'KeyW': state.forward = 0; break;
      case 'KeyS': state.back = 0; break;
      case 'KeyA': state.left = 0; break;
      case 'KeyD': state.right = 0; break;
      case 'KeyR': state.up = 0; break;
      case 'KeyF': state.down = 0; break;
      case 'ArrowUp': state.pitchUp = 0; break;
      case 'ArrowDown': state.pitchDown = 0; break;
      case 'ArrowLeft': state.yawLeft = 0; break;
      case 'ArrowRight': state.yawRight = 0; break;
      case 'KeyQ': state.rollLeft = 0; break;
      case 'KeyE': state.rollRight = 0; break;
    }
    
    updateMoveVector();
    updateRotationVector();
  }, [updateMoveVector, updateRotationVector]);
  
  /**
   * Handle mouse down
   */
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!enabled) return;
    
    if (dragToLook) {
      isDragging.current = true;
      lastMouseX.current = event.pageX;
      lastMouseY.current = event.pageY;
    }
  }, [enabled, dragToLook]);
  
  /**
   * Handle mouse up
   */
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    moveState.current.yawLeft = 0;
    moveState.current.yawRight = 0;
    moveState.current.pitchUp = 0;
    moveState.current.pitchDown = 0;
    updateRotationVector();
  }, [updateRotationVector]);
  
  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!enabled || !isDragging.current || !dragToLook) return;
    
    const deltaX = event.pageX - lastMouseX.current;
    const deltaY = event.pageY - lastMouseY.current;
    
    lastMouseX.current = event.pageX;
    lastMouseY.current = event.pageY;
    
    const state = moveState.current;
    
    if (deltaX < 0) {
      state.yawLeft = Math.abs(deltaX) * 0.01;
      state.yawRight = 0;
    } else {
      state.yawRight = deltaX * 0.01;
      state.yawLeft = 0;
    }
    
    if (deltaY < 0) {
      state.pitchUp = Math.abs(deltaY) * 0.01;
      state.pitchDown = 0;
    } else {
      state.pitchDown = deltaY * 0.01;
      state.pitchUp = 0;
    }
    
    updateRotationVector();
  }, [enabled, dragToLook, updateRotationVector]);
  
  // Setup event listeners
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [
    enabled,
    gl.domElement,
    handleKeyDown,
    handleKeyUp,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
  ]);
  
  // Update loop
  useFrame((_, delta) => {
    if (!enabled) return;
    
    const moveMult = delta * moveSpeed;
    const rotMult = delta * rollSpeed;
    
    // Apply movement
    camera.translateX(MOVE_VECTOR.x * moveMult);
    camera.translateY(MOVE_VECTOR.y * moveMult);
    camera.translateZ(MOVE_VECTOR.z * moveMult);
    
    // Auto-forward
    if (autoForward && MOVE_VECTOR.z === 0) {
      camera.translateZ(-moveMult);
    }
    
    // Apply rotation
    if (ROTATION_VECTOR.x !== 0 || ROTATION_VECTOR.y !== 0 || ROTATION_VECTOR.z !== 0) {
      TEMP_QUATERNION.set(
        ROTATION_VECTOR.x * rotMult,
        ROTATION_VECTOR.y * rotMult,
        ROTATION_VECTOR.z * rotMult,
        1
      ).normalize();
      
      camera.quaternion.multiply(TEMP_QUATERNION);
    }
    
    // Update store if moved significantly
    if (MOVE_VECTOR.lengthSq() > EPS || ROTATION_VECTOR.lengthSq() > EPS) {
      updateCamera({
        position: [camera.position.x, camera.position.y, camera.position.z],
      });
    }
  });
  
  return null;
}

export default FlyController;
