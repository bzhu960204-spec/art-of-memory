import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { StrictMode } from 'react'
import { useCountdown } from './useCountdown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const tick = (seconds) => act(() => { vi.advanceTimersByTime(seconds * 1000) })

describe('useCountdown', () => {
  it('counts down once per second and calls onExpire exactly once', () => {
    const onExpire = vi.fn()
    // StrictMode double-invokes effects/updaters in dev; onExpire must still fire once
    const { result } = renderHook(() => useCountdown(onExpire), { wrapper: StrictMode })

    act(() => result.current.start(3))
    expect(result.current.remaining).toBe(3)

    tick(1)
    expect(result.current.remaining).toBe(2)

    tick(2)
    expect(result.current.remaining).toBe(0)
    expect(result.current.running).toBe(false)
    expect(onExpire).toHaveBeenCalledTimes(1)

    tick(5)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('does not call onExpire when stopped manually and keeps the remaining time', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useCountdown(onExpire))

    act(() => result.current.start(10))
    tick(4)
    act(() => result.current.stop())
    tick(20)

    expect(result.current.remaining).toBe(6)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('uses the latest onExpire callback', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(({ cb }) => useCountdown(cb), { initialProps: { cb: first } })

    act(() => result.current.start(1))
    rerender({ cb: second })
    tick(1)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
