import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Tier } from '../tiers'
import { startNoise } from './noise'

const WARMUP_FRAMES = 30
const SAMPLE_FRAMES = 40
const BAD_FRAME_MS = 22

export function initHero(tier: Tier): void {
  gsap.registerPlugin(ScrollTrigger)
  const hero = document.querySelector<HTMLElement>('.hero')
  const canvas = hero?.querySelector<HTMLCanvasElement>('.hero__canvas')
  if (!hero || !canvas || tier === 'c') return

  const setTier = (t: Tier) => {
    document.documentElement.dataset.tier = t
    window.__tamatcha.tier = t
  }

  const mountNoise = () => {
    try {
      startNoise(hero, canvas)
      hero.classList.add('hero--gl')
      setTier('b')
      fadeOnScroll(hero, canvas)
    } catch {
      setTier('c')
      hero.classList.remove('hero--gl')
    }
  }

  if (tier === 'b') { mountNoise(); return }
  startFluid(hero, canvas, mountNoise, setTier)
}

function fadeOnScroll(hero: HTMLElement, canvas: HTMLCanvasElement): void {
  gsap.to(canvas, {
    opacity: 0.12, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  })
}

async function startFluid(
  hero: HTMLElement, canvas: HTMLCanvasElement,
  fallback: () => void, setTier: (t: Tier) => void,
): Promise<void> {
  let quality: 'high' | 'low' = 'high'
  const mod = await import('./sim')
  const sim = (() => {
    try { return new mod.FluidSim(canvas, mod.HIGH) } catch { return null }
  })()
  if (!sim) {
    fallback()
    return
  }
  hero.classList.add('hero--gl')
  setTier('a')
  fadeOnScroll(hero, canvas)

  // pointer stir: listener on the SECTION so text overlay doesn't block it
  let lastX = 0, lastY = 0, hasLast = false
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = 1 - (e.clientY - r.top) / r.height
    if (hasLast) {
      const dx = (x - lastX) * 900
      const dy = (y - lastY) * 900
      if (Math.abs(dx) + Math.abs(dy) > 0.5) sim.splat(x, y, dx, dy, 0.22)
    }
    lastX = x; lastY = y; hasLast = true
  })
  hero.addEventListener('pointerleave', () => { hasLast = false })

  // pause when hero off-screen or tab hidden
  let visible = true, pageVisible = true
  new IntersectionObserver((ents) => { visible = ents[0].isIntersecting }).observe(hero)
  document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden })
  window.addEventListener('resize', () => sim.resize())

  // benchmark state
  let frameCount = 0
  let sampleSum = 0
  let downgraded = false

  let last = performance.now()
  let t = 0
  const loop = (now: number) => {
    const dt = now - last; last = now
    if (!visible || !pageVisible) { requestAnimationFrame(loop); return }
    t += dt / 1000

    // idle whisk: slow precessing stir
    const a = t * 0.45
    const cx = 0.5 + Math.cos(a) * 0.26
    const cy = 0.5 + Math.sin(a * 0.83) * 0.2
    sim.splat(cx, cy, -Math.sin(a) * 190, Math.cos(a * 0.83) * 170, 0.1)

    sim.frame(dt)

    // benchmark: after warmup, average SAMPLE_FRAMES frame times
    frameCount++
    if (frameCount > WARMUP_FRAMES && frameCount <= WARMUP_FRAMES + SAMPLE_FRAMES) {
      sampleSum += dt
      if (frameCount === WARMUP_FRAMES + SAMPLE_FRAMES) {
        const avg = sampleSum / SAMPLE_FRAMES
        if (avg > BAD_FRAME_MS) {
          if (quality === 'high' && !downgraded) {
            quality = 'low'; downgraded = true
            sim.setQuality(mod.LOW)
            frameCount = 0; sampleSum = 0 // re-benchmark at low quality
          } else {
            sim.destroy()
            fallback()
            return
          }
        }
      }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
