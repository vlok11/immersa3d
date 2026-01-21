import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { getEventBus } from '@/core/EventBus';
import {
  calculateDistance,
  calculatePresetPose,
  type CameraPresetType,
  getCameraAnimator,
  getCameraService,
  getInputService,
} from '@/features/scene/services/camera';
import { fromVector3 } from '@/shared/utils';
import { useCameraPoseStore } from '@/stores/cameraStore';

import type { CameraPose, Vec3 } from '@/shared/types';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

export function useCameraController(options: CameraControllerOptions): CameraControllerReturn {
  const { controlsRef, enableSync = true, syncInterval = CAMERA_DEFAULTS.SYNC_INTERVAL } = options;
  const { camera, invalidate } = useThree();

  const cameraService = getCameraService();
  const inputService = getInputService();
  const cameraAnimator = getCameraAnimator();

  const frameCountRef = useRef(0);
  const reusableVec = useMemo(() => new Vector3(), []);

  useEffect(() => {
    if (controlsRef.current) {
      cameraAnimator.bindThree(camera, controlsRef.current);
    }

    return () => {
      cameraAnimator.unbindThree();
    };
  }, [camera, controlsRef, cameraAnimator]);

  const syncToService = useCallback(() => {
    if (!controlsRef.current) return;

    const fov = camera instanceof PerspectiveCamera ? camera.fov : CAMERA_DEFAULTS.FOV;

    cameraService.setPose({
      position: fromVector3(camera.position),
      target: fromVector3(controlsRef.current.target),
      up: { x: 0, y: 1, z: 0 },
      fov,
    });
  }, [camera, controlsRef, cameraService]);

  useFrame(() => {
    if (enableSync) {
      frameCountRef.current++;

      if (frameCountRef.current >= syncInterval) {
        frameCountRef.current = 0;
        syncToService();
      }
    }
  });

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) return;

    const handleChange = () => {
      invalidate();
    };

    controls.addEventListener('change', handleChange);

    return () => {
      controls.removeEventListener('change', handleChange);
    };
  }, [controlsRef, invalidate]);

  useEffect(() => {
    const eventBus = getEventBus();
    const unsubscribe = eventBus.on('camera:pose-changed', (payload: unknown) => {
      const p = payload as { pose: CameraPose; source?: string } | null;

      if (!p?.pose) return;

      if (p.source !== 'user' && p.source !== 'sync') {
        const { pose } = p;

        camera.position.set(pose.position.x, pose.position.y, pose.position.z);

        if (controlsRef.current) {
          controlsRef.current.target.set(pose.target.x, pose.target.y, pose.target.z);
          controlsRef.current.update();
        }

        if (camera instanceof PerspectiveCamera && pose.fov) {
          camera.fov = pose.fov;
          camera.updateProjectionMatrix();
        }

        invalidate();
      }
    });

    return unsubscribe;
  }, [camera, controlsRef, invalidate]);

  const moveTo = useCallback(
    (position: Vec3, duration = CAMERA_DEFAULTS.MOVE_DURATION) => {
      cameraAnimator.moveTo(position, { duration });
      invalidate();
    },
    [cameraAnimator, invalidate]
  );

  const lookAt = useCallback(
    (target: Vec3, duration = CAMERA_DEFAULTS.LOOK_DURATION) => {
      cameraAnimator.lookAt(target, { duration });
      invalidate();
    },
    [cameraAnimator, invalidate]
  );

  const setFov = useCallback(
    (fov: number, duration = CAMERA_DEFAULTS.FOV_DURATION) => {
      cameraAnimator.setFov(fov, { duration });
      invalidate();
    },
    [cameraAnimator, invalidate]
  );

  const reset = useCallback(() => {
    cameraAnimator.transitionTo(
      {
        position: { x: 0, y: 0, z: CAMERA_DEFAULTS.POSITION_Z },
        target: { x: 0, y: 0, z: 0 },
        fov: CAMERA_DEFAULTS.FOV,
      },
      { duration: CAMERA_DEFAULTS.MOVE_DURATION }
    );
    void cameraService.applyPreset('FRONT');
  }, [cameraAnimator, cameraService]);

  const applyPreset = useCallback(
    (preset: 'FRONT' | 'TOP' | 'SIDE' | 'ISO' | 'FOCUS') => {
      const currentPose = useCameraPoseStore.getState().pose;
      const currentDist = calculateDistance(currentPose.position, currentPose.target);
      const presetPose = calculatePresetPose(preset as CameraPresetType, currentDist);

      cameraAnimator.transitionTo(
        { position: presetPose.position, target: presetPose.target },
        { duration: CAMERA_DEFAULTS.PRESET_DURATION }
      );
      void cameraService.applyPreset(preset);
    },
    [cameraAnimator, cameraService]
  );

  const getCurrentPose = useCallback((): CameraPose => {
    return {
      position: fromVector3(camera.position),
      target: fromVector3(controlsRef.current?.target ?? reusableVec.set(0, 0, 0)),
      up: { x: 0, y: 1, z: 0 },
      fov: camera instanceof PerspectiveCamera ? camera.fov : CAMERA_DEFAULTS.FOV,
    };
  }, [camera, controlsRef, reusableVec]);

  const startInteraction = useCallback(
    (_type: 'rotate' | 'pan' | 'zoom' | 'touch') => {
      inputService.setEnabled(true);
      cameraAnimator.setUserInteracting(true);
    },
    [inputService, cameraAnimator]
  );

  const endInteraction = useCallback(() => {
    cameraAnimator.setUserInteracting(false);
    syncToService();
  }, [cameraAnimator, syncToService]);

  return {
    moveTo,
    lookAt,
    setFov,
    reset,
    applyPreset,
    getCurrentPose,
    startInteraction,
    endInteraction,
    invalidate,
  };
}

export interface CameraControllerOptions {
  controlsRef: React.RefObject<OrbitControlsType | null>;
  enableSync?: boolean;
  syncInterval?: number;
}
export interface CameraControllerReturn {
  applyPreset: (preset: 'FRONT' | 'TOP' | 'SIDE' | 'ISO' | 'FOCUS') => void;
  endInteraction: () => void;
  getCurrentPose: () => CameraPose;
  invalidate: () => void;
  lookAt: (target: Vec3, duration?: number) => void;
  moveTo: (position: Vec3, duration?: number) => void;
  reset: () => void;
  setFov: (fov: number, duration?: number) => void;
  startInteraction: (type: 'rotate' | 'pan' | 'zoom' | 'touch') => void;
}

const CAMERA_DEFAULTS = {
  FOV: 55,
  POSITION_Z: 9,
  MOVE_DURATION: 500,
  LOOK_DURATION: 500,
  FOV_DURATION: 300,
  PRESET_DURATION: 600,
  SYNC_INTERVAL: 10,
};
