import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

const SimpleImageMesh = ({ url }: { url: string }) => {
    const texture = useLoader(THREE.TextureLoader, url);
    const aspect = texture.image.width / texture.image.height;
    return (
        <mesh>
             <planeGeometry args={[aspect * 5, 5]} />
             <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
    );
}

const DepthImageMesh = ({ url, depthUrl, displacementScale, roughness, metalness, wireframe }: { url: string, depthUrl: string, displacementScale: number, roughness?: number, metalness?: number, wireframe?: boolean }) => {
    const [texture, depthTexture] = useLoader(THREE.TextureLoader, [url, depthUrl]);
    const { width, height } = texture.image;
    const aspect = width / height;
    
    // High segment count for smooth displacement
    const args = useMemo(() => [aspect * 5, 5, 256, 256] as const, [aspect]);

    return (
        <mesh>
            <planeGeometry args={args} />
            <meshStandardMaterial 
                map={texture} 
                displacementMap={depthTexture}
                displacementScale={displacementScale}
                side={THREE.DoubleSide}
                roughness={roughness}
                metalness={metalness}
                wireframe={wireframe}
            />
        </mesh>
    );
};

export const ImageMesh = ({ url, depthUrl, displacementScale = 1.0, roughness, metalness, wireframe }: { url: string, depthUrl?: string, displacementScale?: number, roughness?: number, metalness?: number, wireframe?: boolean }) => {
    if (depthUrl) {
        return <DepthImageMesh url={url} depthUrl={depthUrl} displacementScale={displacementScale} roughness={roughness} metalness={metalness} wireframe={wireframe} />;
    }
    return <SimpleImageMesh url={url} />;
};
