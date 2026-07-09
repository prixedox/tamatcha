import * as S from './shaders'

export interface Quality { simRes: number; dyeRes: number }
export const HIGH: Quality = { simRes: 144, dyeRes: 512 }
export const LOW: Quality = { simRes: 96, dyeRes: 384 }

const VELOCITY_DISSIPATION = 0.6 // thick liquid: swirls slow down
const DYE_DISSIPATION = 0.12     // color lingers
const CURL_STRENGTH = 14
const PRESSURE_DECAY = 0.8
const PRESSURE_ITERATIONS = 20
const SPLAT_RADIUS = 0.0035

interface FBO {
  fb: WebGLFramebuffer; tex: WebGLTexture
  w: number; h: number; texelX: number; texelY: number
}
interface DoubleFBO { read: FBO; write: FBO; swap(): void }

class Program {
  prog: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | null> = {}
  constructor(private gl: WebGL2RenderingContext, frag: string) {
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed')
      return sh
    }
    this.prog = gl.createProgram()!
    gl.attachShader(this.prog, compile(gl.VERTEX_SHADER, S.VERT))
    gl.attachShader(this.prog, compile(gl.FRAGMENT_SHADER, frag))
    gl.linkProgram(this.prog)
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(this.prog) ?? 'link failed')
    const n = gl.getProgramParameter(this.prog, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(this.prog, i)!.name
      this.uniforms[name] = gl.getUniformLocation(this.prog, name)
    }
  }
  use() { this.gl.useProgram(this.prog) }
}

export class FluidSim {
  private gl: WebGL2RenderingContext
  private quality: Quality
  private velocity!: DoubleFBO
  private dye!: DoubleFBO
  private pressure!: DoubleFBO
  private divergence!: FBO
  private curl!: FBO
  private p: Record<string, Program>
  private vao: WebGLVertexArrayObject
  private destroyed = false

  constructor(private canvas: HTMLCanvasElement, quality: Quality = HIGH) {
    const gl = canvas.getContext('webgl2', {
      alpha: false, depth: false, stencil: false, antialias: false,
    })
    if (!gl) throw new Error('no webgl2')
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float render targets')
    this.gl = gl
    this.quality = quality

    // fullscreen quad
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    this.p = {
      advection: new Program(gl, S.ADVECTION),
      divergence: new Program(gl, S.DIVERGENCE),
      curl: new Program(gl, S.CURL),
      vorticity: new Program(gl, S.VORTICITY),
      pressure: new Program(gl, S.PRESSURE),
      gradient: new Program(gl, S.GRADIENT_SUBTRACT),
      splat: new Program(gl, S.SPLAT),
      clear: new Program(gl, S.CLEAR),
      display: new Program(gl, S.DISPLAY),
    }
    this.resize()
  }

