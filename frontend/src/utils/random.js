/** Unbiased Fisher–Yates shuffle. Returns a new array; the input is not modified. */
export function shuffle(arr, random = Math.random) {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 按权重进行不重复采样。
 * 每张卡在抽样池中出现 weight 次（最多 5 次），权重越高越容易被优先抽到。
 * @param {{numberString: string, weight: number}[]} items
 * @param {number} count
 */
export function weightedSample(items, count, random = Math.random) {
  const pool = []
  items.forEach(item => {
    const slots = Math.min(item.weight, 5)
    for (let i = 0; i < slots; i++) pool.push(item)
  })

  const seen = new Set()
  const result = []
  for (const item of shuffle(pool, random)) {
    if (result.length >= count) break
    if (!seen.has(item.numberString)) {
      seen.add(item.numberString)
      result.push(item)
    }
  }

  // Items with weight <= 0 never enter the pool; top up with them if needed
  if (result.length < count) {
    const rest = shuffle(items.filter(i => !seen.has(i.numberString)), random)
    for (const item of rest) {
      if (result.length >= count) break
      result.push(item)
    }
  }
  return result
}

/**
 * Builds a training session: cards due for spaced-repetition review come first (in the given order),
 * the rest is filled by weighted sampling.
 * @returns {{ cards: object[], dueCount: number }}
 */
export function buildSession(items, dueKeys, size, random = Math.random) {
  const byKey = new Map(items.map(i => [i.numberString, i]))
  const due = dueKeys.map(k => byKey.get(k)).filter(Boolean).slice(0, size)
  const dueSet = new Set(due.map(d => d.numberString))
  const rest = weightedSample(items.filter(i => !dueSet.has(i.numberString)), size - due.length, random)
  return { cards: [...due, ...rest], dueCount: due.length }
}
