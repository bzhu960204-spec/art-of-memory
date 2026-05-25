import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

const STATES = { LOADING: 'LOADING', MEMORIZE: 'MEMORIZE', RECALL: 'RECALL', RESULTS: 'RESULTS' }

function getCardColor(suit) {
  return suit === '♥' || suit === '♦' ? 'suit-red' : 'suit-black'
}

function CardDisplay({ card, size = 'normal', highlighted, dimmed, onClick }) {
  const sizeClasses = size === 'small' ? 'w-12 h-16 text-xs' : 'w-24 h-36 text-lg'
  return (
    <div
      onClick={onClick}
      className={`${sizeClasses} rounded-lg border-2 flex flex-col items-center justify-center font-bold cursor-pointer transition-all select-none
        ${highlighted === 'correct' ? 'border-green-500 bg-green-900/30' : ''}
        ${highlighted === 'wrong' ? 'border-red-500 bg-red-900/30' : ''}
        ${!highlighted ? 'border-gray-600 bg-gray-900 hover:border-cyan-500 hover:bg-gray-800' : ''}
        ${dimmed ? 'opacity-30 pointer-events-none' : ''}
      `}
    >
      <span className={getCardColor(card.suit)}>{card.suit}</span>
      <span className={`${getCardColor(card.suit)} ${size === 'small' ? 'text-sm' : 'text-2xl'} font-bold`}>{card.rank}</span>
    </div>
  )
}

