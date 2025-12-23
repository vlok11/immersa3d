import React from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

interface PlaneMeshProps {
    url: string;
    depthUrl?: string;
    displacementScale?: number;
    roughness?: number;
    metalness?: number;
    wireframe?: boolean;
    resolution?: 'low' | 'medium' | 'high' | 'ultra';
}

export function PlaneMesh({ 
    url, 
    depthUrl, 
    displacementScale = 0, 
    roughness = 0.5, 
    metalness = 0.5, 
    wireframe = false,
    resolution = 'medium'
}: PlaneMeshProps) {
    
    // Always load texture. If depthUrl is missing, use a fallback (black) or just don't displace.
    // However, hooks order must not change.
    // We can conditionally useTexture if we are sure depthUrl exists or handle it gracefully.
    // Better: Load both, if depth is undefined pass null to hook? No, hooks can't change.
    
    // We'll optimistically load depthUrl if provided, otherwise we need a strategy.
    // React-three/drei useTexture can take an array or object.
    
    // Simple approach: Only render PlaneMesh if depthUrl is present (controlled by parent).
    // If parent renders this without depthUrl, it might crash if we try to load undefined.
    
    // Use a 1x1 black pixel as fallback to ensure hook is always called
    const fallbackUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const texture = useTexture(url);
    const depthTexture = useTexture(depthUrl || fallbackUrl);

    const materialRef = React.useRef<THREE.MeshStandardMaterial>(null);

    const segments = React.useMemo(() => {
        switch(resolution) {
            case 'low': return 128;
            case 'medium': return 256;
            case 'high': return 512;
            case 'ultra': return 1024;
            default: return 256;
        }
    }, [resolution]);

    // Update material properties
    React.useLayoutEffect(() => {
        if (materialRef.current) {
            materialRef.current.needsUpdate = true;
        }
    }, [displacementScale, wireframe, roughness, metalness]);

    return (
        <mesh rotation={[0, 0, 0]}>
            <planeGeometry args={[16, 9, segments, segments]} />
            <meshStandardMaterial
                ref={materialRef}
                map={texture}
                displacementMap={depthUrl ? depthTexture : undefined}
                displacementScale={depthUrl ? displacementScale : 0}
                roughness={roughness}
                metalness={metalness}
                wireframe={wireframe}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}
