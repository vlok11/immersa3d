// Cylindrical Projection Vertex Shader
// Displaces cylinder vertices based on depth for panoramic view

// Uniforms with 'u' prefix per spec
uniform sampler2D uDepthMap;     // Depth texture
uniform float uDepthIntensity;   // Displacement strength
uniform float uRadius;           // Cylinder radius

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
  
  // Radial displacement based on depth
  // depth: 0 = far (push outward), 1 = near (pull inward)
  float displacement = (depth - 0.5) * uDepthIntensity * 2.0;
  
  // Displace along normal direction (radial from cylinder axis)
  vec3 radialNormal = normalize(vec3(position.x, 0.0, position.z));
  vec3 displacedPosition = position + radialNormal * displacement;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
