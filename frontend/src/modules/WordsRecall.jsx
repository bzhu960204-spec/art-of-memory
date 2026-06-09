import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

const STATES = { CONFIG: 'CONFIG', FLASHING: 'FLASHING', RECALL: 'RECALL', RESULTS: 'RESULTS' }

export default function WordsRecall() {
  const [state, setState] = useState(STATES.CONFIG)
  const [config, setConfig] = useState({ count: 20, interval: 2 })
  const [words, setWords] = useState([])
  const [currentFlashIndex, setCurrentFlashIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState([])
  const [results, setResults] = useState(null)
  const flashTimer = useRef(null)

  const startTraining = async () => {
    try {
      const data = await api.getWordsRandom(config.count)
      setWords(data)
      setCurrentFlashIndex(0)
      setUserAnswers(new Array(data.length).fill(''))
      setState(STATES.FLASHING)
    } catch (e) {
      console.error('Failed to load words:', e)
    }
  }

  useEffect(() => {
    if (state === STATES.FLASHING && words.length > 0) {
      flashTimer.current = setInterval(() => {
        setCurrentFlashIndex(prev => {
          if (prev + 1 >= words.length) {
            clearInterval(flashTimer.current)
            setState(STATES.RECALL)
            return prev
          }
          return prev + 1
        })
      }, config.interval * 1000)
      return () => clearInterval(flashTimer.current)
    }
  }, [state, words.length, config.interval])

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...userAnswers]
    newAnswers[index] = value
    setUserAnswers(newAnswers)
  }

  const submitRecall = () => {
    let correctCount = 0
    const comparison = words.map((word, i) => {
      const userWord = userAnswers[i]?.trim() || ''
      const isCorrect = userWord.toLowerCase() === word.toLowerCase()
      if (isCorrect) correctCount++
      return { index: i, original: word, user: userWord, isCorrect }
    })

    // Breakpoint analysis: find sequences of consecutive correct/wrong
    const breakpoints = []
    let lastCorrect = null
    for (let i = 0; i < comparison.length; i++) {
      if (comparison[i].isCorrect !== lastCorrect) {
        if (lastCorrect === true) {
          breakpoints.push(i)
        }
        lastCorrect = comparison[i].isCorrect
      }
    }

    const accuracyRate = correctCount / words.length
    const stats = {
      total: words.length,
      correct: correctCount,
      accuracyRate,
      breakpoints,
      comparison,
    }
    setResults(stats)
    setState(STATES.RESULTS)

    // Save record
    api.saveRecord({
      moduleType: 'WORDS',
      durationSeconds: Math.round(words.length * config.interval),
      accuracyRate,
      avgResponseMs: null,
      totalItems: words.length,
    }).catch(console.error)
  }

  const reset = () => {
    setState(STATES.CONFIG)
    setWords([])
    setCurrentFlashIndex(0)
    setUserAnswers([])
    setResults(null)
  }

  if (state === STATES.CONFIG) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">随机词组闪训</h2>
        <p className="text-gray-400 mb-8">训练记忆宫殿的即时挂载能力</p>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 w-full max-w-md space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">词组总量</label>
            <div className="flex gap-3">
              {[20, 50, 100].map(n => (
                <button key={n} onClick={() => setConfig(c => ({ ...c, count: n }))}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${config.count === n ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {n}个
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">闪烁间隔</label>
            <div className="flex gap-3">
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => setConfig(c => ({ ...c, interval: n }))}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${config.interval === n ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {n}秒
                </button>
              ))}
            </div>
          </div>

          <button onClick={startTraining} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold text-lg transition-colors">
            开始训练
          </button>
        </div>
      </div>
    )
  }

  if (state === STATES.FLASHING) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-sm text-gray-400 mb-4">
          {currentFlashIndex + 1} / {words.length}
        </div>
        <div className="w-full max-w-md bg-gray-800 rounded-full h-2 mb-12">
          <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentFlashIndex + 1) / words.length) * 100}%` }}></div>
        </div>
        <div className="text-7xl font-bold text-white animate-pulse">
          {words[currentFlashIndex]}
        </div>
        <p className="text-gray-500 mt-8 text-sm">专注记忆，将词语挂载到你的记忆桩上</p>
      </div>
    )
  }

  if (state === STATES.RECALL) {
    return (
      <div className="flex flex-col items-center h-full p-8 overflow-auto">
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">复盘模式</h2>
        <p className="text-gray-400 mb-6">按顺序填入你记忆的词语</p>

        <div className="w-full max-w-2xl space-y-2 mb-8">
          {userAnswers.map((ans, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-gray-500 font-mono w-8 text-right">{i + 1}.</span>
              <input
                type="text"
                value={ans}
                onChange={(e) => handleAnswerChange(i, e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                placeholder={`第 ${i + 1} 个词...`}
              />
            </div>
          ))}
        </div>

        <button onClick={submitRecall} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-colors">
          提交比对
        </button>
      </div>
    )
  }

  if (state === STATES.RESULTS && results) {
    return (
      <div className="flex flex-col items-center h-full p-8 overflow-auto">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">训练结果</h2>

        <div className="flex gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800 min-w-[120px]">
            <div className="text-3xl font-bold text-green-400">{Math.round(results.accuracyRate * 100)}%</div>
            <div className="text-gray-400 text-sm mt-1">正确率</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800 min-w-[120px]">
            <div className="text-3xl font-bold text-blue-400">{results.correct}/{results.total}</div>
            <div className="text-gray-400 text-sm mt-1">正确/总数</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800 min-w-[120px]">
            <div className="text-3xl font-bold text-yellow-400">{results.breakpoints.length}</div>
            <div className="text-gray-400 text-sm mt-1">断点数</div>
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-1 mb-8">
          {results.comparison.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-lg ${item.isCorrect ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
              <span className="text-gray-500 font-mono w-8 text-right">{i + 1}.</span>
              <span className={`flex-1 font-medium ${item.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {item.user || '(空)'}
              </span>
              {!item.isCorrect && (
                <span className="text-gray-400 text-sm">正确: <span className="text-white">{item.original}</span></span>
              )}
              <span className="text-lg">{item.isCorrect ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>

        <button onClick={reset} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-colors">
          重新开始
        </button>
      </div>
    )
  }

  return null
}
