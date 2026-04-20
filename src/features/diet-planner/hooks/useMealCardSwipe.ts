import { useRef, useState } from 'react'
import type { TouchEvent } from 'react'

export function useMealCardSwipe(options: {
  swipeTrigger: number
  onQuickComplete: () => void
  onQuickSwap: () => void
  swapEnabled: boolean
}) {
  const { swipeTrigger, onQuickComplete, onQuickSwap, swapEnabled } = options
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const movedBySwipe = useRef(false)

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX
    movedBySwipe.current = false
  }

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    const clamped = Math.max(-90, Math.min(90, delta))

    if (Math.abs(clamped) > 12) {
      movedBySwipe.current = true
    }

    setSwipeOffset(clamped)
  }

  const onTouchEnd = () => {
    if (swipeOffset >= swipeTrigger) {
      onQuickComplete()
    }

    if (swapEnabled && swipeOffset <= -swipeTrigger) {
      onQuickSwap()
    }

    touchStartX.current = null
    setSwipeOffset(0)
  }

  const onCardClick = (toggle: () => void) => {
    if (movedBySwipe.current) {
      movedBySwipe.current = false
      return
    }

    toggle()
  }

  return {
    swipeOffset,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onCardClick,
  }
}
