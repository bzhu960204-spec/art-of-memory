import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const STATES = { CONFIG: 'CONFIG', MEMORIZE: 'MEMORIZE', RECALL: 'RECALL', RESULTS: 'RESULTS' }

const SAMPLE_TEXTS = [
  {
    title: '《将进酒》李白',
    content: '君不见黄河之水天上来，奔流到海不复回。君不见高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。天生我材必有用，千金散尽还复来。'
  },
  {
    title: '《岳阳楼记》范仲淹（节选）',
    content: '庆历四年春，滕子京谪守巴陵郡。越明年，政通人和，百废具兴。乃重修岳阳楼，增其旧制，刻唐贤今人诗赋于其上，属予作文以记之。'
  },
  {
    title: '圆周率前50位',
    content: '3.14159265358979323846264338327950288419716939937510'
  },
  {
    title: '元素周期表前20个',
    content: '氢氦锂铍硼碳氮氧氟氖钠镁铝硅磷硫氯氩钾钙'
  },
  {
    title: '《出师表》诸葛亮（开篇）',
    content: '先帝创业未半而中道崩殂，今天下三分，益州疲弊，此诚危急存亡之秋也。然侍卫之臣不懈于内，忠志之士忘身于外者，盖追先帝之殊遇，欲报之于陛下也。'
  },
  {
    title: '英文绕口令',
    content: 'She sells seashells by the seashore. The shells she sells are seashells, I am sure. So if she sells seashells on the seashore, then I am sure she sells seashore shells.'
  },
]

