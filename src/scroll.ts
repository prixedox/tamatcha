import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

export function initScroll(reduced: boolean): void {
  gsap.registerPlugin(ScrollTrigger)

  const reveals = gsap.utils.toArray<HTMLElement>('.reveal')

  if (reduced) {
    reveals.forEach((el) => el.classList.add('in'))
    return
  }

  const lenis = new Lenis({ lerp: 0.12 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href')!)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target as HTMLElement, { offset: -72 })
    })
  })

  reveals.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => el.classList.add('in'),
    })
  })

  const nav = document.getElementById('nav')
  if (nav) {
    ScrollTrigger.create({
      start: 80,
      end: 'max',
      onToggle: (self) => nav.classList.toggle('nav--scrolled', self.isActive),
    })
  }

  // active-section highlight in nav
  document.querySelectorAll<HTMLElement>('main section[id]').forEach((section) => {
    const link = document.querySelector(`.nav__links a[href="#${section.id}"]`)
    if (!link) return
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => link.classList.toggle('active', self.isActive),
    })
  })
}
