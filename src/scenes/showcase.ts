import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const SEGMENTS = 5

interface TurntableManifest {
  frames: number
  width: number
  height: number
}

export function initShowcase(reduced: boolean): void {
  if (reduced) return
  if (matchMedia('(max-width: 860px)').matches) return
  const section = document.querySelector<HTMLElement>('.lineup')
  const strip = section?.querySelector<HTMLElement>('.lineup__strip')
  if (!section || !strip) return
  const items = Array.from(strip.querySelectorAll<HTMLElement>('.lineup__item'))
  if (items.length !== SEGMENTS) return

  gsap.registerPlugin(ScrollTrigger)
  section.classList.add('showcase-on')

  // stage: one large image + caption, swapped per active drink
  const stage = document.createElement('div')
  stage.className = 'showcase__stage'
  stage.innerHTML =
    '<img class="showcase__img" alt="" width="480" height="720">' +
    '<canvas class="showcase__canvas" width="480" height="720" hidden></canvas>' +
    '<div class="showcase__cap"><h3 class="showcase__title" aria-live="polite"></h3><p class="showcase__formula"></p></div>'
  strip.before(stage)
  const stageImg = stage.querySelector<HTMLImageElement>('.showcase__img')!
  const title = stage.querySelector<HTMLElement>('.showcase__title')!
  const formula = stage.querySelector<HTMLElement>('.showcase__formula')!

  const canvas = stage.querySelector<HTMLCanvasElement>('.showcase__canvas')!
  const ctx = canvas.getContext('2d')

  // turntable hook: frames are generated later via `npm run turntable` —
  // absent manifests 404 and the static photo stays.
  const turntables = new Map<number, { manifest: TurntableManifest; frames: HTMLImageElement[] }>()
  items.forEach((item, i) => {
    const slug = item.dataset.drink
    if (!slug) return
    fetch(`${import.meta.env.BASE_URL}brand/turntable/${slug}/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<TurntableManifest>) : null))
      .then((manifest) => {
        if (!manifest?.frames) return
        const frames = Array.from({ length: manifest.frames }, (_, f) => {
          const img = new Image()
          img.src = `${import.meta.env.BASE_URL}brand/turntable/${slug}/frame-${String(f + 1).padStart(3, '0')}.webp`
          return img
        })
        turntables.set(i, { manifest, frames })
        frames[0].addEventListener('load', () => {
          if (i === active) applyMode(i)
        })
        if (i === active) applyMode(i)
      })
      .catch(() => {})
  })

  function applyMode(i: number): void {
    const tt = turntables.get(i)
    canvas.hidden = !tt
    stageImg.style.visibility = tt ? 'hidden' : ''
    if (tt) drawFrame(i, 0)
  }

  function drawFrame(i: number, local: number): void {
    const tt = turntables.get(i)
    if (!tt || !ctx) return
    const idx = Math.min(tt.frames.length - 1, Math.floor(local * tt.frames.length))
    const frame = tt.frames[idx]
    if (!frame.complete || frame.naturalWidth === 0) return
    canvas.width = tt.manifest.width
    canvas.height = tt.manifest.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
  }

  let active = -1
  function activate(i: number): void {
    if (i === active) return
    active = i
    const item = items[i]
    const img = item.querySelector<HTMLImageElement>('img')!
    stageImg.src = img.currentSrc || img.src
    title.textContent = item.dataset.name ?? ''
    formula.textContent = item.dataset.formula ?? ''
    items.forEach((el, j) => el.classList.toggle('is-active', j === i))
    stage.classList.remove('swap')
    void stage.offsetWidth // restart the swap fade animation
    stage.classList.add('swap')
    applyMode(i)
  }

  activate(0)

  const st = ScrollTrigger.create({
    id: 'showcase',
    trigger: section,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: true,
    onUpdate: (self) => {
      const p = Math.min(0.999, self.progress)
      const i = Math.floor(p * SEGMENTS)
      activate(i)
      drawFrame(i, p * SEGMENTS - i)
    },
  })

  // thumbnail click/keyboard jumps to that drink's scroll segment
  items.forEach((item, i) => {
    const jump = (): void => {
      window.scrollTo(0, st.start + ((st.end - st.start) * (i + 0.5)) / SEGMENTS)
    }
    item.setAttribute('tabindex', '0')
    item.setAttribute('role', 'button')
    item.setAttribute('aria-label', `Zobrazit ${item.dataset.name ?? ''}`)
    item.addEventListener('click', jump)
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        jump()
      }
    })
  })
}
