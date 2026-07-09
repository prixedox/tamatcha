import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initGallery(reduced: boolean): void {
  const strip = document.querySelector<HTMLElement>('.ig__strip')
  if (!strip) return
  gsap.registerPlugin(ScrollTrigger)

  let down = false, moved = 0, startX = 0, startLeft = 0, vel = 0, lastX = 0, raf = 0

  strip.addEventListener('pointerdown', (e) => {
    down = true; moved = 0
    startX = e.clientX; startLeft = strip.scrollLeft; lastX = e.clientX; vel = 0
    cancelAnimationFrame(raf)
    strip.classList.add('dragging')
  })
  window.addEventListener('pointermove', (e) => {
    if (!down) return
    const dx = e.clientX - startX
    moved = Math.max(moved, Math.abs(dx))
    strip.scrollLeft = startLeft - dx
    vel = lastX - e.clientX
    lastX = e.clientX
  })
  window.addEventListener('pointerup', () => {
    if (!down) return
    down = false
    strip.classList.remove('dragging')
    const glide = () => {
      if (Math.abs(vel) < 0.4) return
      strip.scrollLeft += vel
      vel *= 0.94
      raf = requestAnimationFrame(glide)
    }
    glide()
  })
  // a drag must not trigger the link click underneath
  strip.addEventListener('click', (e) => { if (moved > 5) { e.preventDefault(); e.stopPropagation() } }, true)

  if (!reduced) {
    gsap.utils.toArray<HTMLElement>('.ig__tile img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    })
  }
}
