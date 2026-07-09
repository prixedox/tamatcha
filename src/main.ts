import { readCaps, decideTier } from './tiers'

document.documentElement.classList.add('js')

const caps = readCaps(window)
const tier = decideTier(caps)
document.documentElement.dataset.tier = tier
window.__tamatcha = { tier, frames: 0, splats: 0, pointerSplats: 0, ritualStep: -1, ritualRange: null }

export const reduced = caps.reducedMotion

async function boot() {
  const { initScroll } = await import('./scroll')
  initScroll(reduced)
  const { initHero } = await import('./fluid/hero')
  initHero(tier)
  const { initRitual } = await import('./scenes/ritual')
  initRitual(reduced)
  const { initGallery } = await import('./scenes/gallery')
  initGallery(reduced)
  const { initAccents } = await import('./scenes/accents')
  initAccents(reduced)
}
boot()
