import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const FRAME_COUNT = 44
// import.meta.env.BASE_URL is Vite's base ('/tamatcha/'); a bare '/ritual/...'
// would ignore the base and 404 under the project-page URL.
const framePath = (i: number) => `${import.meta.env.BASE_URL}ritual/frame-${String(i + 1).padStart(3, '0')}.webp`

// Preload the whisk-video frame sequence and return a drawer that paints the
// frame for a given progress (0..1) onto the canvas, cover-fit. Frames not yet
// decoded are skipped, so the CSS poster (whisk still) shows through until they
// arrive. Deterministic: the same progress always yields the same frame, so
// reverse-scrubbing matches.
function createRitualRenderer(canvas: HTMLCanvasElement): (p01: number) => void {
  const ctx = canvas.getContext('2d')!
  const frames = Array.from({ length: FRAME_COUNT }, (_, i) => {
    const img = new Image()
    img.src = framePath(i)
    return img
  })
  let lastDrawn = -1

  function paint(idx: number): void {
    const img = frames[idx]
    if (!img.complete || img.naturalWidth === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = Math.round(canvas.clientWidth * dpr)
    const ch = Math.round(canvas.clientHeight * dpr)
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; lastDrawn = -1 }
    if (idx === lastDrawn) return
    lastDrawn = idx
    // contain-fit: the transparent cup floats fully-visible on the stage backdrop
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale
    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
  }

  // paint the first frame as soon as it decodes, to cover the CSS poster
  frames[0].addEventListener('load', () => { if (lastDrawn === -1) paint(0) })

  return (p01: number) => paint(Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(p01 * (FRAME_COUNT - 1)))))
}

export function initRitual(reduced: boolean): void {
  const section = document.querySelector<HTMLElement>('#ritual')
  const canvas = section?.querySelector<HTMLCanvasElement>('.ritual__canvas')
  // reduced motion / no-JS: leave the static 3-photo grid the CSS renders.
  if (!section || !canvas || reduced) return

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
      draw(self.progress)
      const chapter = Math.min(Math.floor(self.progress * 3), 2)
      window.__tamatcha.ritualStep = chapter
      steps.forEach((s, i) => s.classList.toggle('active', i === chapter))
    },
  })
  draw(0)
  window.__tamatcha.ritualRange = [st.start, st.end]
}
