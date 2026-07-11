import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const FRAME_COUNT = 44
// pre-rendered drink sequences in public/ritual/<name>/ — '' = the default
// matcha look at public/ritual/. Switchable via the section's buttons and
// deep-linkable via ?drink=…
const DRINKS = ['latte', 'fizz', 'cloud', 'mate']

// per-drink step captions (the default matcha texts stay in index.html and
// are captured from the DOM so they aren't duplicated here)
type Caption = { h: string; p: string }
const CAPTIONS: Record<string, [Caption, Caption, Caption]> = {
  latte: [
    { h: 'Mléko a led', p: 'Do vychlazené sklenice s ledem nalijeme ovesné nebo mandlové mléko se sirupem podle chuti.' },
    { h: 'Matcha navrch', p: 'Čerstvě našlehanou ceremoniální matchu opatrně dolijeme — vrstvy se pomalu prolnou.' },
    { h: 'Podáváme', p: 'Posypeme a podáme. Sametové latté, ledové i teplé — přesně podle tebe.' },
  ],
  fizz: [
    { h: 'Pyré na dno', p: 'Na dno sklenice dáme ovocné pyré dle výběru — maracuja, yuzu, cherry nebo mango.' },
    { h: 'Tonic a led', p: 'Zalijeme vychlazeným tonicem přes led — bublinky se postarají o jiskru.' },
    { h: 'Matcha koruna', p: 'Navrch opatrně nalijeme našlehanou matchu. Osvěžení stvořené do horkých dnů.' },
  ],
  cloud: [
    { h: 'Pyré na dno', p: 'Jahodové nebo borůvkové pyré na dně dodá drinku sladkou svěžest.' },
    { h: 'Kokosová voda', p: 'Dolijeme kokosovou vodou s ledem — lehké a čisté tělo celého drinku.' },
    { h: 'Matcha obláček', p: 'Navrch posadíme nadýchanou matcha pěnu a dozdobíme posypem. Lehké jako obláček.' },
  ],
  mate: [
    { h: 'Vyluhujeme', p: 'Jihoamerickou yerbu vyluhujeme do zlatavého nálevu plného přirozené energie.' },
    { h: 'Led a pyré', p: 'Nalijeme přes led a přidáme pyré dle výběru — ananas, černý rybíz nebo broskev.' },
    { h: 'Podáváme', p: 'Přirozený kofein bez kávy. Energie, která nakopne a zároveň osvěží.' },
  ],
}

// import.meta.env.BASE_URL is Vite's base ('/tamatcha/'); a bare '/ritual/...'
// would ignore the base and 404 under the project-page URL.
const framePath = (dir: string, i: number) =>
  `${import.meta.env.BASE_URL}${dir}frame-${String(i + 1).padStart(3, '0')}.webp`

// Preload a frame sequence and return a painter for scroll progress (0..1),
// contain-fit. Frames not yet decoded are skipped, so the previous image (or
// CSS poster) shows through until they arrive. Deterministic: the same
// progress always yields the same frame, so reverse-scrubbing matches.
function createRitualRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  let frames: HTMLImageElement[] = []
  let lastDrawn = -1
  let lastP = 0

  function paint(idx: number): void {
    const img = frames[idx]
    if (!img || !img.complete || img.naturalWidth === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = Math.round(canvas.clientWidth * dpr)
    const ch = Math.round(canvas.clientHeight * dpr)
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; lastDrawn = -1 }
    if (idx === lastDrawn) return
    lastDrawn = idx
    // contain-fit: the transparent glass floats fully-visible on the stage backdrop
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale
    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
  }

  const idxFor = (p01: number) => Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(p01 * (FRAME_COUNT - 1))))
  return {
    draw(p01: number) { lastP = p01; paint(idxFor(p01)) },
    // repaint the current progress (e.g. after a frame decodes or a set swap)
    repaint() { lastDrawn = -1; paint(idxFor(lastP)) },
    setFrames(imgs: HTMLImageElement[]) { frames = imgs; this.repaint() },
  }
}

export function initRitual(reduced: boolean): void {
  const section = document.querySelector<HTMLElement>('#ritual')
  const canvas = section?.querySelector<HTMLCanvasElement>('.ritual__canvas')
  // reduced motion / no-JS: leave the static 3-photo grid the CSS renders.
  if (!section || !canvas || reduced) return

  gsap.registerPlugin(ScrollTrigger)
  section.classList.add('ritual--live')
  const renderer = createRitualRenderer(canvas)
  const steps = Array.from(section.querySelectorAll<HTMLElement>('.step'))
  steps.forEach((s) => s.classList.add('in')) // captions handled by active state, not reveal
  const defaultCaptions = steps.map((s) => ({
    h: s.querySelector('h3')!.textContent!,
    p: s.querySelector('p')!.textContent!,
  })) as [Caption, Caption, Caption]

  // frame sets are cached per drink so switching back is instant
  const cache = new Map<string, HTMLImageElement[]>()
  function loadSet(dir: string): HTMLImageElement[] {
    let imgs = cache.get(dir)
    if (!imgs) {
      imgs = Array.from({ length: FRAME_COUNT }, (_, i) => {
        const img = new Image()
        img.src = framePath(dir, i)
        // paint as soon as the frame under the scrubber decodes
        img.addEventListener('load', () => renderer.repaint())
        return img
      })
      cache.set(dir, imgs)
    }
    return imgs
  }

  const buttons = Array.from(section.querySelectorAll<HTMLButtonElement>('.dbtn'))
  function setDrink(name: string): void {
    const valid = DRINKS.includes(name) ? name : ''
    renderer.setFrames(loadSet(valid ? `ritual/${valid}/` : 'ritual/'))
    const caps = CAPTIONS[valid] ?? defaultCaptions
    steps.forEach((s, i) => {
      s.querySelector('h3')!.textContent = caps[i].h
      s.querySelector('p')!.textContent = caps[i].p
    })
    buttons.forEach((b) => {
      const active = (b.dataset.drink ?? '') === valid
      b.classList.toggle('is-active', active)
      b.setAttribute('aria-pressed', String(active))
    })
    window.__tamatcha.ritualDrink = valid || 'matcha'
    const url = new URL(window.location.href)
    if (valid) url.searchParams.set('drink', valid)
    else url.searchParams.delete('drink')
    history.replaceState(null, '', url)
  }
  buttons.forEach((b) => b.addEventListener('click', () => setDrink(b.dataset.drink ?? '')))

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: 0.4,
    onRefresh: (self) => { window.__tamatcha.ritualRange = [self.start, self.end] },
    onUpdate: (self) => {
      renderer.draw(self.progress)
      const chapter = Math.min(Math.floor(self.progress * 3), 2)
      window.__tamatcha.ritualStep = chapter
      steps.forEach((s, i) => s.classList.toggle('active', i === chapter))
    },
  })
  setDrink(new URLSearchParams(window.location.search).get('drink') ?? '')
  renderer.draw(0)
  window.__tamatcha.ritualRange = [st.start, st.end]
}
