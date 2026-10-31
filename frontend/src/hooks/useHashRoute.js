import { useState, useEffect, useCallback } from 'react'

function readHash(defaultRoute) {
  const route = window.location.hash.replace(/^#\/?/, '')
  return route || defaultRoute
}

/** Minimal hash router: `#/pao` -> 'pao'. Keeps the current page across reloads and supports back/forward. */
export function useHashRoute(defaultRoute) {
  const [route, setRoute] = useState(() => readHash(defaultRoute))

  useEffect(() => {
    const onChange = () => setRoute(readHash(defaultRoute))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [defaultRoute])

  const navigate = useCallback((to) => {
    window.location.hash = `/${to}`
  }, [])

  return [route, navigate]
}