export default function TextMemory() {
  const [state, setState] = useState(STATES.CONFIG)
  const [config, setConfig] = useState({ textIndex: 0, memorizeTime: 120, customText: '', useCustom: false })
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [blankedText, setBlankedText] = useState([])
  const [userAnswers, setUserAnswers] = useState([])
  const [results, setResults] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef(null)

  const startTraining = () => {
    let selectedText, selectedTitle
    if (config.useCustom && config.customText.trim()) {
      selectedText = config.customText.trim()
      selectedTitle = '自定义文本'
    } else {
      selectedText = SAMPLE_TEXTS[config.textIndex].content
      selectedTitle = SAMPLE_TEXTS[config.textIndex].title
    }
    setText(selectedText)
    setTitle(selectedTitle)
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
    // Create blanks: remove ~40% of characters randomly (in chunks)
    const chars = [...text]
    const chunkSize = 2 + Math.floor(Math.random() * 3) // 2-4 char chunks
    const blanks = []
    let i = 0
    while (i < chars.length) {
      const chunk = chars.slice(i, i + chunkSize).join('')
      if (Math.random() < 0.4 && chunk.trim().length > 0) {
        blanks.push({ type: 'blank', original: chunk, index: blanks.length })
      } else {
        blanks.push({ type: 'text', content: chunk })
      }
      i += chunkSize
    }
    setBlankedText(blanks)
    setUserAnswers(new Array(blanks.filter(b => b.type === 'blank').length).fill(''))
    setState(STATES.RECALL)
  }

  const finishMemorize = () => {
    clearInterval(timerRef.current)
    timerRef.current = null
    goToRecall()
  }

  const handleAnswerChange = (blankIndex, value) => {
    const newAnswers = [...userAnswers]
    newAnswers[blankIndex] = value
    setUserAnswers(newAnswers)
  }

  const submitRecall = () => {
    let correctCount = 0
    let blankIdx = 0
    const comparison = blankedText.filter(b => b.type === 'blank').map((blank) => {
      const userAnswer = userAnswers[blankIdx]?.trim() || ''
      const isCorrect = userAnswer === blank.original
      if (isCorrect) correctCount++
      blankIdx++
      return { original: blank.original, user: userAnswer, isCorrect }
    })

    const totalBlanks = comparison.length
    const accuracyRate = totalBlanks > 0 ? correctCount / totalBlanks : 0
    setResults({ comparison, correctCount, totalBlanks, accuracyRate })
    setState(STATES.RESULTS)

    api.saveRecord({
      moduleType: 'TEXT',
      durationSeconds: config.memorizeTime - countdown,
      accuracyRate,
      avgResponseMs: null,
      totalItems: totalBlanks,
    }).catch(() => {})
  }

  const reset = () => {
    setState(STATES.CONFIG)
    setText('')
    setBlankedText([])
    setUserAnswers([])
    setResults(null)
  }

  if (state === STATES.CONFIG) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">文章段落记忆</h2>
        <p className="text-gray-400 mb-8">限时记忆文本，然后填空测试</p>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 w-full max-w-lg space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">选择文本</label>
              <button onClick={() => setConfig(c => ({ ...c, useCustom: !c.useCustom }))}
                className={`text-xs px-3 py-1 rounded-full ${config.useCustom ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {config.useCustom ? '使用自定义' : '使用预设'}
              </button>
            </div>

            {config.useCustom ? (
              <textarea
                value={config.customText}
                onChange={(e) => setConfig(c => ({ ...c, customText: e.target.value }))}
                className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"
                placeholder="输入你要记忆的文本..."
              />
            ) : (
              <div className="space-y-2 max-h-48 overflow-auto">
                {SAMPLE_TEXTS.map((t, i) => (
                  <button key={i} onClick={() => setConfig(c => ({ ...c, textIndex: i }))}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                      config.textIndex === i ? 'bg-cyan-800/50 text-cyan-300 border border-cyan-700' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}>
                    {t.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">记忆时间</label>
            <div className="flex gap-3">
              {[60, 120, 180, 300].map(t => (
                <button key={t} onClick={() => setConfig(c => ({ ...c, memorizeTime: t }))}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    config.memorizeTime === t ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {t >= 60 ? `${t / 60}分钟` : `${t}秒`}
                </button>
              ))}
            </div>
          </div>

          <button onClick={startTraining}
            disabled={config.useCustom && !config.customText.trim()}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-white font-bold text-lg transition-colors">
            开始训练
          </button>
        </div>
      </div>
    )
  }

  if (state === STATES.MEMORIZE) {
    return (
      <div className="flex flex-col items-center h-full p-8 overflow-auto">
        <div className="flex justify-between w-full max-w-2xl mb-6">
          <div>
            <h2 className="text-xl font-bold text-cyan-400">记忆阶段</h2>
            <p className="text-gray-500 text-sm">{title}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-2xl font-bold ${countdown <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </span>
            <button onClick={finishMemorize}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white text-sm font-medium transition-colors">
              记完了
            </button>
          </div>
        </div>

        <div className="w-full max-w-2xl bg-gray-900 rounded-xl p-8 border border-gray-800">
          <p className="text-white text-xl leading-loose tracking-wider font-medium">
            {text}
          </p>
        </div>

        <p className="text-gray-500 text-sm mt-6">仔细阅读并记忆文本内容</p>
      </div>
    )
  }

  if (state === STATES.RECALL) {
    let blankIdx = 0
    return (
      <div className="flex flex-col items-center h-full p-8 overflow-auto">
        <h2 className="text-xl font-bold text-cyan-400 mb-2">填空测试</h2>
        <p className="text-gray-400 mb-6">填写空缺的部分</p>

        <div className="w-full max-w-2xl bg-gray-900 rounded-xl p-8 border border-gray-800 mb-6">
          <div className="text-lg leading-loose flex flex-wrap items-center gap-1">
            {blankedText.map((item, i) => {
              if (item.type === 'text') {
                return <span key={i} className="text-white">{item.content}</span>
              } else {
                const currentBlankIdx = blankIdx++
                return (
                  <input
                    key={i}
                    type="text"
                    value={userAnswers[currentBlankIdx] || ''}
                    onChange={(e) => handleAnswerChange(currentBlankIdx, e.target.value)}
                    className="inline-block bg-gray-800 border-b-2 border-cyan-600 px-2 py-0.5 text-cyan-300 font-medium focus:outline-none focus:border-cyan-400"
                    style={{ width: `${Math.max(item.original.length * 1.2, 2)}em` }}
                    placeholder="___"
                  />
                )
              }
            })}
          </div>
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
      <div className="flex flex-col items-center h-full p-8 overflow-auto">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">测试结果</h2>

        <div className="flex gap-6 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-green-400">{Math.round(results.accuracyRate * 100)}%</div>
            <div className="text-gray-400 text-sm mt-1">正确率</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <div className="text-3xl font-bold text-blue-400">{results.correctCount}/{results.totalBlanks}</div>
            <div className="text-gray-400 text-sm mt-1">正确/总空数</div>
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-2 mb-8">
          {results.comparison.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
              item.isCorrect ? 'bg-green-900/20' : 'bg-red-900/20'
            }`}>
              <span className="text-gray-500 font-mono w-6">{i + 1}</span>
              <span className={`font-medium ${item.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                {item.user || '(空)'}
              </span>
              {!item.isCorrect && (
                <span className="text-gray-400 text-sm">正确: <span className="text-white">{item.original}</span></span>
              )}
              <span className="ml-auto text-lg">{item.isCorrect ? '✓' : '✗'}</span>
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
