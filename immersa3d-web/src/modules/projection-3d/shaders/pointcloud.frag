// Point Cloud Fragment Shader
// Renders colored points with circular shape

// Varyings from vertex shader
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Create circular points using gl_PointCoord
  // gl_PointCoord is [0,1] from top-left of point
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  
  // Discard pixels outside circle
  if (dist > 0.5) {
    discard;
  }
  
  // Discard background points
  if (vAlpha < 0.5) {
    discard;
  }
  
  // Soft edge falloff for anti-aliasing
  float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
  
  // Apply point color with alpha
  gl_FragColor = vec4(vColor, alpha * vAlpha);
}
