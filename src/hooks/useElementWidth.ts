import { useEffect, useRef, useState } from 'react'
import { estimateTableWidth } from '../components/vocabColumnWidths'

/** Tracks an element's content width via ResizeObserver. */
export function useElementWidth<T extends HTMLElement>(active = true) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(estimateTableWidth)

  useEffect(() => {
    if (!active) return

    const el = ref.current
    if (!el) return

    const update = () => setWidth(el.clientWidth)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [active])

  return [ref, width] as const
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}