export default function CardMemorization() {
  const [state, setState] = useState(STATES.LOADING)
  const [deck, setDeck] = useState([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [userSequence, setUserSequence] = useState([])
  const [results, setResults] = useState(null)
  const timerRef = useRef(null)

  const loadDeck = async () => {
    setState(STATES.LOADING)
    try {
      const data = await api.getCardsShuffle()
      setDeck(data)
      setCurrentCardIndex(0)
      setUserSequence([])
      setResults(null)
      setState(STATES.MEMORIZE)
      setStartTime(performance.now())
      timerRef.current = requestAnimationFrame(function tick() {
        setElapsed(performance.now())
        timerRef.current = requestAnimationFrame(tick)
      })
    } catch (e) {
      console.error('Failed to load deck:', e)
    }
  }

  useEffect(() => { loadDeck() }, [])

  useEffect(() => {
    if (state !== STATES.MEMORIZE) return
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentCardIndex(prev => {
          if (prev + 1 >= deck.length) return prev
          return prev + 1
        })
      } else if (e.key === 'ArrowLeft') {
        setCurrentCardIndex(prev => Math.max(0, prev - 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, deck.length])

  const finishMemorize = () => {
    cancelAnimationFrame(timerRef.current)
    setState(STATES.RECALL)
  }

  const addToSequence = (card) => {
    if (userSequence.find(c => c.id === card.id)) return
    setUserSequence([...userSequence, card])
  }

  const removeFromSequence = (index) => {
    const newSeq = [...userSequence]
    newSeq.splice(index, 1)
    setUserSequence(newSeq)
  }

  const submitResults = () => {
    let correctCount = 0
    const comparison = deck.map((card, i) => {
      const userCard = userSequence[i]
      const isCorrect = userCard && userCard.id === card.id
      if (isCorrect) correctCount++
      return { index: i, original: card, user: userCard || null, isCorrect }
    })

    const totalSeconds = Math.round((elapsed - startTime) / 1000)
    const accuracyRate = correctCount / deck.length
    const stats = { comparison, correctCount, total: deck.length, accuracyRate, totalSeconds }
    setResults(stats)
    setState(STATES.RESULTS)

    api.saveRecord({
      moduleType: 'CARDS',
      durationSeconds: totalSeconds,
      accuracyRate,
      avgResponseMs: null,
      totalItems: deck.length,
    }).catch(console.error)
  }

  const reset = () => {
    cancelAnimationFrame(timerRef.current)
    loadDeck()
  }

  useEffect(() => {
    return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current) }
  }, [])

  const elapsedSeconds = state === STATES.MEMORIZE ? Math.round((elapsed - startTime) / 1000) : 0
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  if (state === STATES.LOADING) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-cyan-400 text-xl animate-pulse">发牌中...</div>
      </div>
    )
  }

  if (state === STATES.MEMORIZE) {
    const card = deck[currentCardIndex]
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="flex justify-between w-full max-w-md mb-8 text-sm">
          <span className="text-gray-400">第 <span className="text-cyan-400 font-bold">{currentCardIndex + 1}</span> / 52 张</span>
          <span className="font-mono text-cyan-400 text-lg">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </div>

        <div className="w-full max-w-md bg-gray-800 rounded-full h-2 mb-12">
          <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${((currentCardIndex + 1) / 52) * 100}%` }}></div>
        </div>

        {/* Card Display */}
        <div className="w-40 h-56 rounded-2xl border-4 border-gray-600 bg-gray-900 flex flex-col items-center justify-center mb-8 shadow-2xl">
          <span className={`text-5xl ${getCardColor(card.suit)}`}>{card.suit}</span>
          <span className={`text-6xl font-bold mt-2 ${getCardColor(card.suit)}`}>{card.rank}</span>
        </div>

        <div className="flex gap-4 mb-4">
          <button onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors" disabled={currentCardIndex === 0}>
            ← 上一张
          </button>
          <button onClick={() => setCurrentCardIndex(Math.min(51, currentCardIndex + 1))}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors" disabled={currentCardIndex >= 51}>
            下一张 →
          </button>
        </div>

        <button onClick={finishMemorize} className="mt-4 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-colors">
          记完了，开始复盘
        </button>

        <p className="text-gray-500 text-sm mt-4">使用 ← → 方向键切牌</p>
      </div>
    )
  }

  if (state === STATES.RECALL) {
    const usedIds = new Set(userSequence.map(c => c.id))
    return (
      <div className="flex flex-col h-full p-6 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan-400">复盘：还原牌序</h2>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">已放置: {userSequence.length}/52</span>
            <button onClick={submitResults} disabled={userSequence.length === 0}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-white font-medium transition-colors">
              比对结果
            </button>
          </div>
        </div>

        {/* User sequence slots */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-2">你的牌序 (点击已放置的牌可移除):</p>
          <div className="flex flex-wrap gap-1 min-h-[80px] bg-gray-900/50 rounded-xl p-3 border border-gray-800">
            {userSequence.map((card, i) => (
              <div key={i} className="relative">
                <span className="absolute -top-1 -left-1 text-[10px] bg-gray-700 rounded-full w-4 h-4 flex items-center justify-center text-gray-300">{i + 1}</span>
                <CardDisplay card={card} size="small" onClick={() => removeFromSequence(i)} />
              </div>
            ))}
            {userSequence.length < 52 && (
              <div className="w-12 h-16 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600 text-xs">
                {userSequence.length + 1}
              </div>
            )}
          </div>
        </div>

        {/* Available cards pool */}
        <div>
          <p className="text-sm text-gray-400 mb-2">待选牌堆 (点击添加到序列末尾):</p>
          <div className="grid grid-cols-13 gap-1">
            {['♠', '♥', '♦', '♣'].map(suit => (
              <div key={suit} className="flex flex-wrap gap-1 mb-2">
                {deck.filter(c => c.suit === suit).map(card => (
                  <CardDisplay
                    key={card.id}
                    card={card}
                    size="small"
                    dimmed={usedIds.has(card.id)}
                    onClick={() => addToSequence(card)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (state === STATES.RESULTS && results) {
    return (
      <div className="flex flex-col items-center h-full p-8 overflow-auto">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">扑克记忆结果</h2>

        <div className="flex gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-green-400">{Math.round(results.accuracyRate * 100)}%</div>
            <div className="text-gray-400 text-sm mt-1">正确率</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-blue-400">{results.correctCount}/{results.total}</div>
            <div className="text-gray-400 text-sm mt-1">正确/总数</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-yellow-400">{results.totalSeconds}s</div>
            <div className="text-gray-400 text-sm mt-1">记忆耗时</div>
          </div>
        </div>

        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-1">
            {results.comparison.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-1 rounded ${item.isCorrect ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                <span className="text-gray-500 font-mono w-6 text-right text-sm">{i + 1}</span>
                <div className="flex items-center gap-2 w-24">
                  {item.user ? (
                    <span className={`font-bold ${getCardColor(item.user.suit)} ${item.isCorrect ? '' : 'line-through'}`}>
                      {item.user.suit}{item.user.rank}
                    </span>
                  ) : <span className="text-gray-600">(空)</span>}
                </div>
                {!item.isCorrect && (
                  <span className="text-gray-400 text-sm">→ <span className={`font-bold ${getCardColor(item.original.suit)}`}>{item.original.suit}{item.original.rank}</span></span>
                )}
                <span className="ml-auto">{item.isCorrect ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={reset} className="mt-8 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-colors">
          重新开始
        </button>
      </div>
    )
  }

  return null
}
