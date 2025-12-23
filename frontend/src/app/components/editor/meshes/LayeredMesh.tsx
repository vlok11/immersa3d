import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

export const LayeredMesh = ({ url, depthUrl, layers = 5, spacing = 0.5 }: { url: string, depthUrl: string, layers?: number, spacing?: number }) => {
    // Fallback for unconditional hook usage
    const [texture, depthTexture] = useLoader(THREE.TextureLoader, [url, depthUrl || url]);
    const aspect = texture.image.width / texture.image.height;

    // Create N layers
    const layerIndices = useMemo(() => Array.from({ length: layers }, (_, i) => i), [layers]);

    return (
        <group>
            {layerIndices.map((i) => (
                <Layer 
                    key={i} 
                    index={i} 
                    totalLayers={layers} 
                    spacing={spacing} 
                    aspect={aspect} 
                    texture={texture} 
                    depthTexture={depthTexture} 
                />
            ))}
        </group>
    );
}

const Layer = ({ index, totalLayers, spacing, aspect, texture, depthTexture }: { 
    index: number, 
    totalLayers: number, 
    spacing: number, 
    aspect: number, 
    texture: THREE.Texture, 
    depthTexture: THREE.Texture 
}) => {
    
    // Shader Logic:
    // Each layer represents a depth slice.
    // 0 is near (white), 1 is far (black) in standard maps? Or reverse?
    // Usually depth maps: White = Near, Black = Far.
    // We want layer 0 to answer for "Near" pixels, layer N for "Far" pixels.
    // Let's assume uniform distribution.
    
    const minDepth = index / totalLayers;
    const maxDepth = (index + 1) / totalLayers;
    
    // Z-position: Stack layers back. 0 is front.
    // Each layer is pushed back by 'spacing'.
    const zPos = -index * spacing;

    const shaderArgs = useMemo(() => ({
        uniforms: {
            map: { value: texture },
            depthMap: { value: depthTexture },
            minDepth: { value: minDepth },
            maxDepth: { value: maxDepth },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D map;
            uniform sampler2D depthMap;
            uniform float minDepth;
            uniform float maxDepth;
            varying vec2 vUv;
            void main() {
                vec4 depthColor = texture2D(depthMap, vUv);
                float depth = depthColor.r; // Assuming grayscale depth
                
                // Invert depth if map is White=Near (1.0) and Black=Far (0.0)
                // We want 0..1 range.
                // If White(1)=Near, then (1-depth) is distance?
                // Let's stick to raw value check first.
                // Range check:
                // We show this pixel ONLY if its depth value falls in this layer's range.
                // Note: Standard Depth maps (e.g. MiDaS) are inverse depth (disparity). White is close.
                // So High Value = Close. Low Value = Far.
                // Layer 0 is front-most. So it should capture High Values (e.g. 0.8 - 1.0).
                
                // Let's reverse the logic:
                // minThreshold = 1.0 - maxDepth; 
                // maxThreshold = 1.0 - minDepth;
                
                // Example: 5 layers.
                // Layer 0 (Front): index=0. minDepth=0, maxDepth=0.2.
                // We want it to capture depth values 0.8 - 1.0 (Close objects).
                // So bounds: lower = 1.0 - 0.2 = 0.8. upper = 1.0 - 0.0 = 1.0.
                
                float lowerBound = 1.0 - maxDepth;
                float upperBound = 1.0 - minDepth;
                
                if (depth < lowerBound || depth > upperBound) {
                    discard;
                }
                
                vec4 color = texture2D(map, vUv);
                // Optional: Alpha fade at edges?
                gl_FragColor = color;
            }
        `,
        transparent: true
    }), [texture, depthTexture, minDepth, maxDepth]);

    return (
        <mesh position={[0, 0, zPos]}>
            <planeGeometry args={[aspect * 5, 5]} />
            <shaderMaterial args={[shaderArgs]} transparent side={THREE.DoubleSide} />
        </mesh>
    );
};
