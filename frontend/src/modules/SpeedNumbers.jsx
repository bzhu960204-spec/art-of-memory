import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'

const STATES = { CONFIG: 'CONFIG', MEMORIZE: 'MEMORIZE', RECALL: 'RECALL', RESULTS: 'RESULTS' }
const ROWS = 10
const COLS = 10

function generateMatrix() {
  const matrix = []
  for (let r = 0; r < ROWS; r++) {
    const row = []
    for (let c = 0; c < COLS; c++) {
      row.push(Math.floor(Math.random() * 10))
    }
    matrix.push(row)
  }
  return matrix
}

export default function SpeedNumbers() {
  const [state, setState] = useState(STATES.CONFIG)
  const [timeLimit, setTimeLimit] = useState(60)
  const [matrix, setMatrix] = useState([])
  const [userMatrix, setUserMatrix] = useState([])
  const [countdown, setCountdown] = useState(0)
  const [results, setResults] = useState(null)
  const countdownRef = useRef(null)
  const inputRefs = useRef([])

  const startTraining = () => {
    const m = generateMatrix()
    setMatrix(m)
    setUserMatrix(Array.from({ length: ROWS }, () => new Array(COLS).fill('')))
    setCountdown(timeLimit)
    setState(STATES.MEMORIZE)
  }

  useEffect(() => {
    if (state === STATES.MEMORIZE && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
            setState(STATES.RECALL)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current)
          countdownRef.current = null
        }
      }
    }
  }, [state])

  const finishMemorize = () => {
    clearInterval(countdownRef.current)
    setState(STATES.RECALL)
  }

  const handleInputChange = (row, col, value) => {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^\d$/.test(value)) return
    const newMatrix = userMatrix.map(r => [...r])
    newMatrix[row][col] = value
    setUserMatrix(newMatrix)

    // Auto-advance to next cell
    if (value) {
      const nextCol = col + 1
      const nextRow = nextCol >= COLS ? row + 1 : row
      const actualCol = nextCol >= COLS ? 0 : nextCol
      if (nextRow < ROWS) {
        const idx = nextRow * COLS + actualCol
        inputRefs.current[idx]?.focus()
      }
    }
  }

  const handleKeyDown = (e, row, col) => {
    const idx = row * COLS + col
    if (e.key === 'ArrowRight' && col < COLS - 1) {
      inputRefs.current[idx + 1]?.focus()
    } else if (e.key === 'ArrowLeft' && col > 0) {
      inputRefs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowDown' && row < ROWS - 1) {
      inputRefs.current[idx + COLS]?.focus()
    } else if (e.key === 'ArrowUp' && row > 0) {
      inputRefs.current[idx - COLS]?.focus()
    } else if (e.key === 'Backspace' && !userMatrix[row][col]) {
      // Move back on empty backspace
      if (col > 0) inputRefs.current[idx - 1]?.focus()
      else if (row > 0) inputRefs.current[(row - 1) * COLS + COLS - 1]?.focus()
    }
  }

  const submitResults = () => {
    // WMC-style row scoring: consecutive correct from left
    const rowScores = []
    let totalCorrect = 0

    for (let r = 0; r < ROWS; r++) {
      let rowCorrect = 0
      for (let c = 0; c < COLS; c++) {
        if (userMatrix[r][c] === String(matrix[r][c])) {
          rowCorrect++
        } else {
          break // stop counting at first error in row
        }
      }
      // Half-row bonus: if first half is all correct (5 digits), count them even if second half has errors
      // Actually, WMC rule: score consecutive from left, then also check last row for partial
      // Simplified: count consecutive correct from left per row
      rowScores.push(rowCorrect)
      totalCorrect += rowCorrect
    }

    const totalCells = ROWS * COLS
    const accuracyRate = totalCorrect / totalCells

    // Cell-by-cell comparison for display
    const cellResults = []
    for (let r = 0; r < ROWS; r++) {
      const row = []
      for (let c = 0; c < COLS; c++) {
        const userVal = userMatrix[r][c]
        const correctVal = String(matrix[r][c])
        row.push({
          correct: correctVal,
          user: userVal,
          isCorrect: userVal === correctVal,
          isBlank: userVal === '',
        })
      }
      cellResults.push(row)
    }

    const stats = { rowScores, totalCorrect, totalCells, accuracyRate, cellResults }
    setResults(stats)
    setState(STATES.RESULTS)

    api.saveRecord({
      moduleType: 'NUMBERS',
      durationSeconds: timeLimit - countdown,
      accuracyRate,
      avgResponseMs: null,
      totalItems: totalCells,
    }).catch(console.error)
  }

  const reset = () => {
    clearInterval(countdownRef.current)
    setState(STATES.CONFIG)
    setMatrix([])
    setUserMatrix([])
    setResults(null)
  }

  if (state === STATES.CONFIG) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">数字马拉松</h2>
        <p className="text-gray-400 mb-8">视幅拓展与数字行块的瞬时定格记忆</p>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 w-full max-w-md space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">记忆时间限制</label>
            <div className="flex gap-3">
              {[30, 60, 120, 300].map(t => (
                <button key={t} onClick={() => setTimeLimit(t)}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${timeLimit === t ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {t}s
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            将生成 {ROWS}×{COLS} = {ROWS * COLS} 个随机数字
          </div>

          <button onClick={startTraining} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold text-lg transition-colors">
            开始挑战
          </button>
        </div>
      </div>
    )
  }

  if (state === STATES.MEMORIZE) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="flex justify-between w-full max-w-2xl mb-6">
          <h2 className="text-xl font-bold text-cyan-400">记忆阶段</h2>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-2xl font-bold ${countdown <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              {countdown}s
            </span>
            <button onClick={finishMemorize} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white text-sm font-medium transition-colors">
              记完了
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
            {matrix.flatMap((row, r) =>
              row.map((digit, c) => (
                <div key={`${r}-${c}`} className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded text-xl font-mono font-bold text-white">
                  {digit}
                </div>
              ))
            )}
          </div>
        </div>

        <p className="text-gray-500 text-sm mt-6">集中注意力记忆数字矩阵的每一行</p>
      </div>
    )
  }

  if (state === STATES.RECALL) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="flex justify-between w-full max-w-2xl mb-6">
          <h2 className="text-xl font-bold text-cyan-400">回忆阶段</h2>
          <button onClick={submitResults} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium transition-colors">
            提交答案
          </button>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
            {Array.from({ length: ROWS }).flatMap((_, r) =>
              Array.from({ length: COLS }).map((_, c) => (
                <input
                  key={`${r}-${c}`}
                  ref={el => { inputRefs.current[r * COLS + c] = el }}
                  type="text"
                  inputMode="numeric"
                  value={userMatrix[r]?.[c] || ''}
                  onChange={(e) => handleInputChange(r, c, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, r, c)}
                  className="w-10 h-10 text-center bg-gray-800 border border-gray-700 rounded text-xl font-mono font-bold text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  maxLength={1}
                />
              ))
            )}
          </div>
        </div>

        <p className="text-gray-500 text-sm mt-6">在对应位置输入你记住的数字，支持方向键导航</p>
      </div>
    )
  }

  if (state === STATES.RESULTS && results) {
    return (
      <div className="flex flex-col items-center h-full p-8 overflow-auto">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">挑战结果</h2>

        <div className="flex gap-6 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-green-400">{results.totalCorrect}</div>
            <div className="text-gray-400 text-sm mt-1">正确数字</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-blue-400">{Math.round(results.accuracyRate * 100)}%</div>
            <div className="text-gray-400 text-sm mt-1">正确率</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-yellow-400">{results.totalCells}</div>
            <div className="text-gray-400 text-sm mt-1">总数字数</div>
          </div>
        </div>

        {/* Row scores */}
        <div className="w-full max-w-2xl mb-6">
          <div className="flex gap-2 justify-center flex-wrap">
            {results.rowScores.map((score, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1 text-sm">
                <span className="text-gray-400">行{i + 1}: </span>
                <span className={`font-bold ${score === COLS ? 'text-green-400' : score > 0 ? 'text-yellow-400' : 'text-red-400'}`}>{score}/{COLS}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cell-by-cell results */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
            {results.cellResults.flatMap((row, r) =>
              row.map((cell, c) => (
                <div key={`${r}-${c}`}
                  className={`w-10 h-10 flex items-center justify-center rounded text-lg font-mono font-bold
                    ${cell.isCorrect ? 'bg-green-900/40 text-green-400' : cell.isBlank ? 'bg-gray-800 text-gray-600' : 'bg-red-900/40 text-red-400'}
                  `}
                  title={!cell.isCorrect ? `正确: ${cell.correct}` : ''}
                >
                  {cell.isBlank ? cell.correct : cell.user}
                </div>
              ))
            )}
          </div>
        </div>

        <button onClick={reset} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold transition-colors">
          重新开始
        </button>
      </div>
    )
  }

  return null
}
