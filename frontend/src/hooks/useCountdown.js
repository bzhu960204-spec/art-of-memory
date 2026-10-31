import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Second-based countdown. `onExpire` is called once when the countdown reaches 0
 * (always with the latest closure), but not when it is stopped manually.
 */
export function useCountdown(onExpire) {
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false)
      onExpireRef.current?.()
    }
  }, [running, remaining])

  const start = useCallback((seconds) => {
    setRemaining(seconds)
    setRunning(true)
  }, [])

  const stop = useCallback(() => setRunning(false), [])

  return { remaining, running, start, stop }
}
