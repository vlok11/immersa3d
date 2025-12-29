// Displacement Fragment Shader
// Renders the color texture with optional depth visualization

// Uniforms with 'u' prefix per spec
uniform sampler2D uColorMap;      // Original image texture
uniform sampler2D uDepthMap;      // Depth map for visualization
uniform bool uShowDepth;          // Toggle depth visualization mode
uniform float uOpacity;           // Overall opacity

// Varyings from vertex shader
varying vec2 vUv;
varying float vDepth;

// Color mapping for depth visualization
vec3 depthToColor(float depth) {
  // Blue (far) -> Green -> Yellow -> Red (near)
  vec3 color;
  
  if (depth < 0.25) {
    // Blue to Cyan
    color = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), depth * 4.0);
  } else if (depth < 0.5) {
    // Cyan to Green
    color = mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 1.0, 0.0), (depth - 0.25) * 4.0);
  } else if (depth < 0.75) {
    // Green to Yellow
    color = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (depth - 0.5) * 4.0);
  } else {
    // Yellow to Red
    color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (depth - 0.75) * 4.0);
  }
  
  return color;
}

void main() {
  if (uShowDepth) {
    // Depth visualization mode
    float depth = texture2D(uDepthMap, vUv).r;
    vec3 depthColor = depthToColor(depth);
    gl_FragColor = vec4(depthColor, uOpacity);
  } else {
    // Normal color mode
    vec4 color = texture2D(uColorMap, vUv);
    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
}
