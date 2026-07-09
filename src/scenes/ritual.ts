import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const C = {
  forest: '#183A2C', forest2: '#0E271C', forest3: '#21503C',
  matcha: '#8FB94B', matchaDeep: '#5E8A34',
  cream: '#ECE6D7', cream2: '#F4EFE4', ink: '#1B241E',
}

interface Particle { x: number; y: number; r: number; speed: number; drift: number }

function makeParticles(n: number, seed: number): Particle[] {
  // deterministic pseudo-random so scrubbing backwards looks identical
  let s = seed
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  return Array.from({ length: n }, () => ({
    x: rnd(), y: rnd(), r: 1 + rnd() * 2.2, speed: 0.6 + rnd() * 0.8, drift: (rnd() - 0.5) * 0.2,
  }))
}

export function createRitualRenderer(canvas: HTMLCanvasElement): (progress: number) => void {
  const ctx = canvas.getContext('2d')!
  const powder = makeParticles(90, 7)
  const foam = makeParticles(40, 13)

  return (progress: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = C.cream2
    ctx.fillRect(0, 0, w, h)

    const chapter = Math.min(Math.floor(progress), 2)
    const local = progress - chapter
    const cx = w / 2

    if (chapter === 0) drawSift(ctx, w, h, cx, local, powder)
    else if (chapter === 1) drawWhisk(ctx, w, h, cx, local, foam)
    else drawServe(ctx, w, h, cx, local)

    window.__tamatcha.ritualStep = chapter
  }

  function drawBowl(ctx: CanvasRenderingContext2D, cx: number, by: number, bw: number, bh: number) {
    ctx.strokeStyle = C.forest; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - bw / 2, by)
    ctx.quadraticCurveTo(cx, by + bh, cx + bw / 2, by)
    ctx.stroke()
  }

  function drawSift(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, t: number, ps: Particle[]) {
    // sieve
    ctx.strokeStyle = C.forest; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.ellipse(cx, h * 0.2, w * 0.14, h * 0.035, 0, 0, Math.PI * 2); ctx.stroke()
    // falling powder: each particle falls once, staggered by its x as delay
    ctx.fillStyle = C.matchaDeep
    for (const p of ps) {
      const delay = p.x * 0.55
      const fall = Math.min(Math.max((t - delay) / 0.45, 0), 1)
      if (fall <= 0) continue
      const px = cx + (p.y - 0.5) * w * 0.24 + p.drift * 40 * fall
      const py = h * 0.24 + fall * (h * 0.5)
      ctx.globalAlpha = 1 - fall * 0.25
      ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    // accumulating pile
    const pile = t * h * 0.045
    ctx.fillStyle = C.matchaDeep
    ctx.beginPath()
    ctx.ellipse(cx, h * 0.76, w * 0.12 * Math.min(t * 1.6, 1), pile, 0, Math.PI, 0)
    ctx.fill()
    drawBowl(ctx, cx, h * 0.76, w * 0.34, h * 0.16)
  }

  function drawWhisk(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, t: number, foam: Particle[]) {
    // liquid rises with t
    const level = h * (0.76 - t * 0.1)
    ctx.fillStyle = C.matcha
    ctx.beginPath()
    ctx.ellipse(cx, (level + h * 0.78) / 2, w * 0.15, (h * 0.78 - level) / 2 + 8, 0, 0, Math.PI * 2)
    ctx.fill()
    // swirl lines rotating with t
    ctx.strokeStyle = C.matchaDeep; ctx.lineWidth = 2.5
    const spin = t * Math.PI * 14
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.ellipse(cx, (level + h * 0.78) / 2, w * (0.05 + i * 0.035), h * 0.02,
        spin + (i * Math.PI) / 3, 0, Math.PI * 1.4)
      ctx.stroke()
    }
    // chasen whisk: handle + tines, oscillating horizontally
    const wx = cx + Math.sin(spin) * w * 0.05
    ctx.strokeStyle = C.forest; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(wx, h * 0.12); ctx.lineTo(wx, h * 0.42); ctx.stroke()
    ctx.lineWidth = 2
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath()
      ctx.moveTo(wx, h * 0.42)
      ctx.quadraticCurveTo(wx + i * 9, h * 0.52, wx + i * 7, level - 4)
      ctx.stroke()
    }
    // foam bubbles appear near surface as t grows
    ctx.fillStyle = C.cream
    for (const f of foam) {
      if (f.x > t) continue
      const fx = cx + (f.y - 0.5) * w * 0.24
      const fy = level - 4 - f.drift * 30
      ctx.globalAlpha = 0.85
      ctx.beginPath(); ctx.arc(fx, fy, f.r, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    drawBowl(ctx, cx, h * 0.78, w * 0.34, h * 0.16)
  }

  function drawServe(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, t: number) {
    const gx = cx + w * 0.12
    // glass
    ctx.strokeStyle = C.forest; ctx.lineWidth = 4; ctx.lineCap = 'round'
    ctx.strokeRect(gx - w * 0.07, h * 0.3, w * 0.14, h * 0.46)
    // tilting bowl pouring (fades out as glass fills)
    const bowlA = Math.min(t * 2, 1)
    ctx.save()
    ctx.translate(cx - w * 0.14, h * 0.28)
    ctx.rotate(0.5 + bowlA * 0.35)
    ctx.globalAlpha = 1 - Math.max(t - 0.7, 0) / 0.3
    drawBowl(ctx, 0, 0, w * 0.2, h * 0.1)
    ctx.restore()
    // pour stream
    if (t < 0.85) {
      ctx.strokeStyle = C.matcha; ctx.lineWidth = 5
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(cx - w * 0.06, h * 0.3)
      ctx.quadraticCurveTo(gx - w * 0.02, h * 0.34, gx, h * 0.42)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    // fill level
    const fill = t * h * 0.4
    ctx.fillStyle = C.matcha
    ctx.fillRect(gx - w * 0.07 + 3, h * 0.76 - fill, w * 0.14 - 6, fill)
    // ice cubes bobbing in the filled part
    ctx.strokeStyle = C.cream; ctx.lineWidth = 3
    if (fill > 30) {
      ctx.strokeRect(gx - w * 0.03, h * 0.76 - fill + 10, 16, 16)
      ctx.strokeRect(gx + w * 0.01, h * 0.76 - fill + 34, 14, 14)
    }
    // garnish leaf at the very end
    if (t > 0.9) {
      ctx.fillStyle = C.matchaDeep
      ctx.beginPath()
      ctx.ellipse(gx, h * 0.27, 14, 6, -0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function initRitual(reduced: boolean): void {
  const section = document.querySelector<HTMLElement>('#ritual')
  const canvas = section?.querySelector<HTMLCanvasElement>('.ritual__canvas')
  if (!section || !canvas || reduced) return // reduced: keep static step cards + SVGs

  gsap.registerPlugin(ScrollTrigger)
  section.classList.add('ritual--live')
  const draw = createRitualRenderer(canvas)
  const steps = Array.from(section.querySelectorAll<HTMLElement>('.step'))
  steps.forEach((s) => s.classList.add('in')) // captions handled by active state, not reveal

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: 0.4,
    onRefresh: (self) => { window.__tamatcha.ritualRange = [self.start, self.end] },
    onUpdate: (self) => {
      const progress = self.progress * 3
      draw(Math.min(progress, 2.999))
      const chapter = Math.min(Math.floor(progress), 2)
      steps.forEach((s, i) => s.classList.toggle('active', i === chapter))
    },
  })
  draw(0)
  window.__tamatcha.ritualRange = [st.start, st.end]
}
