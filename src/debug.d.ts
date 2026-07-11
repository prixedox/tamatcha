export {}

declare global {
  interface Window {
    __tamatcha: {
      tier: 'a' | 'b' | 'c'
      frames: number
      splats: number
      pointerSplats: number
      ritualStep: number
      ritualRange: [number, number] | null
      ritualDrink: string
    }
  }
}
