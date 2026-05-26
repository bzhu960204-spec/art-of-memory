import { useState, useEffect, useRef } from 'react'

const STATES = { CONFIG: 'CONFIG', MEMORIZE: 'MEMORIZE', RECALL: 'RECALL', RESULT: 'RESULT' }
const STORAGE_KEY = 'numMemory_records'
const MAX_HISTORY = 20

const DIGIT_OPTIONS = [3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 50]

function generateNumber(digits) {
  let result = String(Math.floor(Math.random() * 9) + 1)
  for (let i = 1; i < digits; i++) result += Math.floor(Math.random() * 10)
  return result
}

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

function saveRecord(digits, timeMs, correct) {
  const all = loadRecords()
  const key = String(digits)
  const list = all[key] || []
  list.unshift({ timeMs, correct, date: new Date().toLocaleDateString('zh-CN') })
  all[key] = list.slice(0, MAX_HISTORY)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  return all
}

function formatTime(ms) {
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's'
  const m = Math.floor(ms / 60000)
  const s = ((ms % 60000) / 1000).toFixed(0)
  return `${m}m ${s}s`
}

function formatNumber(num) {
  if (!num) return ''
  return num.match(/.{1,4}/g).join(' ')
}

export default function NumberMemory() {
  const [state, setState] = useState(STATES.CONFIG)
  const [digits, setDigits] = useState(6)
  const [number, setNumber] = useState('')
  const [userInput, setUserInput] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [memorizeTimeMs, setMemorizeTimeMs] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [allRecords, setAllRecords] = useState(loadRecords)
  const startTimeRef = useRef(null)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (state === STATES.MEMORIZE) {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current)
      }, 100)
      return () => clearInterval(timerRef.current)
    }
  }, [state])

  useEffect(() => {
    if (state === STATES.RECALL && inputRef.current) {
      inputRef.current.focus()
    }
  }, [state])

  const startTraining = () => {
    const num = generateNumber(digits)
    setNumber(num)
    setUserInput('')
    setElapsedMs(0)
    setState(STATES.MEMORIZE)
  }

  const finishMemorize = () => {
    clearInterval(timerRef.current)
    const spent = Date.now() - startTimeRef.current
    setMemorizeTimeMs(spent)
    setState(STATES.RECALL)
  }

  const submitAnswer = () => {
    const correct = userInput === number
    setIsCorrect(correct)
    const updated = saveRecord(digits, memorizeTimeMs, correct)
    setAllRecords(updated)
    setState(STATES.RESULT)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && userInput.length > 0) submitAnswer()
  }

  const records = allRecords[String(digits)] || []
  const correctRecords = records.filter(r => r.correct)
  const bestTimeMs = correctRecords.length > 0 ? Math.min(...correctRecords.map(r => r.timeMs)) : null

  if (state === STATES.CONFIG) {
    return (
      <div className="h-full flex overflow-auto p-8">
        <div className="m-auto w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-cyan-400 mb-2">🧠 数字记忆训练</h2>
            <p className="text-gray-400">选择位数，记住随机数字，挑战你的极限！</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-3">选择数字位数</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {DIGIT_OPTIONS.map(d => {
                const recs = allRecords[String(d)] || []
                const best = recs.filter(r => r.correct)
                const bestMs = best.length > 0 ? Math.min(...best.map(r => r.timeMs)) : null
                return (
                  <button
                    key={d}
                    onClick={() => setDigits(d)}
                    className={`py-3 rounded-lg text-sm font-bold transition-all ${
                      digits === d
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div>{d} 位</div>
                    {bestMs && (
                      <div className={`text-xs mt-0.5 font-mono ${digits === d ? 'text-cyan-200' : 'text-yellow-500'}`}>
                        {formatTime(bestMs)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {records.length > 0 && (
            <div className="mb-6 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">{digits} 位 — 历史记录</span>
                {bestTimeMs && (
                  <span className="text-xs text-yellow-400 font-mono">🏆 最佳 {formatTime(bestTimeMs)}</span>
                )}
              </div>
              <div className="divide-y divide-gray-800 max-h-52 overflow-y-auto">
                {records.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span>{r.correct ? '✅' : '❌'}</span>
                      <span className="text-xs text-gray-500">{r.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-bold ${r.correct ? 'text-green-400' : 'text-red-400'}`}>
                        {formatTime(r.timeMs)}
                      </span>
                      {r.correct && r.timeMs === bestTimeMs && (
                        <span className="text-xs text-yellow-500">🏆</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startTraining}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl text-lg hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg"
          >
            开始训练
          </button>
        </div>
      </div>
    )
  }

  if (state === STATES.MEMORIZE) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-gray-800 px-5 py-2 rounded-full">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-2xl font-mono font-bold text-cyan-400">
                {formatTime(elapsedMs)}
              </span>
            </div>
          </div>

          <div className="mb-10 p-8 bg-gray-900 rounded-2xl border border-gray-700">
            <p className="text-sm text-gray-500 mb-4">{digits} 位数字</p>
            <p
              className={`font-mono font-bold tracking-wider break-all leading-relaxed ${
                digits <= 10 ? 'text-5xl' : digits <= 20 ? 'text-4xl' : 'text-3xl'
              }`}
              style={{ color: '#67e8f9' }}
            >
              {formatNumber(number)}
            </p>
          </div>

          <button
            onClick={finishMemorize}
            className="px-10 py-4 bg-green-600 text-white font-bold rounded-xl text-lg hover:bg-green-500 transition-all shadow-lg"
          >
            ✓ 我记好了
          </button>
        </div>
      </div>
    )
  }

  if (state === STATES.RECALL) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-lg w-full text-center">
          <h3 className="text-2xl font-bold text-gray-200 mb-1">输入你记住的数字</h3>
          <p className="text-gray-500 mb-2">{digits} 位数字</p>
          <p className="text-sm text-cyan-400 font-mono mb-8">记忆用时 {formatTime(memorizeTimeMs)}</p>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            placeholder="在此输入数字..."
            className="w-full text-center text-3xl font-mono tracking-widest p-4 bg-gray-800 border-2 border-gray-600 rounded-xl text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none transition-colors"
            maxLength={digits}
          />

          <div className="mt-3 text-sm text-gray-500">
            已输入 <span className="text-cyan-400 font-mono">{userInput.length}</span> / {digits} 位
          </div>

          <button
            onClick={submitAnswer}
            disabled={userInput.length === 0}
            className="mt-8 w-full py-4 bg-cyan-600 text-white font-bold rounded-xl text-lg hover:bg-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            提交答案
          </button>
        </div>
      </div>
    )
  }

  const latestRecords = allRecords[String(digits)] || []
  const latestCorrect = latestRecords.filter(r => r.correct)
  const newBest = isCorrect && latestCorrect.length > 0 &&
    memorizeTimeMs === Math.min(...latestCorrect.map(r => r.timeMs))

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <div className={`text-7xl mb-4 ${isCorrect ? 'animate-bounce' : ''}`}>
          {isCorrect ? (newBest ? '🏆' : '🎉') : '😢'}
        </div>

        <h3 className={`text-3xl font-bold mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? (newBest ? '新纪录！' : '完全正确！') : '不太对哦'}
        </h3>

        <div className="mb-4">
          <span className="text-gray-400">记忆用时 </span>
          <span className="text-cyan-400 font-mono font-bold text-xl">{formatTime(memorizeTimeMs)}</span>
          {isCorrect && latestCorrect.length > 1 && !newBest && (
            <span className="ml-2 text-xs text-gray-500">
              (最佳 {formatTime(Math.min(...latestCorrect.map(r => r.timeMs)))})
            </span>
          )}
        </div>

        {!isCorrect && (
          <div className="mb-6 p-5 bg-gray-900 rounded-xl border border-gray-700 text-left space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">正确答案</p>
              <p className="font-mono text-lg text-green-400 tracking-wider break-all">{formatNumber(number)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">你的答案</p>
              <p className="font-mono text-lg tracking-wider break-all">
                {number.split('').map((ch, i) => (
                  <span key={i} className={userInput[i] === ch ? 'text-green-400' : 'text-red-400'}>
                    {userInput[i] || '_'}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}

        {latestRecords.length > 1 && (
          <div className="mb-6 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">近期</span>
            {latestRecords.slice(0, 8).map((r, i) => (
              <span
                key={i}
                title={formatTime(r.timeMs)}
                className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                  r.correct ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                }`}
              >
                {r.correct ? formatTime(r.timeMs) : '✗'}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={startTraining}
            className="flex-1 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition-all"
          >
            🔄 再来一次（{digits}位）
          </button>
          <button
            onClick={() => setState(STATES.CONFIG)}
            className="flex-1 py-3 bg-gray-700 text-gray-200 font-bold rounded-xl hover:bg-gray-600 transition-all"
          >
            ⚙️ 更换位数
          </button>
        </div>
      </div>
    </div>
  )
}
