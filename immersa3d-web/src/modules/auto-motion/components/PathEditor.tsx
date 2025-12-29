// ============================================================
// Immersa 3D - Path Editor Component
// Visual 3D path editing with control points
// ============================================================

import { useRef, useMemo, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

import type { MotionPath, Keyframe } from '../AutoMotionModule';
import { eventBus } from '../../../core/events';

/**
 * Path Editor Props
 */
interface PathEditorProps {
  /** Current motion path */
  path: MotionPath | null;
  /** Whether editing is enabled */
  enabled?: boolean;
  /** Path line color */
  lineColor?: string;
  /** Control point color */
  pointColor?: string;
  /** Selected point color */
  selectedColor?: string;
  /** Control point size */
  pointSize?: number;
  /** Callback when keyframe is updated */
  onKeyframeUpdate?: (index: number, keyframe: Keyframe) => void;
  /** Callback when keyframe is selected */
  onKeyframeSelect?: (index: number) => void;
}

// Reusable vectors to avoid allocation in render loop
const tempVec3 = new THREE.Vector3();

/**
 * Control Point Component
 */
interface ControlPointProps {
  position: [number, number, number];
  index: number;
  selected: boolean;
  color: string;
  selectedColor: string;
  size: number;
  onSelect: (index: number) => void;
  onDrag: (index: number, position: [number, number, number]) => void;
  enabled: boolean;
}

function ControlPoint({
  position,
  index,
  selected,
  color,
  selectedColor,
  size,
  onSelect,
  enabled,
}: ControlPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (enabled) {
      onSelect(index);
    }
  }, [enabled, index, onSelect]);
  
  const currentColor = selected ? selectedColor : (hovered ? selectedColor : color);
  const currentSize = selected ? size * 1.3 : (hovered ? size * 1.15 : size);
  
  return (
    <Sphere
      ref={meshRef}
      args={[currentSize, 16, 16]}
      position={position}
      onClick={handleClick}
      onPointerOver={() => enabled && setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial
        color={currentColor}
        emissive={currentColor}
        emissiveIntensity={selected ? 0.5 : 0.2}
        transparent
        opacity={0.9}
      />
    </Sphere>
  );
}

/**
 * Look-At Line Component
 */
interface LookAtLineProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}

function LookAtLine({ from, to, color }: LookAtLineProps) {
  const points = useMemo(() => [
    new THREE.Vector3(...from),
    new THREE.Vector3(...to),
  ], [from, to]);
  
  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      dashed
      dashScale={5}
      dashSize={0.5}
      gapSize={0.3}
    />
  );
}

/**
 * Path Editor Component
 * Renders editable camera path with control points
 */
export function PathEditor({
  path,
  enabled = true,
  lineColor = '#00ff88',
  pointColor = '#ffffff',
  selectedColor = '#ff6600',
  pointSize = 0.15,
  onKeyframeUpdate,
  onKeyframeSelect,
}: PathEditorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Generate smooth path points for visualization
  const pathPoints = useMemo(() => {
    if (!path || path.keyframes.length < 2) return [];
    
    const points: THREE.Vector3[] = [];
    const segments = 50;
    
    for (let i = 0; i < path.keyframes.length - 1; i++) {
      const kf1 = path.keyframes[i];
      const kf2 = path.keyframes[i + 1];
      
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        tempVec3.set(
          kf1.position[0] + (kf2.position[0] - kf1.position[0]) * t,
          kf1.position[1] + (kf2.position[1] - kf1.position[1]) * t,
          kf1.position[2] + (kf2.position[2] - kf1.position[2]) * t
        );
        points.push(tempVec3.clone());
      }
    }
    
    return points;
  }, [path]);
  
  // Handle keyframe selection
  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
    onKeyframeSelect?.(index);
    
    // Emit event
    if (path) {
      eventBus.emit('motion:keyframeSelected', { 
        pathId: path.id, 
        index,
        keyframe: path.keyframes[index] 
      });
    }
  }, [onKeyframeSelect, path]);
  
  // Handle keyframe drag
  const handleDrag = useCallback((index: number, position: [number, number, number]) => {
    if (!path) return;
    
    const updatedKeyframe: Keyframe = {
      ...path.keyframes[index],
      position,
    };
    
    onKeyframeUpdate?.(index, updatedKeyframe);
  }, [onKeyframeUpdate, path]);
  
  // Update camera preview on frame
  useFrame(() => {
    // Future: preview camera position based on timeline
  });
  
  if (!path || path.keyframes.length === 0) {
    return null;
  }
  
  return (
    <group name="path-editor">
      {/* Path line */}
      {pathPoints.length > 1 && (
        <Line
          points={pathPoints}
          color={lineColor}
          lineWidth={2}
        />
      )}
      
      {/* Control points */}
      {path.keyframes.map((keyframe, index) => (
        <ControlPoint
          key={`point-${index}`}
          position={keyframe.position}
          index={index}
          selected={selectedIndex === index}
          color={pointColor}
          selectedColor={selectedColor}
          size={pointSize}
          onSelect={handleSelect}
          onDrag={handleDrag}
          enabled={enabled}
        />
      ))}
      
      {/* Look-at lines for selected keyframe */}
      {selectedIndex !== null && path.keyframes[selectedIndex] && (
        <LookAtLine
          from={path.keyframes[selectedIndex].position}
          to={path.keyframes[selectedIndex].lookAt}
          color={selectedColor}
        />
      )}
      
      {/* Look-at target spheres */}
      {path.keyframes.map((keyframe, index) => (
        <Sphere
          key={`lookAt-${index}`}
          args={[pointSize * 0.5, 8, 8]}
          position={keyframe.lookAt}
        >
          <meshBasicMaterial 
            color={selectedIndex === index ? selectedColor : '#888888'} 
            transparent 
            opacity={0.5}
          />
        </Sphere>
      ))}
    </group>
  );
}

export default PathEditor;
