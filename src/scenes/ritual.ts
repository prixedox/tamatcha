import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Crossfade the three real ritual photos (sift → whisk → pour) as the pinned
// section scrubs. progress is 0..3 (one unit per chapter). Deterministic: the
// same progress always yields the same visual, so reverse-scrubbing matches.
export function createRitualRenderer(photos: HTMLElement[]): (progress: number) => void {
  return (progress: number) => {
    const chapter = Math.min(Math.floor(progress), 2)
    const local = progress - chapter // 0..1 within the current chapter (drives ken-burns zoom)
    photos.forEach((p, i) => {
      p.classList.toggle('active', i === chapter)
      p.style.setProperty('--kb', i === chapter ? local.toFixed(3) : '0')
    })
    window.__tamatcha.ritualStep = chapter
  }
}

export function initRitual(reduced: boolean): void {
  const section = document.querySelector<HTMLElement>('#ritual')
  const stage = section?.querySelector<HTMLElement>('.ritual__stage')
  const photos = stage ? Array.from(stage.querySelectorAll<HTMLElement>('.ritual__photo')) : []
  // reduced motion / no-JS: leave the photos as the static 3-up grid the CSS renders.
  if (!section || !stage || photos.length < 3 || reduced) return

  gsap.registerPlugin(ScrollTrigger)
  section.classList.add('ritual--live')
  const draw = createRitualRenderer(photos)
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
