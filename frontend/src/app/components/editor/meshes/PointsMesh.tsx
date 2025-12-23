import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

export const PointsMesh = ({ url, depthUrl, displacementScale, pointSize, resolution = 'medium' }: { url: string, depthUrl: string, displacementScale: number, pointSize: number, resolution?: 'low' | 'medium' | 'high' | 'ultra' }) => {
    // Fallback for unconditional hook usage (though depthUrl should be present in points mode logic)
    const [texture, depthTexture] = useLoader(THREE.TextureLoader, [url, depthUrl || url]); // hack: load url twice if depthUrl missing to satisfy hook, but logic prevents rendering
    const aspect = texture.image.width / texture.image.height;
    
    const segments = useMemo(() => {
        switch(resolution) {
            case 'low': return 128;
            case 'medium': return 256;
            case 'high': return 512;
            case 'ultra': return 1024;
            default: return 256;
        }
    }, [resolution]);

    const shaderArgs = useMemo(() => ({
        uniforms: {
            map: { value: texture },
            depthMap: { value: depthTexture },
            displacementScale: { value: displacementScale },
            pointSize: { value: pointSize }
        },
        vertexShader: `
            uniform sampler2D map;
            uniform sampler2D depthMap;
            uniform float displacementScale;
            uniform float pointSize;
            varying vec2 vUv;
            varying vec3 vColor;
            void main() {
                vUv = uv;
                vec4 depthColor = texture2D(depthMap, uv);
                float displacement = depthColor.r * displacementScale;
                vec3 newPosition = position + normal * displacement;
                vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                gl_PointSize = pointSize * (300.0 / -mvPosition.z);
                vColor = texture2D(map, uv).rgb;
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            varying vec3 vColor;
            void main() {
                gl_FragColor = vec4(vColor, 1.0);
            }
        `
    }), [texture, depthTexture, displacementScale, pointSize]);

    // Ensure uniforms are updated when props change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useMemo(() => {
        if(shaderArgs.uniforms) {
            shaderArgs.uniforms.displacementScale.value = displacementScale;
            shaderArgs.uniforms.pointSize.value = pointSize;
        }
    }, [displacementScale, pointSize]);

    return (
        <points>
            <planeGeometry args={[10 * aspect, 10, segments, segments]} />
            <shaderMaterial args={[shaderArgs]} transparent depthWrite={false} />
        </points>
    );
}
