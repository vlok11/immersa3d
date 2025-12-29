// Displacement Vertex Shader
// Offsets vertex positions based on depth map values

// Uniforms with 'u' prefix per spec
uniform sampler2D uDepthMap;     // Depth texture (grayscale, 0=far, 1=near)
uniform float uDepthIntensity;   // Displacement strength multiplier
uniform float uDepthScale;       // Overall depth scale factor

// Varyings to pass to fragment shader
varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;
  
  // Sample depth at this vertex's UV coordinates
  // Using texture2DLod for consistent sampling across all vertices
  float depth = texture2D(uDepthMap, uv).r;
  vDepth = depth;
  
  // Calculate displacement amount
  // depth: 0 = background (no displacement)
  // depth: 1 = foreground (max displacement toward camera)
  float displacement = depth * uDepthIntensity * uDepthScale;
  
  // Offset position along the normal (Z direction for plane)
  vec3 displacedPosition = position;
  displacedPosition.z += displacement;
  
  // Transform to clip space
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
}
