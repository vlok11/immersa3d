// ============================================================
// Immersa 3D - Camera Parameters Panel Component
// UI panel for camera control parameters
// ============================================================

import { useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useViewportStore } from '../../../store';
import { cameraControlModule } from '../CameraControlModule';
import type { ControllerType } from '../CameraControlModule';
import styles from './CameraParamsPanel.module.css';

/**
 * Camera mode display info
 */
const CAMERA_MODES: { value: ControllerType; label: string; icon: string }[] = [
  { value: 'orbit', label: '轨道', icon: '🌐' },
  { value: 'firstPerson', label: '第一人称', icon: '👁️' },
  { value: 'fly', label: '飞行', icon: '✈️' },
];

/**
 * CameraParamsPanel - Camera control parameter UI
 */
export function CameraParamsPanel(): JSX.Element {
  const cameraMode = useViewportStore((s) => s.cameraMode);
  const camera = useViewportStore((s) => s.camera);
  const setCameraMode = useViewportStore((s) => s.setCameraMode);
  const updateCamera = useViewportStore((s) => s.updateCamera);
  const resetCamera = useViewportStore((s) => s.resetCamera);
  
  /**
   * Handle mode change
   */
  const handleModeChange = useCallback((mode: ControllerType) => {
    setCameraMode(mode);
    cameraControlModule.setControlMode(mode);
  }, [setCameraMode]);
  
  /**
   * Handle FOV change
   */
  const handleFovChange = useCallback((value: number[]) => {
    updateCamera({ fov: value[0] });
  }, [updateCamera]);
  
  /**
   * Handle near plane change
   */
  const handleNearChange = useCallback((value: number[]) => {
    updateCamera({ near: value[0] });
  }, [updateCamera]);
  
  /**
   * Handle far plane change
   */
  const handleFarChange = useCallback((value: number[]) => {
    updateCamera({ far: value[0] });
  }, [updateCamera]);
  
  /**
   * Handle reset
   */
  const handleReset = useCallback(() => {
    resetCamera();
  }, [resetCamera]);
  
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>📷 相机控制</h3>
        <button className={styles.resetButton} onClick={handleReset} title="重置相机">
          ↺
        </button>
      </div>
      
      {/* Camera Mode Selector */}
      <div className={styles.section}>
        <label className={styles.label}>控制模式</label>
        <div className={styles.modeSelector}>
          {CAMERA_MODES.map((mode) => (
            <button
              key={mode.value}
              className={`${styles.modeButton} ${cameraMode === mode.value ? styles.active : ''}`}
              onClick={() => handleModeChange(mode.value)}
              title={mode.label}
            >
              <span className={styles.modeIcon}>{mode.icon}</span>
              <span className={styles.modeLabel}>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* FOV Slider */}
      <div className={styles.section}>
        <div className={styles.labelRow}>
          <label className={styles.label}>视场角 (FOV)</label>
          <span className={styles.value}>{camera.fov.toFixed(0)}°</span>
        </div>
        <Slider.Root
          className={styles.sliderRoot}
          value={[camera.fov]}
          min={20}
          max={120}
          step={1}
          onValueChange={handleFovChange}
        >
          <Slider.Track className={styles.sliderTrack}>
            <Slider.Range className={styles.sliderRange} />
          </Slider.Track>
          <Slider.Thumb className={styles.sliderThumb} />
        </Slider.Root>
      </div>
      
      {/* Near Plane Slider */}
      <div className={styles.section}>
        <div className={styles.labelRow}>
          <label className={styles.label}>近裁剪面</label>
          <span className={styles.value}>{camera.near.toFixed(2)}</span>
        </div>
        <Slider.Root
          className={styles.sliderRoot}
          value={[camera.near]}
          min={0.01}
          max={10}
          step={0.01}
          onValueChange={handleNearChange}
        >
          <Slider.Track className={styles.sliderTrack}>
            <Slider.Range className={styles.sliderRange} />
          </Slider.Track>
          <Slider.Thumb className={styles.sliderThumb} />
        </Slider.Root>
      </div>
      
      {/* Far Plane Slider */}
      <div className={styles.section}>
        <div className={styles.labelRow}>
          <label className={styles.label}>远裁剪面</label>
          <span className={styles.value}>{camera.far.toFixed(0)}</span>
        </div>
        <Slider.Root
          className={styles.sliderRoot}
          value={[camera.far]}
          min={100}
          max={10000}
          step={100}
          onValueChange={handleFarChange}
        >
          <Slider.Track className={styles.sliderTrack}>
            <Slider.Range className={styles.sliderRange} />
          </Slider.Track>
          <Slider.Thumb className={styles.sliderThumb} />
        </Slider.Root>
      </div>
      
      {/* Position Display */}
      <div className={styles.section}>
        <label className={styles.label}>相机位置</label>
        <div className={styles.positionGrid}>
          <div className={styles.posItem}>
            <span className={styles.axis}>X</span>
            <span className={styles.posValue}>{camera.position[0].toFixed(2)}</span>
          </div>
          <div className={styles.posItem}>
            <span className={styles.axis}>Y</span>
            <span className={styles.posValue}>{camera.position[1].toFixed(2)}</span>
          </div>
          <div className={styles.posItem}>
            <span className={styles.axis}>Z</span>
            <span className={styles.posValue}>{camera.position[2].toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Target Display */}
      <div className={styles.section}>
        <label className={styles.label}>观察目标</label>
        <div className={styles.positionGrid}>
          <div className={styles.posItem}>
            <span className={styles.axis}>X</span>
            <span className={styles.posValue}>{camera.target[0].toFixed(2)}</span>
          </div>
          <div className={styles.posItem}>
            <span className={styles.axis}>Y</span>
            <span className={styles.posValue}>{camera.target[1].toFixed(2)}</span>
          </div>
          <div className={styles.posItem}>
            <span className={styles.axis}>Z</span>
            <span className={styles.posValue}>{camera.target[2].toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraParamsPanel;
