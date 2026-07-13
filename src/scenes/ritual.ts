import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface TurntableManifest {
  frames: number
  width: number
  height: number
}

const STEP_THRESHOLDS = [0, 0.33, 0.66]

export function initRitual(reduced: boolean): void {
  if (reduced) return
  if (matchMedia('(max-width: 860px)').matches) return
  const section = document.querySelector<HTMLElement>('.ritual')
  const stepsWrap = section?.querySelector<HTMLElement>('.steps')
  if (!section || !stepsWrap) return
  const steps = Array.from(stepsWrap.querySelectorAll<HTMLElement>('.step'))
  if (steps.length !== STEP_THRESHOLDS.length) return

  // the scene exists only when fizz turntable frames ship — otherwise the
  // static three-step row stays exactly as-is
  fetch(`${import.meta.env.BASE_URL}brand/turntable/fizz/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<TurntableManifest>) : null))
    .then((manifest) => {
      if (manifest?.frames) activate(manifest)
    })
    .catch(() => {})

  function activate(manifest: TurntableManifest): void {
    gsap.registerPlugin(ScrollTrigger)
    const frames = Array.from({ length: manifest.frames }, (_, f) => {
      const img = new Image()
      img.src = `${import.meta.env.BASE_URL}brand/turntable/fizz/frame-${String(f + 1).padStart(3, '0')}.webp`
      return img
    })

    const canvas = document.createElement('canvas')
    canvas.className = 'ritual__canvas'
    canvas.width = manifest.width
    canvas.height = manifest.height
    stepsWrap!.before(canvas)
    const ctx = canvas.getContext('2d')
    section!.classList.add('ritual-live')

    function draw(p: number): void {
      if (!ctx) return
      const idx = Math.min(frames.length - 1, Math.floor(p * frames.length))
      const frame = frames[idx]
      if (!frame.complete || frame.naturalWidth === 0) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
    }
    frames[0].addEventListener('load', () => draw(0))
    draw(0)

    const setActive = (p: number): void => {
      steps.forEach((step, i) => step.classList.toggle('active', p >= STEP_THRESHOLDS[i]))
    }
    setActive(0)

    ScrollTrigger.create({
      id: 'ritual',
      trigger: section,
      start: 'top top',
      end: '+=250%',
      pin: true,
      scrub: true,
      // this pin is created asynchronously (after the manifest fetch
      // resolves), which is always later than the showcase pin below it in
      // the DOM. GSAP's refresh() re-measures pinned triggers in creation
      // order, so without a higher refreshPriority the showcase's cached
      // start/end would be computed as if this pin didn't exist yet.
      refreshPriority: 1,
      onUpdate: (self) => {
        const p = Math.min(0.999, self.progress)
        draw(p)
        setActive(p)
      },
    })
    ScrollTrigger.refresh()
  }
}
