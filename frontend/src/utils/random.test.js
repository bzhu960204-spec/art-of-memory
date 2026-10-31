import { describe, it, expect } from 'vitest'
import { shuffle, weightedSample } from './random'

const codes = (weights) => weights.map((weight, i) => ({ numberString: String(i).padStart(2, '0'), weight }))

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input)

    expect(input).toEqual([1, 2, 3, 4, 5])
    expect([...result].sort()).toEqual(input)
  })

  it('is unbiased: every element lands in every position about equally often', () => {
    const runs = 30000
    const counts = Array.from({ length: 4 }, () => [0, 0, 0, 0])
    for (let r = 0; r < runs; r++) {
      shuffle([0, 1, 2, 3]).forEach((value, pos) => counts[value][pos]++)
    }
    counts.flat().forEach(c => {
      expect(c / runs).toBeGreaterThan(0.22)
      expect(c / runs).toBeLessThan(0.28)
    })
  })
})

describe('weightedSample', () => {
  it('returns the requested number of distinct items', () => {
    const result = weightedSample(codes([1, 3, 5, 2, 1, 10]), 4)

    expect(result).toHaveLength(4)
    expect(new Set(result.map(r => r.numberString)).size).toBe(4)
  })

  it('returns every item when count equals the item count', () => {
    const items = codes([1, 1, 1])
    expect(weightedSample(items, 3)).toHaveLength(3)
  })

  it('tops up with zero-weight items when the weighted pool is too small', () => {
    const result = weightedSample(codes([0, 0, 1]), 3)
    expect(result.map(r => r.numberString).sort()).toEqual(['00', '01', '02'])
  })

  it('picks heavier items first more often', () => {
    const items = codes([1, 5])
    let heavyFirst = 0
    for (let i = 0; i < 5000; i++) {
      if (weightedSample(items, 1)[0].numberString === '01') heavyFirst++
    }
    expect(heavyFirst / 5000).toBeGreaterThan(0.75)
  })
})
