'use client';

import React, { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera, Grid, Center, Environment, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, BrightnessContrast, HueSaturation, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';

export interface EditorSceneRef {
    exportGLB: () => void;
    startRecording: () => void;
    stopRecording: () => void;
    exportQuilt: () => void;
}

import { ImageMesh } from './meshes/ImageMesh';
import { PointsMesh } from './meshes/PointsMesh';
import { PlaneMesh } from './meshes/PlaneMesh';
import { LayeredMesh } from './meshes/LayeredMesh';

interface SceneProps {
    imageUrl: string | null;
    depthUrl?: string;
    displacementScale?: number;
    cameraType?: 'perspective' | 'orthographic';
    autoRotate?: boolean;
    animationMode?: 'none' | 'circular' | 'dolly-zoom';
    /* Material / Geometry Props */
    roughness?: number;
    metalness?: number;
    wireframe?: boolean;
    /* Post-processing props */
    bloomIntensity?: number;
    vignetteDarkness?: number;
    /* Metahuman / Atmosphere props */
    envPreset?: 'city' | 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'studio';
    fogColor?: string;
    fogDensity?: number; // 0 to disabled
    /* Geometry */
    geometryMode?: 'mesh' | 'points' | 'plane' | 'layered';
    pointSize?: number;
    resolution?: 'low' | 'medium' | 'high' | 'ultra';
    /* Layered Props */
    layerCount?: number;
    layerSpacing?: number;
    /* Color Correction */
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hue?: number;
    toneMapping?: 'no' | 'aces' | 'filmic' | 'reinhard';
}

const Recorder = React.forwardRef(({ onStop }: { onStop?: () => void }, ref) => {
    const { gl } = useThree();
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);

    React.useImperativeHandle(ref, () => ({
        start: () => {
            chunksRef.current = [];
            const stream = gl.domElement.captureStream(30); // 30 FPS
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'immersa-recording.webm';
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                if (onStop) onStop();
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
        },
        stop: () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        }
    }));

    return null;
});
Recorder.displayName = 'Recorder';

const QuiltExporter = React.forwardRef((_, ref) => {
    const { gl, scene, camera: defaultCamera } = useThree();

    React.useImperativeHandle(ref, () => ({
        export: () => {
            const width = 512;
            const height = 512;
            const columns = 8;
            const rows = 4;
            const totalWidth = width * columns;
            const totalHeight = height * rows;

            // Create Render Target
            const renderTarget = new THREE.WebGLRenderTarget(totalWidth, totalHeight, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
            });

            // Save original state
            const originalRenderTarget = gl.getRenderTarget();
            const originalScissorTest = gl.getScissorTest();
            // We need a specific camera for rendering
            // Clone the existing camera to preserve settings
            const quiltCamera = defaultCamera.clone();
            
            // Quilt Parameters
            const viewCone = 35; // degrees total
            const dist = quiltCamera.position.length(); // distance to center
            const rad = THREE.MathUtils.degToRad(viewCone);
            const size = dist * Math.tan(rad / 2);
            
            gl.setRenderTarget(renderTarget);
            gl.setScissorTest(true);

            // Render Views
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < columns; x++) {
                    const i = y * columns + x;
                    const normalizedProgress = i / (rows * columns - 1); // 0 to 1
                    const viewOffset = (normalizedProgress - 0.5) * size * 2; // -size to +size
                    
                    // Modify Camera
                    quiltCamera.position.copy(defaultCamera.position);
                    // Move camera perpendicular to view direction (assuming view is towards 0,0,0)
                    // Simple approximation: move along X axis if camera is primarily on Z
                    // Better: use camera right vector
                    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(defaultCamera.quaternion);
                    quiltCamera.position.addScaledVector(right, viewOffset);
                    quiltCamera.lookAt(0, 0, 0);

                    // Scissor/Viewport (Bottom-left origin)
                    // rows 0 is bottom? usually row 0 is top in quilt maps. 
                    // Looking Glass standard: starts from bottom-left
                    gl.setScissor(x * width, y * height, width, height);
                    gl.setViewport(x * width, y * height, width, height);

                    gl.render(scene, quiltCamera);
                }
            }

            // Restore state
            gl.setRenderTarget(originalRenderTarget);
            gl.setScissorTest(originalScissorTest);
            
            // Read pixels and save
            const buffer = new Uint8ClampedArray(totalWidth * totalHeight * 4);
            gl.readRenderTargetPixels(renderTarget, 0, 0, totalWidth, totalHeight, buffer);
            
            // Create Canvas to save image
            const canvas = document.createElement('canvas');
            canvas.width = totalWidth;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Determine vertical flip needs? WebGL reads bottom-up. ImageData is top-down.
                // We likely need to flip Y.
                const imageData = ctx.createImageData(totalWidth, totalHeight);
                // Manual copy to flip Y
                for (let y = 0; y < totalHeight; y++) {
                     const srcRow = y; // Bottom-up from buffer? No, readRenderTargetPixels returns bottom-left usually
                     // Actually let's try direct copy and see. 
                     // Typically WebGL data is upside down relative to Canvas 2D
                     // Let's flip it
                     const targetRow = totalHeight - 1 - y;
                     const srcStart = srcRow * totalWidth * 4;
                     const targetStart = targetRow * totalWidth * 4;
                     // This is slow in JS but for 1 frame export it's fine
                     // Using set implementation for speed
                     imageData.data.set(
                         buffer.subarray(srcStart, srcStart + totalWidth * 4),
                         targetStart
                     );
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                // Download
                const link = document.createElement('a');
                link.download = 'immersa-quilt.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
            
            renderTarget.dispose();
        }
    }));

    return null;
});
QuiltExporter.displayName = 'QuiltExporter';



