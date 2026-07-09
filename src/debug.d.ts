export {}

declare global {
  interface Window {
    __tamatcha: {
      tier: 'a' | 'b' | 'c'
      frames: number
      splats: number
      ritualStep: number
      ritualRange: [number, number] | null
    }
  }
}
