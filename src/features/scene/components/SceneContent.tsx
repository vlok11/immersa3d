import { useLoader } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { BackSide, type Group, TextureLoader, type VideoTexture } from 'three';

import { MirrorMode, ProjectionMode } from '@/shared/types';
import { useSceneStore } from '@/stores/sharedStore';

import { useMaterialUpdater } from '../hooks/useMaterialUpdater';
import { useSceneMaterials } from '../hooks/useSceneMaterials';

import {
  AXES_HELPER_SIZE,
  BACKGROUND_SPHERE_SCALE,
  BACKGROUND_SPHERE_SEGMENTS,
  DIRECTIONAL_LIGHT_INTENSITY_MULTIPLIER,
  DIRECTIONAL_LIGHT_POSITION,
  GRID_COLOR_CENTER,
  GRID_COLOR_GRID,
  GRID_DIVISIONS,
  GRID_SIZE,
  SCENE_BASE_WIDTH,
  WRAPPED_PROJECTION_ANGLE_THRESHOLD,
} from './SceneContent.constants';

import { AtmosphereParticles, ParallaxRig, SceneGeometry, VideoManager } from './index';

import type { ParticleType } from './effects';

interface SceneContentProps {
  aspectRatio: number;
  backgroundUrl: string | null;
  depthUrl: string;
  imageUrl: string;
  sceneGroupRef: React.RefObject<Group | null>;
  videoTextureRef: React.RefObject<VideoTexture | null>;
  videoUrl: string | null;
}

export const SceneContent = memo(
  ({
    imageUrl,
    depthUrl,
    backgroundUrl,
    videoUrl,
    aspectRatio,
    videoTextureRef,
    sceneGroupRef,
  }: SceneContentProps) => {
    const config = useSceneStore((state) => state.config);
    const groupRef = useRef<Group>(null);
    const particleType = useMemo<ParticleType | undefined>(() => {
      const t = config.particleType;

      if (t === 'dust' || t === 'snow' || t === 'stars' || t === 'firefly' || t === 'rain' || t === 'leaves') return t;

      return undefined;
    }, [config.particleType]);

    useEffect(() => {
      if (sceneGroupRef) {
        sceneGroupRef.current = groupRef.current;
      }
    }, [sceneGroupRef]);
    const [colorMap, displacementMap, backgroundTexture] = useLoader(TextureLoader, [
      imageUrl,
      depthUrl,
      backgroundUrl ??
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    ]);
    const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(null);

    useEffect(() => {
      if (videoTextureRef) {
        videoTextureRef.current = videoTexture;
      }
    }, [videoTexture, videoTextureRef]);
    const activeMap = videoTexture ?? colorMap ?? null;
    const isWrapped = useMemo(
      () =>
        [ProjectionMode.PANORAMA, ProjectionMode.DOME].includes(config.projectionMode) ||
        ((config.projectionMode === ProjectionMode.SPHERE ||
          config.projectionMode === ProjectionMode.CYLINDER) &&
          config.projectionAngle >= WRAPPED_PROJECTION_ANGLE_THRESHOLD),
      [config.projectionMode, config.projectionAngle]
    );
    const seamCorrectionValue = isWrapped ? 1.0 : 0.0;
    const materials = useSceneMaterials(activeMap, displacementMap!, config, seamCorrectionValue);
    const {
      activeMaterial,
      animeMaterial,
      celMaterial,
      crystalMaterial,
      hologramV2Material,
      inkWashMaterial,
      matrixMaterial,
      retroPixelMaterial,
    } = materials;

    useMaterialUpdater({
      activeMaterial,
      animeMaterial,
      celMaterial,
      crystalMaterial,
      hologramV2Material,
      inkWashMaterial,
      matrixMaterial,
      retroPixelMaterial,
    });
    if (!displacementMap) {
      return null;
    }
    const width = SCENE_BASE_WIDTH;
    const height = width / aspectRatio;

    if (!activeMaterial) {
      return null;
    }
    const renderGeometryGroup = () => {
      const baseProps = {
        width,
        height,
        density: config.meshDensity,
        displacementScale: config.displacementScale,
        material: activeMaterial,
        projectionMode: config.projectionMode,
        projectionAngle: config.projectionAngle,
      };
      let scaleX = 1,
        scaleY = 1;

      if (config.mirrorMode === MirrorMode.HORIZONTAL || config.mirrorMode === MirrorMode.QUAD) {
        scaleX = -1;
      }
      if (config.mirrorMode === MirrorMode.VERTICAL || config.mirrorMode === MirrorMode.QUAD) {
        scaleY = -1;
      }

      return (
        <group scale={[scaleX, scaleY, 1]}>
          <SceneGeometry {...baseProps} />
        </group>
      );
    };

    return (
      <>
        <VideoManager onTextureReady={setVideoTexture} videoUrl={videoUrl} />

        <ambientLight intensity={config.lightIntensity} />
        <directionalLight
          intensity={config.lightIntensity * DIRECTIONAL_LIGHT_INTENSITY_MULTIPLIER}
          position={DIRECTIONAL_LIGHT_POSITION}
        />

        <AtmosphereParticles enabled={config.enableParticles} particleType={particleType} />

        {config.showGrid ? (
          <gridHelper args={[GRID_SIZE, GRID_DIVISIONS, GRID_COLOR_CENTER, GRID_COLOR_GRID]} />
        ) : null}
        {config.showAxes ? <axesHelper args={[AXES_HELPER_SIZE]} /> : null}

        {backgroundUrl && config.projectionMode !== ProjectionMode.GAUSSIAN_SPLAT ? (
          <mesh rotation={[0, Math.PI, 0]} scale={BACKGROUND_SPHERE_SCALE}>
            <sphereGeometry args={[1, BACKGROUND_SPHERE_SEGMENTS, BACKGROUND_SPHERE_SEGMENTS]} />
            <meshBasicMaterial
              depthWrite={false}
              map={backgroundTexture}
              opacity={config.backgroundIntensity}
              side={BackSide}
              toneMapped
              transparent
            />
          </mesh>
        ) : null}

        <ParallaxRig enabled={config.enableNakedEye3D}>
          <group ref={groupRef}>{renderGeometryGroup()}</group>
        </ParallaxRig>
      </>
    );
  }
);

export default SceneContent;

SceneContent.displayName = 'SceneContent';