  private createFBO(w: number, h: number, internal: number, format: number): FBO {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null)
    const fb = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { fb, tex, w, h, texelX: 1 / w, texelY: 1 / h }
  }

  private createDouble(w: number, h: number, internal: number, format: number): DoubleFBO {
    let a = this.createFBO(w, h, internal, format)
    let b = this.createFBO(w, h, internal, format)
    return {
      get read() { return a }, get write() { return b },
      swap() { const t = a; a = b; b = t },
    } as DoubleFBO
  }

  resize(): void {
    const gl = this.gl
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    const aspect = w / h
    const simH = this.quality.simRes
    const simW = Math.round(simH * aspect)
    const dyeH = this.quality.dyeRes
    const dyeW = Math.round(dyeH * aspect)
    this.velocity = this.createDouble(simW, simH, gl.RG16F, gl.RG)
    this.pressure = this.createDouble(simW, simH, gl.R16F, gl.RED)
    this.divergence = this.createFBO(simW, simH, gl.R16F, gl.RED)
    this.curl = this.createFBO(simW, simH, gl.R16F, gl.RED)
    this.dye = this.createDouble(dyeW, dyeH, gl.R16F, gl.RED)
  }

  setQuality(q: Quality): void {
    this.quality = q
    this.resize()
  }

  private blit(target: FBO | null): void {
    const gl = this.gl
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb)
      gl.viewport(0, 0, target.w, target.h)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  private bindTex(unit: number, tex: WebGLTexture): number {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    return unit
  }

  splat(x: number, y: number, dx: number, dy: number, amount: number): void {
    if (this.destroyed) return
    const gl = this.gl
    const aspect = this.canvas.width / this.canvas.height
    const sp = this.p.splat
    sp.use()
    gl.uniform1f(sp.uniforms.aspectRatio, aspect)
    gl.uniform2f(sp.uniforms.point, x, y)
    gl.uniform1f(sp.uniforms.radius, SPLAT_RADIUS)
    // velocity splat
    gl.uniform1i(sp.uniforms.uTarget, this.bindTex(0, this.velocity.read.tex))
    gl.uniform2f(sp.uniforms.texelSize, this.velocity.read.texelX, this.velocity.read.texelY)
    gl.uniform3f(sp.uniforms.color, dx, dy, 0)
    this.blit(this.velocity.write); this.velocity.swap()
    // dye splat (density in red channel)
    gl.uniform1i(sp.uniforms.uTarget, this.bindTex(0, this.dye.read.tex))
    gl.uniform2f(sp.uniforms.texelSize, this.dye.read.texelX, this.dye.read.texelY)
    gl.uniform3f(sp.uniforms.color, amount, 0, 0)
    this.blit(this.dye.write); this.dye.swap()
    window.__tamatcha.splats++
  }

  frame(dtMs: number): void {
    if (this.destroyed) return
    const gl = this.gl
    const dt = Math.min(Math.max(dtMs / 1000, 0.008), 0.033)
    const v = this.velocity

    // curl + vorticity confinement
    this.p.curl.use()
    gl.uniform2f(this.p.curl.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.curl.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    this.blit(this.curl)

    this.p.vorticity.use()
    gl.uniform2f(this.p.vorticity.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.vorticity.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    gl.uniform1i(this.p.vorticity.uniforms.uCurl, this.bindTex(1, this.curl.tex))
    gl.uniform1f(this.p.vorticity.uniforms.curl, CURL_STRENGTH)
    gl.uniform1f(this.p.vorticity.uniforms.dt, dt)
    this.blit(v.write); v.swap()

    // divergence + pressure solve
    this.p.divergence.use()
    gl.uniform2f(this.p.divergence.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.divergence.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    this.blit(this.divergence)

    this.p.clear.use()
    gl.uniform2f(this.p.clear.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.clear.uniforms.uTexture, this.bindTex(0, this.pressure.read.tex))
    gl.uniform1f(this.p.clear.uniforms.value, PRESSURE_DECAY)
    this.blit(this.pressure.write); this.pressure.swap()

    this.p.pressure.use()
    gl.uniform2f(this.p.pressure.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.pressure.uniforms.uDivergence, this.bindTex(1, this.divergence.tex))
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(this.p.pressure.uniforms.uPressure, this.bindTex(0, this.pressure.read.tex))
      this.blit(this.pressure.write); this.pressure.swap()
    }

    this.p.gradient.use()
    gl.uniform2f(this.p.gradient.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1i(this.p.gradient.uniforms.uPressure, this.bindTex(0, this.pressure.read.tex))
    gl.uniform1i(this.p.gradient.uniforms.uVelocity, this.bindTex(1, v.read.tex))
    this.blit(v.write); v.swap()

    // advect velocity, then dye
    this.p.advection.use()
    gl.uniform2f(this.p.advection.uniforms.texelSize, v.read.texelX, v.read.texelY)
    gl.uniform1f(this.p.advection.uniforms.dt, dt)
    gl.uniform1i(this.p.advection.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    gl.uniform1i(this.p.advection.uniforms.uSource, this.bindTex(0, v.read.tex))
    gl.uniform1f(this.p.advection.uniforms.dissipation, VELOCITY_DISSIPATION)
    this.blit(v.write); v.swap()

    gl.uniform1i(this.p.advection.uniforms.uVelocity, this.bindTex(0, v.read.tex))
    gl.uniform1i(this.p.advection.uniforms.uSource, this.bindTex(1, this.dye.read.tex))
    gl.uniform1f(this.p.advection.uniforms.dissipation, DYE_DISSIPATION)
    this.blit(this.dye.write); this.dye.swap()

    // composite to screen through the matcha ramp
    // (texelSize is unused in DISPLAY and may be optimized out — do not set it)
    this.p.display.use()
    gl.uniform1i(this.p.display.uniforms.uDye, this.bindTex(0, this.dye.read.tex))
    this.blit(null)
    window.__tamatcha.frames++
  }

  destroy(): void {
    this.destroyed = true
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
