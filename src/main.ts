import { readCaps, decideTier } from './tiers'

document.documentElement.classList.add('js')

const caps = readCaps(window)
const tier = decideTier(caps)
document.documentElement.dataset.tier = tier
window.__tamatcha = { tier, frames: 0, splats: 0, ritualStep: -1, ritualRange: null }

export const reduced = caps.reducedMotion

async function boot() {
  const { initScroll } = await import('./scroll')
  initScroll(reduced)

  if (tier === 'a') {
    const { FluidSim } = await import('./fluid/sim')
    const canvas = document.querySelector<HTMLCanvasElement>('.hero__canvas')!
    try {
      const sim = new FluidSim(canvas)
      document.querySelector('.hero')!.classList.add('hero--gl')
      let last = performance.now()
      let t = 0
      const loop = (now: number) => {
        const dt = now - last; last = now; t += dt / 1000
        const a = t * 0.5
        sim.splat(0.5 + Math.cos(a) * 0.25, 0.5 + Math.sin(a * 0.9) * 0.2,
          -Math.sin(a) * 220, Math.cos(a * 0.9) * 200, 0.14)
        sim.frame(dt)
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    } catch { /* tier b/c handled in Task 8 */ }
  }
}
boot()
