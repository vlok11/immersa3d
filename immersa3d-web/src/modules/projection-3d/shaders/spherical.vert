// Spherical Projection Vertex Shader
// Displaces sphere vertices based on depth for VR panorama

// Uniforms with 'u' prefix per spec
uniform sampler2D uDepthMap;     // Depth texture
uniform float uDepthIntensity;   // Displacement strength
uniform float uRadius;           // Sphere radius

// Varyings to fragment shader
varying vec2 vUv;
varying float vDepth;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  
  // Sample depth at UV coordinates
  float depth = texture2D(uDepthMap, uv).r;
  vDepth = depth;
  
  // Inward displacement for depth effect
  // depth: 0 = far (push away), 1 = near (pull closer)
  float displacement = (depth - 0.5) * uDepthIntensity * 2.0;
  
  // Displace along normal direction (radial)
  vec3 displacedPosition = position + normal * displacement;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
