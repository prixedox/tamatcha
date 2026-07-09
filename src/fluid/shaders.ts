export const VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const HEADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 texelSize;`

export const ADVECTION = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float dt;
uniform float dissipation;
void main () {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
  fragColor = texture(uSource, coord) / (1.0 + dissipation * dt);
}`

export const DIVERGENCE = `${HEADER}
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vUv - vec2(texelSize.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(texelSize.x, 0.0)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, texelSize.y)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, texelSize.y)).y;
  fragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`

export const CURL = `${HEADER}
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vUv - vec2(texelSize.x, 0.0)).y;
  float R = texture(uVelocity, vUv + vec2(texelSize.x, 0.0)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, texelSize.y)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, texelSize.y)).x;
  fragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`

export const VORTICITY = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture(uCurl, vUv - vec2(texelSize.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(texelSize.x, 0.0)).x;
  float B = texture(uCurl, vUv - vec2(0.0, texelSize.y)).x;
  float T = texture(uCurl, vUv + vec2(0.0, texelSize.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force = force / (length(force) + 0.0001) * curl * C;
  force.y *= -1.0;
  vec2 velocity = texture(uVelocity, vUv).xy + force * dt;
  fragColor = vec4(velocity, 0.0, 1.0);
}`

export const PRESSURE = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
  float B = texture(uPressure, vUv - vec2(0.0, texelSize.y)).x;
  float T = texture(uPressure, vUv + vec2(0.0, texelSize.y)).x;
  float divergence = texture(uDivergence, vUv).x;
  fragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`

export const GRADIENT_SUBTRACT = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
  float B = texture(uPressure, vUv - vec2(0.0, texelSize.y)).x;
  float T = texture(uPressure, vUv + vec2(0.0, texelSize.y)).x;
  vec2 velocity = texture(uVelocity, vUv).xy - 0.5 * vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`

export const SPLAT = `${HEADER}
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}`

export const CLEAR = `${HEADER}
uniform sampler2D uTexture;
uniform float value;
void main () {
  fragColor = value * texture(uTexture, vUv);
}`

// brand color ramp: forest-2 -> forest -> matcha-deep -> matcha -> cream
export const RAMP_GLSL = `
vec3 matchaRamp (float t) {
  vec3 c0 = vec3(0.055, 0.153, 0.110);
  vec3 c1 = vec3(0.094, 0.227, 0.173);
  vec3 c2 = vec3(0.369, 0.541, 0.204);
  vec3 c3 = vec3(0.561, 0.725, 0.294);
  vec3 c4 = vec3(0.925, 0.902, 0.843);
  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.55) return mix(c1, c2, (t - 0.25) / 0.30);
  if (t < 0.85) return mix(c2, c3, (t - 0.55) / 0.30);
  return mix(c3, c4, (t - 0.85) / 0.15);
}`

export const DISPLAY = `${HEADER}
uniform sampler2D uDye;
${RAMP_GLSL}
float grain (vec2 p) {
  return fract(sin(dot(p * 913.0, vec2(12.9898, 78.233))) * 43758.5453);
}
void main () {
  float d = clamp(texture(uDye, vUv).x, 0.0, 1.0);
  vec3 col = matchaRamp(d);
  fragColor = vec4(col + (grain(vUv) - 0.5) * 0.03, 1.0);
}`
