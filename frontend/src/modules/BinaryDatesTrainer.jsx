import { useState, useRef, useEffect } from 'react'
import { api } from '../api'

const STATES = { CONFIG: 'CONFIG', MEMORIZE: 'MEMORIZE', RECALL: 'RECALL', RESULTS: 'RESULTS' }

const MODES = {
  BINARY: 'BINARY',
  DATES: 'DATES',
}

const HISTORICAL_EVENTS = [
  { year: 1949, event: '中华人民共和国成立' },
  { year: 1969, event: '人类首次登月' },
  { year: 1945, event: '第二次世界大战结束' },
  { year: 1912, event: '中华民国成立' },
  { year: 1776, event: '美国独立宣言签署' },
  { year: 1989, event: '柏林墙倒塌' },
  { year: 2001, event: '中国加入WTO' },
  { year: 1492, event: '哥伦布发现新大陆' },
  { year: 1861, event: '美国南北战争开始' },
  { year: 1917, event: '俄国十月革命' },
  { year: 2008, event: '北京奥运会' },
  { year: 1953, event: 'DNA双螺旋结构发现' },
  { year: 1903, event: '莱特兄弟首次飞行' },
  { year: 1687, event: '牛顿发表《自然哲学的数学原理》' },
  { year: 1840, event: '鸦片战争' },
  { year: 1919, event: '五四运动' },
  { year: 1978, event: '中国改革开放' },
  { year: 1453, event: '君士坦丁堡陷落' },
  { year: 1789, event: '法国大革命' },
  { year: 1066, event: '诺曼征服英格兰' },
]

