// Point Cloud Vertex Shader
// Positions points in 3D space based on depth values

// Uniforms with 'u' prefix per spec
uniform sampler2D uDepthMap;      // Depth texture
uniform sampler2D uColorMap;      // Color texture for point colors
uniform float uDepthIntensity;    // Depth displacement scale
uniform float uPointSize;         // Base point size
uniform float uDepthCutoff;       // Minimum depth to render (background removal)
uniform vec2 uResolution;         // Point grid resolution

// Varyings to fragment shader
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vUv = uv;
  
  // Sample depth and color at this point's UV
  float depth = texture2D(uDepthMap, uv).r;
  vec4 color = texture2D(uColorMap, uv);
  
  vColor = color.rgb;
  
  // Background cutoff - make very far points transparent
  vAlpha = depth > uDepthCutoff ? 1.0 : 0.0;
  
  // Calculate Z displacement
  // depth: 0 = far (z = 0), 1 = near (z = max)
  float zOffset = depth * uDepthIntensity;
  
  // Position in 3D space
  vec3 pos = vec3(position.xy, zOffset);
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Dynamic point size based on depth (closer = larger)
  // Also apply perspective scaling
  float sizeScale = 0.5 + depth * 0.5;
  gl_PointSize = uPointSize * sizeScale * (300.0 / -mvPosition.z);
  
  // Clamp point size
  gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
}
