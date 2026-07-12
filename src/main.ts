document.documentElement.classList.add('js')

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

// Mobile nav toggle: synchronous and unconditional — basic navigation must
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
  } catch (err) {
    // safety net: a failed chunk load must never leave content stuck at
    // opacity:0 (.js .reveal{opacity:0}) — force everything visible.
    console.error('boot() failed, revealing content as a safety net', err)
    document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => el.classList.add('in'))
  }
}
boot()
