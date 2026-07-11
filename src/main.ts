import { readCaps, decideTier } from './tiers'

document.documentElement.classList.add('js')

const caps = readCaps(window)
const tier = decideTier(caps)
document.documentElement.dataset.tier = tier
window.__tamatcha = { tier, frames: 0, splats: 0, pointerSplats: 0, ritualStep: -1, ritualRange: null, ritualDrink: 'matcha' }

export const reduced = caps.reducedMotion

// Mobile nav toggle: synchronous and unconditional — independent of tier and
// reduced-motion, since this is basic navigation, not animation, and must
// keep working even if boot() below never resolves.
function initMobileNav(): void {
  const nav = document.getElementById('nav')
  const burger = document.getElementById('burger')
  if (!nav || !burger) return
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('mobile-open')
    burger.setAttribute('aria-expanded', open ? 'true' : 'false')
  })
  document.querySelectorAll<HTMLAnchorElement>('.nav__links a').forEach((a) => {
    a.addEventListener('click', () => {
      nav.classList.remove('mobile-open')
      burger.setAttribute('aria-expanded', 'false')
    })
  })
}
initMobileNav()

async function boot() {
  try {
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
  } catch (err) {
    // safety net: a failed chunk load must never leave content stuck at
    // opacity:0 (.js .reveal{opacity:0}) — force everything visible.
    console.error('boot() failed, revealing content as a safety net', err)
    document.querySelectorAll<HTMLElement>('.reveal, .draw').forEach((el) => el.classList.add('in'))
  }
}
boot()
