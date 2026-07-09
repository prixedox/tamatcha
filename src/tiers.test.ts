import { describe, it, expect } from 'vitest'
import { decideTier, type Caps } from './tiers'

const base: Caps = { reducedMotion: false, webgl2: true, forcedTier: null }

describe('decideTier', () => {
  it('defaults to tier a on capable devices', () => {
    expect(decideTier(base)).toBe('a')
  })
  it('reduced motion forces c', () => {
    expect(decideTier({ ...base, reducedMotion: true })).toBe('c')
  })
  it('no webgl2 forces c', () => {
    expect(decideTier({ ...base, webgl2: false })).toBe('c')
  })
  it('forced tier wins over everything', () => {
    expect(decideTier({ ...base, reducedMotion: true, forcedTier: 'b' })).toBe('b')
  })
})
