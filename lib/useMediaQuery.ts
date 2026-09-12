'use client'
import { useEffect, useState } from 'react'

function getMatches(query: string): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

// Only for cases where the DOM structure itself must differ between
// breakpoints (e.g. a full-screen mobile view vs. a popup, or a bottom
// sheet vs. a dropdown) - plain layout/spacing/grid changes are handled
// with real CSS media queries instead (see the <style> blocks throughout
// the components), which don't need JS and can't cause a resize flash.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMatches(query))

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = () => setMatches(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
