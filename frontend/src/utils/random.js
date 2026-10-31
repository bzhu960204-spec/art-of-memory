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
