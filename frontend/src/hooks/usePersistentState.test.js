import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePersistentState } from './usePersistentState'

beforeEach(() => localStorage.clear())

describe('usePersistentState', () => {
  it('returns the initial value and persists updates', () => {
    const { result } = renderHook(() => usePersistentState('test.config', { count: 10 }))
    expect(result.current[0]).toEqual({ count: 10 })

    act(() => result.current[1]({ count: 20 }))

    expect(JSON.parse(localStorage.getItem('aom:test.config'))).toEqual({ count: 20 })
  })

  it('restores the stored value and merges new default fields into objects', () => {
    localStorage.setItem('aom:test.config', JSON.stringify({ count: 50 }))

    const { result } = renderHook(() => usePersistentState('test.config', { count: 10, interval: 2 }))

    expect(result.current[0]).toEqual({ count: 50, interval: 2 })
  })

  it('falls back to the initial value when stored data is corrupt', () => {
    localStorage.setItem('aom:test.n', '{not json')

    const { result } = renderHook(() => usePersistentState('test.n', 7))

    expect(result.current[0]).toBe(7)
  })
})