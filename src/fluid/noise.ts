import { VERT, RAMP_GLSL } from './shaders'

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime;
uniform vec2 uPointer;
uniform float uAspect;
${RAMP_GLSL}
float hash (vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise (vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm (vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
void main () {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 q = vec2(fbm(p * 2.6 + uTime * 0.05), fbm(p * 2.6 - uTime * 0.04));
  vec2 pd = (uPointer - vUv) * vec2(uAspect, 1.0);
  float ripple = exp(-dot(pd, pd) * 26.0) * 0.30;
  float d = fbm(p * 2.0 + q * 1.7 + uTime * 0.02) * 0.9 + ripple;
  fragColor = vec4(matchaRamp(clamp(d, 0.0, 1.0)), 1.0);
}`

export function startNoise(hero: HTMLElement, canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false })
  if (!gl) throw new Error('no webgl2')

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src); gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('compile failed')
    return sh
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed')
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const uTime = gl.getUniformLocation(prog, 'uTime')
  const uPointer = gl.getUniformLocation(prog, 'uPointer')
  const uAspect = gl.getUniformLocation(prog, 'uAspect')

  let px = 0.5, py = 0.5, tx = 0.5, ty = 0.5
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    tx = (e.clientX - r.left) / r.width
    ty = 1 - (e.clientY - r.top) / r.height
  }
  hero.addEventListener('pointermove', onMove)

  let running = true
  let raf = 0
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  resize()
  window.addEventListener('resize', resize)

  const t0 = performance.now()
  const loop = (now: number) => {
    if (!running) return
    px += (tx - px) * 0.06; py += (ty - py) * 0.06
    gl.uniform1f(uTime, (now - t0) / 1000)
    gl.uniform2f(uPointer, px, py)
    gl.uniform1f(uAspect, canvas.width / Math.max(canvas.height, 1))
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    window.__tamatcha.frames++
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    running = false
    cancelAnimationFrame(raf)
    hero.removeEventListener('pointermove', onMove)
    window.removeEventListener('resize', resize)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
