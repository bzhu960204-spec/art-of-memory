import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'

// ─── 状态机 ───────────────────────────────────────────────
const S = {
  LOADING: 'LOADING',
  SHOWING_NUMBER: 'SHOWING_NUMBER',
  SHOWING_ANSWER: 'SHOWING_ANSWER',
  COMPLETE: 'COMPLETE',
}

// ─── 工具函数 ──────────────────────────────────────────────

/** Fisher-Yates shuffle（原地） */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 按权重进行不重复采样。
 * 权重高的卡片在池中出现次数多，被优先抽到的概率更高。
 * @param {object[]} items  含 weight 字段的卡片数组
 * @param {number}   count  抽取数量
 */
function weightedSample(items, count) {
  // 构建加权池（每张卡重复 weight 次，最多 5 次）
  const pool = []
  items.forEach(item => {
    const slots = Math.min(item.weight, 5)
    for (let i = 0; i < slots; i++) pool.push(item)
  })
  shuffle(pool)

  // 去重并取前 count 张
  const seen = new Set()
  const result = []
  for (const item of pool) {
    if (!seen.has(item.numberString)) {
      seen.add(item.numberString)
      result.push(item)
    }
    if (result.length >= count) break
  }

  // 若池中不够（理论上不会），用剩余随机补足
  if (result.length < count) {
    const rest = shuffle(items.filter(i => !seen.has(i.numberString)))
    for (const item of rest) {
      result.push(item)
      if (result.length >= count) break
    }
  }
  return result
}

// ─── 常量 ─────────────────────────────────────────────────
const PROFICIENT_THRESHOLD_MS = 2000   // < 2s 判定为熟练
const SESSION_SIZE = 20                 // 每轮默认题目数

