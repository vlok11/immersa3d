// Cylindrical Projection Fragment Shader
// Renders color texture on cylinder interior

// Uniforms with 'u' prefix per spec
uniform sampler2D uColorMap;    // Color texture
uniform sampler2D uDepthMap;    // Depth map
uniform float uOpacity;         // Overall opacity

// Varyings from vertex shader
varying vec2 vUv;
varying float vDepth;
varying vec3 vNormal;

void main() {
  // Sample color texture
  vec4 color = texture2D(uColorMap, vUv);
  
  // Simple ambient lighting
  vec3 lightDir = normalize(vec3(0.0, 0.5, 1.0));
  float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.25 + 0.75;
  
  // Apply lighting
  vec3 finalColor = color.rgb * diffuse;
  
  gl_FragColor = vec4(finalColor, color.a * uOpacity);
}