// Camera Controller Component
const CameraController = ({ mode }: { mode: 'none' | 'circular' | 'dolly-zoom' }) => {
    const { camera, clock } = useThree();

    useFrame(() => {
        if (mode === 'none') {
            // Auto rotate handled by OrbitControls if enabled, but we might want manual override logic here later
            return;
        }

        const t = clock.getElapsedTime();

        if (mode === 'circular') {
            const radius = 8;
            const speed = 0.5;
            camera.position.x = Math.sin(t * speed) * radius;
            camera.position.z = Math.cos(t * speed) * radius;
            camera.lookAt(0, 0, 0);
        } else if (mode === 'dolly-zoom') {
            // Dolly Zoom (Vertigo Effect) logic
            // Move camera back and forth while adjusting FOV
            const duration = 5;
            const progress = (Math.sin(t * (Math.PI / duration)) + 1) / 2; // 0 to 1 oscillating
            
            const distance = 8 + progress * 10; // 8 to 18
            
            camera.position.z = distance;
            
            if (camera instanceof THREE.PerspectiveCamera) {
                // Keep target height constant
                // tan(fov/2) * dist = constant
                // We want reference width/height at dist=8 to match
                const initialFov = 50;
                const frustumHeight = 2 * 8 * Math.tan(THREE.MathUtils.degToRad(initialFov / 2));
                
                const newFov = 2 * THREE.MathUtils.radToDeg(Math.atan(frustumHeight / (2 * distance)));
                camera.fov = newFov;
                camera.updateProjectionMatrix();
            }
        }
    });

    return null;
}

const Viewer = ({ imageUrl, depthUrl, displacementScale, envPreset = 'city', roughness, metalness, wireframe, geometryMode = 'mesh', pointSize = 2.0, resolution = 'medium', layerCount = 5, layerSpacing = 0.5 }: SceneProps) => {
     return (
        <Suspense fallback={<Html center>Loading 3D Scene...</Html>}>
            <Center>
                {imageUrl && (
                    geometryMode === 'points' && depthUrl ? (
                         <PointsMesh 
                            url={imageUrl} 
                            depthUrl={depthUrl} 
                            displacementScale={displacementScale ?? 0} 
                            pointSize={pointSize}
                            resolution={resolution}
                        />
                    ) : geometryMode === 'plane' ? (
                        <PlaneMesh 
                            url={imageUrl}
                            depthUrl={depthUrl} 
                            displacementScale={displacementScale ?? 0} 
                            roughness={roughness}
                            metalness={metalness}
                            wireframe={wireframe}
                            resolution={resolution}
                        />
                    ) : geometryMode === 'layered' && depthUrl ? (
                         <LayeredMesh 
                            url={imageUrl}
                            depthUrl={depthUrl}
                            layers={layerCount ?? 5}
                            spacing={layerSpacing ?? 0.5}
                        />
                    ) : (
                        <ImageMesh 
                            url={imageUrl} 
                            depthUrl={depthUrl} 
                            displacementScale={displacementScale ?? 0} 
                            roughness={roughness}
                            metalness={metalness}
                            wireframe={wireframe}
                        />
                    )
                )}
            </Center>
            <Grid args={[10.5, 10.5]} cellColor='gray' sectionColor='white' infiniteGrid fadeDistance={50} />
            <Environment preset={envPreset} background blur={0.5} />
        </Suspense>
     )
}

