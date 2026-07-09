export type Tier = 'a' | 'b' | 'c'

export interface Caps {
  reducedMotion: boolean
  webgl2: boolean
  forcedTier: Tier | null
}

export function readCaps(win: Window): Caps {
  const q = new URLSearchParams(win.location.search).get('tier')
  const canvas = win.document.createElement('canvas')
  return {
    reducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)').matches,
    webgl2: !!canvas.getContext('webgl2'),
    forcedTier: q === 'a' || q === 'b' || q === 'c' ? q : null,
  }
}

export function decideTier(caps: Caps): Tier {
  if (caps.forcedTier) return caps.forcedTier
  if (caps.reducedMotion || !caps.webgl2) return 'c'
  return 'a'
}