function generateBinaryNumbers(count, digits) {
  const numbers = []
  const max = Math.pow(2, digits)
  const used = new Set()
  while (numbers.length < count) {
    const num = Math.floor(Math.random() * max)
    if (!used.has(num)) {
      used.add(num)
      numbers.push({
        decimal: num,
        binary: num.toString(2).padStart(digits, '0'),
      })
    }
  }
  return numbers
}

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function BinaryDatesTrainer() {
  const [mode, setMode] = useState(MODES.BINARY)
  const [state, setState] = useState(STATES.CONFIG)
  const [config, setConfig] = useState({ count: 10, digits: 8, memorizeTime: 60 })
  const [items, setItems] = useState([])
  const [shuffledItems, setShuffledItems] = useState([])
  const [userAnswers, setUserAnswers] = useState([])
  const [results, setResults] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef(null)

  const startTraining = () => {
    let generated
    if (mode === MODES.BINARY) {
      generated = generateBinaryNumbers(config.count, config.digits)
    } else {
      generated = shuffleArray(HISTORICAL_EVENTS).slice(0, config.count)
    }
    setItems(generated)
    setCountdown(config.memorizeTime)
    setState(STATES.MEMORIZE)
  }

  useEffect(() => {
    if (state === STATES.MEMORIZE && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            timerRef.current = null
            goToRecall()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [state])

  const goToRecall = () => {
    const shuffled = shuffleArray(items)
    setShuffledItems(shuffled)
    setUserAnswers(new Array(shuffled.length).fill(''))
    setState(STATES.RECALL)
  }

  const finishMemorize = () => {
    clearInterval(timerRef.current)
    timerRef.current = null
    goToRecall()
  }

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...userAnswers]
    newAnswers[index] = value
    setUserAnswers(newAnswers)
  }

  const submitRecall = () => {
    let correctCount = 0
    const comparison = shuffledItems.map((item, i) => {
      const userAnswer = userAnswers[i]?.trim() || ''
      let isCorrect = false

      if (mode === MODES.BINARY) {
        // Accept decimal answer for binary
        isCorrect = userAnswer === String(item.decimal)
      } else {
        // For dates, accept the year
        isCorrect = userAnswer === String(item.year)
      }
      if (isCorrect) correctCount++
      return { item, userAnswer, isCorrect }
    })

    const accuracyRate = correctCount / items.length
    setResults({ comparison, correctCount, total: items.length, accuracyRate })
    setState(STATES.RESULTS)

    api.saveRecord({
      moduleType: mode === MODES.BINARY ? 'BINARY' : 'DATES',
      durationSeconds: config.memorizeTime - countdown,
      accuracyRate,
      avgResponseMs: null,
      totalItems: items.length,
    }).catch(() => {})
  }

  const reset = () => {
    setState(STATES.CONFIG)
    setItems([])
    setShuffledItems([])
    setUserAnswers([])
    setResults(null)
  }

  if (state === STATES.CONFIG) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">
          {mode === MODES.BINARY ? '二进制数字训练' : '历史日期训练'}
        </h2>
        <p className="text-gray-400 mb-8">
          {mode === MODES.BINARY ? '记忆二进制数并转换为十进制' : '记忆历史事件对应的年份'}
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode(MODES.BINARY)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              mode === MODES.BINARY ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}>
            🔢 二进制
          </button>
          <button onClick={() => setMode(MODES.DATES)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              mode === MODES.DATES ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}>
            📅 历史日期
          </button>
        </div>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 w-full max-w-md space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">题目数量</label>
            <div className="flex gap-3">
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setConfig(c => ({ ...c, count: Math.min(n, mode === MODES.DATES ? 20 : n) }))}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    config.count === n ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {n}个
                </button>
              ))}
            </div>
          </div>

          {mode === MODES.BINARY && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">二进制位数</label>
              <div className="flex gap-3">
                {[4, 6, 8, 10].map(d => (
                  <button key={d} onClick={() => setConfig(c => ({ ...c, digits: d }))}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      config.digits === d ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}>
                    {d}位
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">记忆时间</label>
            <div className="flex gap-3">
              {[30, 60, 120].map(t => (
                <button key={t} onClick={() => setConfig(c => ({ ...c, memorizeTime: t }))}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    config.memorizeTime === t ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {t}秒
                </button>
              ))}
            </div>
          </div>

          <button onClick={startTraining}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold text-lg transition-colors">
            开始挑战
          </button>
        </div>
      </div>
    )
  }

  if (state === STATES.MEMORIZE) {
    return (
      <div className="flex flex-col items-center h-full p-6 overflow-auto">
        <div className="flex justify-between w-full max-w-2xl mb-6">
          <h2 className="text-xl font-bold text-cyan-400">记忆阶段</h2>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-2xl font-bold ${countdown <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              {countdown}s
            </span>
            <button onClick={finishMemorize}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white text-sm font-medium transition-colors">
              记完了
            </button>
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-4 bg-gray-900 rounded-xl p-4 border border-gray-800">
              <span className="text-gray-500 font-mono w-6">{i + 1}.</span>
              {mode === MODES.BINARY ? (
                <>
                  <span className="font-mono text-xl text-cyan-300 tracking-wider flex-1">{item.binary}</span>
                  <span className="text-gray-400 text-sm">= </span>
                  <span className="font-bold text-xl text-white w-12 text-right">{item.decimal}</span>
                </>
              ) : (
                <>
                  <span className="text-white font-medium flex-1">{item.event}</span>
                  <span className="font-mono font-bold text-xl text-cyan-300">{item.year}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state === STATES.RECALL) {
    return (
      <div className="flex flex-col items-center h-full p-6 overflow-auto">
        <h2 className="text-xl font-bold text-cyan-400 mb-2">回忆阶段</h2>
        <p className="text-gray-400 mb-6">
          {mode === MODES.BINARY ? '写出每个二进制数对应的十进制值' : '写出每个事件对应的年份'}
        </p>

        <div className="w-full max-w-2xl space-y-3 mb-6">
          {shuffledItems.map((item, i) => (
            <div key={i} className="flex items-center gap-4 bg-gray-900 rounded-xl p-4 border border-gray-800">
              <span className="text-gray-500 font-mono w-6">{i + 1}.</span>
              {mode === MODES.BINARY ? (
                <span className="font-mono text-xl text-cyan-300 tracking-wider flex-1">{item.binary}</span>
              ) : (
                <span className="text-white font-medium flex-1">{item.event}</span>
              )}
              <input
                type="text"
                value={userAnswers[i]}
                onChange={(e) => handleAnswerChange(i, e.target.value)}
                className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-mono focus:border-cyan-500 focus:outline-none"
                placeholder={mode === MODES.BINARY ? '十进制' : '年份'}
              />
            </div>
          ))}
        </div>

        <button onClick={submitRecall}
          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-colors">
          提交答案
        </button>
      </div>
    )
  }

  if (state === STATES.RESULTS && results) {
    return (
      <div className="flex flex-col items-center h-full p-6 overflow-auto">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">训练结果</h2>

        <div className="flex gap-6 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-green-400">{Math.round(results.accuracyRate * 100)}%</div>
            <div className="text-gray-400 text-sm mt-1">正确率</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-blue-400">{results.correctCount}/{results.total}</div>
            <div className="text-gray-400 text-sm mt-1">正确/总数</div>
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-2 mb-8">
          {results.comparison.map((c, i) => (
            <div key={i} className={`flex items-center gap-4 px-4 py-3 rounded-lg ${
              c.isCorrect ? 'bg-green-900/20' : 'bg-red-900/20'
            }`}>
              <span className="text-lg">{c.isCorrect ? '✓' : '✗'}</span>
              {mode === MODES.BINARY ? (
                <>
                  <span className="font-mono text-cyan-300 flex-1">{c.item.binary}</span>
                  <span className={`font-bold ${c.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    你: {c.userAnswer || '(空)'}
                  </span>
                  {!c.isCorrect && (
                    <span className="text-gray-400">正确: <span className="text-white font-bold">{c.item.decimal}</span></span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-white flex-1">{c.item.event}</span>
                  <span className={`font-mono font-bold ${c.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    你: {c.userAnswer || '(空)'}
                  </span>
                  {!c.isCorrect && (
                    <span className="text-gray-400">正确: <span className="text-white font-bold">{c.item.year}</span></span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <button onClick={reset}
          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-colors">
          重新开始
        </button>
      </div>
    )
  }

  return null
}