const EditorScene = React.forwardRef<EditorSceneRef, SceneProps>(({ 
    imageUrl, 
    depthUrl, 
    displacementScale, 
    cameraType = 'perspective', 
    autoRotate = false,
    animationMode = 'none',
    bloomIntensity = 0.0,
    vignetteDarkness = 0.0,
    envPreset = 'city',
    fogColor = '#000000',
    fogDensity = 0,
    geometryMode = 'mesh',
    pointSize = 2.0,
    resolution = 'medium',
    layerCount = 5,
    layerSpacing = 0.5,
    roughness = 0.5,
    metalness = 0.5,
    wireframe = false,
    brightness = 0,
    contrast = 0,
    saturation = 0,
    hue = 0,
    toneMapping = 'no'
}, ref) => {
    const sceneRef = React.useRef<THREE.Group>(null);
    const recorderRef = React.useRef<{ start: () => void, stop: () => void }>(null);
    const quiltExporterRef = React.useRef<{ export: () => void }>(null);

    React.useImperativeHandle(ref, () => ({
        exportGLB: () => {
            if (!sceneRef.current) return;
            const exporter = new GLTFExporter();
            exporter.parse(
                sceneRef.current,
                (gltf) => {
                    const blob = new Blob([gltf as ArrayBuffer], { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'immersa-scene.glb';
                    link.click();
                    URL.revokeObjectURL(url);
                },
                (error) => {
                    console.error('An error happened during GLB export', error);
                },
                { binary: true }
            );
        },
        startRecording: () => {
            recorderRef.current?.start();
        },
        stopRecording: () => {
            recorderRef.current?.stop();
        },
        exportQuilt: () => {
             quiltExporterRef.current?.export();
        }
    }));

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '500px', background: '#111' }}>
            <Canvas>
                 <Recorder ref={recorderRef} />
                 <QuiltExporter ref={quiltExporterRef} />
                 <group ref={sceneRef}>
                    {fogDensity > 0 && <fog attach="fog" args={[fogColor, 5, 5 + (10 - fogDensity) * 5]} />} 
                    {/* Simple linear fog: near=5, far based on density. Or use fogExp2 for density */}
                    {cameraType === 'perspective' ? (
                        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
                    ) : (
                        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={40} />
                    )}
                    
                    <OrbitControls enableDamping autoRotate={autoRotate && animationMode === 'none'} autoRotateSpeed={1.0} />
                    <CameraController mode={animationMode} />
                    
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <Viewer 
                        imageUrl={imageUrl} 
                        depthUrl={depthUrl} 
                        displacementScale={displacementScale} 
                        envPreset={envPreset} 
                        roughness={roughness}
                        metalness={metalness}
                        wireframe={wireframe}
                        geometryMode={geometryMode}
                        pointSize={pointSize}
                        resolution={resolution}
                        layerCount={layerCount}
                        layerSpacing={layerSpacing}
                    />
                </group>
                
                <EffectComposer>
                    {bloomIntensity > 0 ? <Bloom luminanceThreshold={0.2} mipmapBlur intensity={bloomIntensity} /> : <></>}
                    {vignetteDarkness > 0 ? <Vignette eskil={false} offset={0.1} darkness={vignetteDarkness} /> : <></>}
                    <BrightnessContrast brightness={brightness} contrast={contrast} />
                    <HueSaturation saturation={saturation} hue={hue} />
                    <ToneMapping mode={
                        toneMapping === 'aces' ? THREE.ACESFilmicToneMapping :
                        toneMapping === 'filmic' ? THREE.CineonToneMapping :
                        toneMapping === 'reinhard' ? THREE.ReinhardToneMapping :
                        THREE.NoToneMapping
                    } />
                </EffectComposer>
            </Canvas>
        </div>
    );
});

EditorScene.displayName = 'EditorScene';

export default EditorScene;
