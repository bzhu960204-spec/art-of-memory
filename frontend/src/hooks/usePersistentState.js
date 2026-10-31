import { useState, useEffect } from 'react'

const PREFIX = 'aom:'

/**
 * Like useState, but persisted in localStorage under `key`.
 * For object values, stored fields are merged over `initial` so newly added settings get their defaults.
 */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (raw == null) return initial
      const stored = JSON.parse(raw)
      const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v)
      return isPlainObject(initial) && isPlainObject(stored) ? { ...initial, ...stored } : stored
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Storage full or unavailable: settings simply won't persist
    }
  }, [key, value])

  return [value, setValue]
}
