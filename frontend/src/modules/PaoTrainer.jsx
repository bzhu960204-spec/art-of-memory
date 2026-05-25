import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'

const STATES = { LOADING: 'LOADING', READY: 'READY', SHOWING_NUMBER: 'SHOWING_NUMBER', SHOWING_ANSWER: 'SHOWING_ANSWER', COMPLETE: 'COMPLETE' }

export default function PaoTrainer() {
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [state, setState] = useState(STATES.LOADING)
  const [flipped, setFlipped] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [results, setResults] = useState([])
  const [sessionStats, setSessionStats] = useState(null)
  const timerRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)

  const loadCards = useCallback(async () => {
    setState(STATES.LOADING)
    try {
      const data = await api.getPaoRandom(20)
      setCards(data)
      setCurrentIndex(0)
      setResults([])
      setFlipped(false)
      setSessionStats(null)
      setState(STATES.READY)
    } catch (e) {
      console.error('Failed to load PAO cards:', e)
    }
  }, [])

  useEffect(() => { loadCards() }, [loadCards])

  const startCard = useCallback(() => {
    setState(STATES.SHOWING_NUMBER)
    setFlipped(false)
    setStartTime(performance.now())
    setElapsed(0)
    timerRef.current = requestAnimationFrame(function tick() {
      setElapsed(performance.now())
      timerRef.current = requestAnimationFrame(tick)
    })
  }, [])

  useEffect(() => {
    if (state === STATES.READY) {
      startCard()
    }
  }, [state, startCard])

  const flipCard = useCallback(() => {
    if (state !== STATES.SHOWING_NUMBER) return
    cancelAnimationFrame(timerRef.current)
    setFlipped(true)
    setState(STATES.SHOWING_ANSWER)
  }, [state])

  const rateCard = useCallback((rating) => {
    if (state !== STATES.SHOWING_ANSWER) return
    const responseMs = Math.round(elapsed - startTime)
    const newResults = [...results, {
      numberString: cards[currentIndex].numberString,
      rating,
      responseMs,
    }]
    setResults(newResults)

    if (currentIndex + 1 >= cards.length) {
      // Session complete
      cancelAnimationFrame(timerRef.current)
      const totalMs = newResults.reduce((s, r) => s + r.responseMs, 0)
      const correct = newResults.filter(r => r.rating === 1).length
      const stats = {
        total: newResults.length,
        correct,
        accuracyRate: correct / newResults.length,
        avgResponseMs: Math.round(totalMs / newResults.length),
        totalSeconds: Math.round(totalMs / 1000),
      }
      setSessionStats(stats)
      setState(STATES.COMPLETE)

      // Save to backend
      api.postPaoReview(newResults).catch(console.error)
      api.saveRecord({
        moduleType: 'PAO',
        durationSeconds: stats.totalSeconds,
        accuracyRate: stats.accuracyRate,
        avgResponseMs: stats.avgResponseMs,
        totalItems: stats.total,
      }).catch(console.error)
    } else {
      setCurrentIndex(currentIndex + 1)
      setFlipped(false)
      setState(STATES.SHOWING_NUMBER)
      setStartTime(performance.now())
      setElapsed(0)
      timerRef.current = requestAnimationFrame(function tick() {
        setElapsed(performance.now())
        timerRef.current = requestAnimationFrame(tick)
      })
    }
  }, [state, cards, currentIndex, results, elapsed, startTime])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        flipCard()
      } else if (e.key === '1') rateCard(1)
      else if (e.key === '2') rateCard(2)
      else if (e.key === '3') rateCard(3)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flipCard, rateCard])

  useEffect(() => {
    return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current) }
  }, [])

  const currentMs = state === STATES.SHOWING_NUMBER ? Math.round(elapsed - startTime) : 0

  if (state === STATES.LOADING) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-cyan-400 text-xl animate-pulse">加载中...</div>
      </div>
    )
  }

  if (state === STATES.COMPLETE && sessionStats) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-8">训练完成!</h2>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
            <div className="text-4xl font-bold text-green-400">{Math.round(sessionStats.accuracyRate * 100)}%</div>
            <div className="text-gray-400 mt-2">熟练率</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
            <div className="text-4xl font-bold text-yellow-400">{sessionStats.avgResponseMs}ms</div>
            <div className="text-gray-400 mt-2">平均反应</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
            <div className="text-4xl font-bold text-blue-400">{sessionStats.total}</div>
            <div className="text-gray-400 mt-2">总卡片数</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
            <div className="text-4xl font-bold text-purple-400">{sessionStats.totalSeconds}s</div>
            <div className="text-gray-400 mt-2">总耗时</div>
          </div>
        </div>
        <button onClick={loadCards} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium transition-colors">
          再来一轮
        </button>
      </div>
    )
  }

  const card = cards[currentIndex]

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>进度: {currentIndex + 1} / {cards.length}</span>
          <span className="font-mono text-cyan-400">{currentMs}ms</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${((currentIndex) / cards.length) * 100}%` }}></div>
        </div>
      </div>

      {/* Card */}
      <div className="card-container w-80 h-48 mb-8">
        <div className={`card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
          <div className="card-front bg-gray-900 border-2 border-cyan-700 rounded-2xl">
            <span className="text-8xl font-bold text-white font-mono tracking-wider">{card?.numberString}</span>
          </div>
          <div className="card-back bg-gray-900 border-2 border-green-700 rounded-2xl flex-col p-6">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Person</div>
              <div className="text-2xl font-bold text-green-400">{card?.person}</div>
            </div>
            <div className="text-center mt-2">
              <div className="text-sm text-gray-400 mb-1">Action</div>
              <div className="text-2xl font-bold text-yellow-400">{card?.action}</div>
            </div>
            <div className="text-center mt-2">
              <div className="text-sm text-gray-400 mb-1">Object</div>
              <div className="text-2xl font-bold text-purple-400">{card?.object}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {state === STATES.SHOWING_NUMBER && (
        <div className="text-center">
          <p className="text-gray-400 text-sm">在脑中映射图像后按 <kbd className="px-2 py-1 bg-gray-800 rounded text-cyan-400 font-mono">空格</kbd> 翻牌</p>
        </div>
      )}
      {state === STATES.SHOWING_ANSWER && (
        <div className="flex gap-4">
          <button onClick={() => rateCard(1)} className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-lg text-white font-medium transition-colors">
            1 - 熟练 (&lt;2s)
          </button>
          <button onClick={() => rateCard(2)} className="px-6 py-3 bg-yellow-700 hover:bg-yellow-600 rounded-lg text-white font-medium transition-colors">
            2 - 生疏 (&gt;2s)
          </button>
          <button onClick={() => rateCard(3)} className="px-6 py-3 bg-red-700 hover:bg-red-600 rounded-lg text-white font-medium transition-colors">
            3 - 不认识
          </button>
        </div>
      )}
    </div>
  )
}
