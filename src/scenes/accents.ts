import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initAccents(reduced: boolean): void {
  if (reduced) return
  gsap.registerPlugin(ScrollTrigger)
  gsap.utils.toArray<HTMLElement>('.about__leaf').forEach((leaf, i) => {
    gsap.to(leaf, {
      y: (i + 1) * -34, rotation: i % 2 ? 18 : -14, ease: 'none',
      scrollTrigger: { trigger: '#o-nas', start: 'top bottom', end: 'bottom top', scrub: true },
    })
  })
}
