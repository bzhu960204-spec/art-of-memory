import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const STATES = { CONFIG: 'CONFIG', MEMORIZE: 'MEMORIZE', RECALL: 'RECALL', RESULTS: 'RESULTS' }

// Generate random names (Chinese)
const SURNAMES = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗']
const GIVEN_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '华', '慧']
const FACE_COLORS = ['#4A90D9', '#D94A4A', '#4AD99B', '#D9A04A', '#9B4AD9', '#4AD9D9', '#D94A9B', '#6B8E23', '#FF6347', '#4682B4']
const FACE_FEATURES = ['○', '◐', '◑', '◒', '◓', '◔', '◕', '●', '◉', '◎']

function generatePeople(count) {
  const people = []
  const usedNames = new Set()
  for (let i = 0; i < count; i++) {
    let name
    do {
      name = SURNAMES[Math.floor(Math.random() * SURNAMES.length)] +
             GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]
    } while (usedNames.has(name))
    usedNames.add(name)

    people.push({
      id: i,
      name,
      color: FACE_COLORS[Math.floor(Math.random() * FACE_COLORS.length)],
      feature: FACE_FEATURES[Math.floor(Math.random() * FACE_FEATURES.length)],
      hairStyle: Math.floor(Math.random() * 4),
    })
  }
  return people
}

function FaceAvatar({ person, size = 80 }) {
  const hairStyles = [
    'M 20 35 Q 40 10 60 35', // short
    'M 15 40 Q 40 5 65 40',  // medium
    'M 10 50 Q 40 0 70 50',  // long
    'M 25 30 Q 40 15 55 30', // buzz
  ]

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className="rounded-full">
      <circle cx="40" cy="40" r="38" fill={person.color} opacity="0.3" />
      <circle cx="40" cy="42" r="25" fill={person.color} opacity="0.6" />
      <path d={hairStyles[person.hairStyle]} stroke={person.color} strokeWidth="4" fill="none" opacity="0.8" />
      <text x="40" y="50" textAnchor="middle" fontSize="20" fill="white">{person.feature}</text>
    </svg>
  )
}

export default function NamesAndFaces() {
  const [state, setState] = useState(STATES.CONFIG)
  const [config, setConfig] = useState({ count: 10, memorizeTime: 60 })
  const [people, setPeople] = useState([])
  const [shuffledPeople, setShuffledPeople] = useState([])
  const [userAnswers, setUserAnswers] = useState([])
  const [results, setResults] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef(null)

  const startTraining = () => {
    const generated = generatePeople(config.count)
    setPeople(generated)
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
    // Shuffle the order for recall
    const shuffled = [...people].sort(() => Math.random() - 0.5)
    setShuffledPeople(shuffled)
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
    const comparison = shuffledPeople.map((person, i) => {
      const userAnswer = userAnswers[i]?.trim() || ''
      const isCorrect = userAnswer === person.name
      if (isCorrect) correctCount++
      return { person, userAnswer, isCorrect }
    })

    const accuracyRate = correctCount / people.length
    setResults({ comparison, correctCount, total: people.length, accuracyRate })
    setState(STATES.RESULTS)

    api.saveRecord({
      moduleType: 'NAMES',
      durationSeconds: config.memorizeTime - countdown,
      accuracyRate,
      avgResponseMs: null,
      totalItems: people.length,
    }).catch(() => {})
  }

  const reset = () => {
    setState(STATES.CONFIG)
    setPeople([])
    setShuffledPeople([])
    setUserAnswers([])
    setResults(null)
  }

  if (state === STATES.CONFIG) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">人脸名字配对</h2>
        <p className="text-gray-400 mb-8">记忆人脸与姓名的对应关系</p>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 w-full max-w-md space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">人数</label>
            <div className="flex gap-3">
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setConfig(c => ({ ...c, count: n }))}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    config.count === n ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {n}人
                </button>
              ))}
            </div>
          </div>

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
            开始训练
          </button>
        </div>
      </div>
    )
  }

  if (state === STATES.MEMORIZE) {
    return (
      <div className="flex flex-col items-center h-full p-6 overflow-auto">
        <div className="flex justify-between w-full max-w-3xl mb-6">
          <h2 className="text-xl font-bold text-cyan-400">记忆阶段 - 记住每张脸对应的名字</h2>
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

        <div className="grid grid-cols-5 gap-4 w-full max-w-3xl">
          {people.map(person => (
            <div key={person.id} className="flex flex-col items-center bg-gray-900 rounded-xl p-4 border border-gray-800">
              <FaceAvatar person={person} size={72} />
              <div className="mt-2 text-white font-medium text-center">{person.name}</div>
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
        <p className="text-gray-400 mb-6">写出每张脸对应的名字</p>

        <div className="grid grid-cols-5 gap-4 w-full max-w-3xl mb-6">
          {shuffledPeople.map((person, i) => (
            <div key={person.id} className="flex flex-col items-center bg-gray-900 rounded-xl p-4 border border-gray-800">
              <FaceAvatar person={person} size={72} />
              <input
                type="text"
                value={userAnswers[i]}
                onChange={(e) => handleAnswerChange(i, e.target.value)}
                className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-center text-sm focus:border-cyan-500 focus:outline-none"
                placeholder="姓名"
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

        <div className="grid grid-cols-5 gap-4 w-full max-w-3xl mb-8">
          {results.comparison.map((item, i) => (
            <div key={i} className={`flex flex-col items-center rounded-xl p-4 border ${
              item.isCorrect ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'
            }`}>
              <FaceAvatar person={item.person} size={60} />
              <div className="mt-2 text-white font-medium text-sm text-center">{item.person.name}</div>
              {!item.isCorrect && (
                <div className="text-red-400 text-xs mt-1 text-center">你的答案: {item.userAnswer || '(空)'}</div>
              )}
              <span className="text-lg mt-1">{item.isCorrect ? '✓' : '✗'}</span>
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
