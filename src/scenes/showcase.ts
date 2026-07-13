import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const SEGMENTS = 5

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
    // TURNTABLE-HOOK: Task 2 extends activation here
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
      // TURNTABLE-DRAW: Task 2 scrubs frames here with (i, p * SEGMENTS - i)
    },
  })

  // thumbnail click jumps to that drink's scroll segment
  items.forEach((item, i) => {
    item.addEventListener('click', () => {
      window.scrollTo(0, st.start + ((st.end - st.start) * (i + 0.5)) / SEGMENTS)
    })
  })
}