// ─── 组件 ─────────────────────────────────────────────────
export default function ObjectTrainer() {
  const [allCodes, setAllCodes] = useState([])
  const [queue, setQueue] = useState([])       // 当前训练队列（含重插卡）
  const [queueIdx, setQueueIdx] = useState(0)
  const [state, setState] = useState(S.LOADING)

  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const rafRef = useRef(null)

  const [results, setResults] = useState([])
  const [sessionStats, setSessionStats] = useState(null)

  // 权重变更记录：numberString -> delta（累计）
  const pendingWeights = useRef({})

  // ── 加载 ──
  const loadCodes = useCallback(async () => {
    setState(S.LOADING)
    try {
      const data = await api.getObjectAll()
      setAllCodes(data)
      const q = weightedSample(data, Math.min(SESSION_SIZE, data.length))
      setQueue(q)
      setQueueIdx(0)
      setResults([])
      setSessionStats(null)
      pendingWeights.current = {}
      setState(S.SHOWING_NUMBER)
      const now = performance.now()
      setStartTime(now)
      setElapsed(now)
    } catch (e) {
      console.error('Failed to load object codes:', e)
    }
  }, [])

  useEffect(() => { loadCodes() }, [loadCodes])

  // ── 计时器 RAF ──
  useEffect(() => {
    if (state === S.SHOWING_NUMBER) {
      rafRef.current = requestAnimationFrame(function tick() {
        setElapsed(performance.now())
        rafRef.current = requestAnimationFrame(tick)
      })
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [state])

  const currentMs = state === S.SHOWING_NUMBER ? Math.round(elapsed - startTime) : 0
  const isProficientZone = currentMs < PROFICIENT_THRESHOLD_MS

  // ── 通用：进入下一题 / 结束 ──
  const advance = useCallback((newQueue, newIdx, newResults, rating) => {
    const isLast = newIdx >= newQueue.length
    if (isLast) {
      // 计算统计
      const totalMs = newResults.reduce((s, r) => s + r.responseMs, 0)
      const proficient = newResults.filter(r => r.rating === 1).length
      const stats = {
        total: newResults.length,
        proficient,
        rusty: newResults.filter(r => r.rating === 2).length,
        unknown: newResults.filter(r => r.rating === 3).length,
        accuracyRate: proficient / newResults.length,
        avgResponseMs: Math.round(totalMs / newResults.length),
        totalSeconds: Math.round(totalMs / 1000),
      }
      setSessionStats(stats)
      setState(S.COMPLETE)

      // 批量提交权重变更
      const weightUpdates = Object.entries(pendingWeights.current).map(([num, delta]) => ({
        numberString: num,
        delta,
      }))
      if (weightUpdates.length > 0) {
        api.postObjectWeights(weightUpdates).catch(console.error)
      }

      // 保存复习记录
      api.postObjectReview(newResults).catch(console.error)
      api.saveRecord({
        moduleType: 'OBJECT',
        durationSeconds: stats.totalSeconds,
        accuracyRate: stats.accuracyRate,
        avgResponseMs: stats.avgResponseMs,
        totalItems: stats.total,
      }).catch(console.error)
    } else {
      setQueue(newQueue)
      setQueueIdx(newIdx)
      setResults(newResults)
      setState(S.SHOWING_NUMBER)
      const now = performance.now()
      setStartTime(now)
      setElapsed(now)
    }
  }, [])

  // ── 评分：熟练（直接翻到下一题，不翻牌）──
  const rateProficient = useCallback(() => {
    if (state !== S.SHOWING_NUMBER) return
    const responseMs = Math.round(performance.now() - startTime)
    const card = queue[queueIdx]
    const newResults = [...results, { numberString: card.numberString, rating: 1, responseMs }]

    // 熟练：权重 -1（最低 1）
    const prev = pendingWeights.current[card.numberString] ?? 0
    pendingWeights.current[card.numberString] = Math.max(-card.weight + 1, prev - 1)

    advance(queue, queueIdx + 1, newResults, 1)
  }, [state, queue, queueIdx, results, startTime, advance])

  // ── 翻牌（查看答案）──
  const flipCard = useCallback(() => {
    if (state !== S.SHOWING_NUMBER) return
    setState(S.SHOWING_ANSWER)
  }, [state])

  // ── 评分：生疏 / 不认识（看过答案后）──
  const rateAfterFlip = useCallback((rating) => {
    if (state !== S.SHOWING_ANSWER) return
    const responseMs = Math.round(performance.now() - startTime)
    const card = queue[queueIdx]
    const newResults = [...results, { numberString: card.numberString, rating, responseMs }]
    const newQueue = [...queue]

    if (rating === 2) {
      // 生疏：稍后重现（+4 位置），权重 +1
      const insertAt = Math.min(queueIdx + 4, newQueue.length)
      newQueue.splice(insertAt, 0, { ...card })
      const prev = pendingWeights.current[card.numberString] ?? 0
      pendingWeights.current[card.numberString] = prev + 1
    } else if (rating === 3) {
      // 不认识：很快重现（+2 位置），权重 +3
      const insertAt = Math.min(queueIdx + 2, newQueue.length)
      newQueue.splice(insertAt, 0, { ...card })
      const prev = pendingWeights.current[card.numberString] ?? 0
      pendingWeights.current[card.numberString] = prev + 3
    }

    advance(newQueue, queueIdx + 1, newResults, rating)
  }, [state, queue, queueIdx, results, startTime, advance])

  // ── 键盘快捷键 ──
  useEffect(() => {
    const handler = (e) => {
      if (state === S.SHOWING_NUMBER) {
        if (e.code === 'Space' || e.key === 'ArrowDown') { e.preventDefault(); flipCard() }
        if (e.key === 'Enter' || e.key === '1') { e.preventDefault(); rateProficient() }
      } else if (state === S.SHOWING_ANSWER) {
        if (e.key === '2') rateAfterFlip(2)
        if (e.key === '3') rateAfterFlip(3)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state, flipCard, rateProficient, rateAfterFlip])

  // ─────────────── 渲染 ───────────────────────────────────

  if (state === S.LOADING) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-cyan-400 text-xl animate-pulse">加载中...</div>
      </div>
    )
  }

  // ── 完成画面 ──
  if (state === S.COMPLETE && sessionStats) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">训练完成!</h2>
        <p className="text-gray-500 text-sm mb-8">权重已自动更新，下次高权重题目将优先出现</p>
        <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-sm">
          <div className="bg-gray-900 rounded-xl p-5 text-center border border-gray-800">
            <div className="text-4xl font-bold text-green-400">{Math.round(sessionStats.accuracyRate * 100)}%</div>
            <div className="text-gray-400 text-sm mt-1">熟练率</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 text-center border border-gray-800">
            <div className="text-4xl font-bold text-yellow-400">{sessionStats.avgResponseMs}ms</div>
            <div className="text-gray-400 text-sm mt-1">平均反应</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 text-center border border-gray-800">
            <div className="text-3xl font-bold text-green-300">{sessionStats.proficient}</div>
            <div className="text-gray-400 text-sm mt-1">✓ 熟练</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 text-center border border-gray-800">
            <div className="text-3xl font-bold text-yellow-300">{sessionStats.rusty}</div>
            <div className="text-gray-400 text-sm mt-1">😅 生疏</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 text-center border border-gray-800">
            <div className="text-3xl font-bold text-red-400">{sessionStats.unknown}</div>
            <div className="text-gray-400 text-sm mt-1">❌ 不认识</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 text-center border border-gray-800">
            <div className="text-3xl font-bold text-purple-400">{sessionStats.totalSeconds}s</div>
            <div className="text-gray-400 text-sm mt-1">总耗时</div>
          </div>
        </div>
        <button
          onClick={loadCodes}
          className="px-8 py-3 bg-cyan-700 hover:bg-cyan-600 rounded-lg text-white font-medium transition-colors"
        >
          再来一轮
        </button>
      </div>
    )
  }

  const card = queue[queueIdx]
  if (!card) return null

  const totalInQueue = queue.length
  const timerColor = isProficientZone
    ? 'text-green-400'
    : currentMs < 4000 ? 'text-yellow-400' : 'text-red-400'

  // ── 显示数字 ──
  if (state === S.SHOWING_NUMBER) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 select-none">
        {/* 进度条 */}
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>进度: {queueIdx + 1} / {totalInQueue}</span>
            <span className={`font-mono font-bold ${timerColor}`}>
              {(currentMs / 1000).toFixed(1)}s
              {isProficientZone && <span className="text-xs ml-1 opacity-60">← 熟练区</span>}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((queueIdx / Math.max(totalInQueue - 1, 1)) * 100, 100)}%` }}
            />
          </div>
          {/* 计时颜色条 */}
          <div className="w-full bg-gray-800 rounded-full h-1 mt-1 overflow-hidden">
            <div
              className={`h-1 rounded-full transition-all ${isProficientZone ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min((currentMs / PROFICIENT_THRESHOLD_MS) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* 卡片 */}
        <div className="w-72 h-44 bg-gray-900 border-2 border-cyan-700 rounded-2xl flex items-center justify-center mb-10 shadow-2xl">
          <span className="text-9xl font-bold text-white font-mono tracking-wider">{card.numberString}</span>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={rateProficient}
            className="px-8 py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-lg"
            title="Enter / 1"
          >
            ✓ 熟练
          </button>
          <button
            onClick={flipCard}
            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-xl transition-colors shadow-lg"
            title="Space"
          >
            查看答案
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-5">
          Enter / 1 → 熟练 &nbsp;·&nbsp; Space → 查看答案
        </p>
      </div>
    )
  }

  // ── 显示答案 ──
  const responseMs = Math.round(performance.now() - startTime)
  const wasSlower = responseMs >= PROFICIENT_THRESHOLD_MS

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 select-none">
      {/* 进度条 */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>进度: {queueIdx + 1} / {totalInQueue}</span>
          <span className={`font-mono font-bold ${wasSlower ? 'text-red-400' : 'text-green-400'}`}>
            {(responseMs / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-cyan-500 h-2 rounded-full"
            style={{ width: `${Math.min((queueIdx / Math.max(totalInQueue - 1, 1)) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* 答案卡片 */}
      <div className="w-72 bg-gray-900 border-2 border-cyan-500 rounded-2xl p-6 mb-8 text-center shadow-2xl">
        <div className="text-5xl font-bold text-gray-400 font-mono mb-3">{card.numberString}</div>
        <div className="text-4xl font-bold text-white mb-3">{card.objectName}</div>
        {card.hint && (
          <div className="text-sm text-gray-400 bg-gray-800 rounded-lg px-3 py-2 leading-relaxed">
            {card.hint}
          </div>
        )}
      </div>

      {/* 评分按钮 */}
      <div className="flex gap-4">
        <button
          onClick={() => rateAfterFlip(2)}
          className="flex flex-col items-center px-7 py-3 bg-yellow-700/80 hover:bg-yellow-600 text-white rounded-xl transition-colors shadow-lg"
          title="2"
        >
          <span className="text-xl">😅</span>
          <span className="font-semibold text-sm mt-1">生疏</span>
          <span className="text-xs text-yellow-300 opacity-70 mt-0.5">稍后重现</span>
        </button>
        <button
          onClick={() => rateAfterFlip(3)}
          className="flex flex-col items-center px-7 py-3 bg-red-800/80 hover:bg-red-700 text-white rounded-xl transition-colors shadow-lg"
          title="3"
        >
          <span className="text-xl">❌</span>
          <span className="font-semibold text-sm mt-1">不认识</span>
          <span className="text-xs text-red-300 opacity-70 mt-0.5">马上重现+加权</span>
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-5">2 → 生疏 &nbsp;·&nbsp; 3 → 不认识</p>
    </div>
  )
}
