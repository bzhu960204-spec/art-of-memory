import { useState, useEffect } from 'react'
import { onApiError } from './api'
import PaoTrainer from './modules/PaoTrainer'
import WordsRecall from './modules/WordsRecall'
import CardMemorization from './modules/CardMemorization'
import SpeedNumbers from './modules/SpeedNumbers'
import NumberMemory from './modules/NumberMemory'
import ObjectTrainer from './modules/ObjectTrainer'
import ObjectCrud from './modules/ObjectCrud'
import PalaceGallery from './modules/PalaceGallery'
import AnalyticsDashboard from './modules/AnalyticsDashboard'
import NamesAndFaces from './modules/NamesAndFaces'
import TextMemory from './modules/TextMemory'
import BinaryDatesTrainer from './modules/BinaryDatesTrainer'
import ChallengeAchievements from './modules/ChallengeAchievements'

const modules = [
  { id: 'dashboard', name: '训练仪表盘', icon: '📊', desc: 'Analytics Dashboard' },
  { id: 'pao', name: '数字编码大师', icon: '🔢', desc: 'PAO System' },
  { id: 'object', name: '物品编码系统', icon: '🎯', desc: 'Object System 00-99' },
  { id: 'words', name: '随机词组闪训', icon: '📝', desc: 'Words Recall' },
  { id: 'cards', name: '虚拟马拉松扑克', icon: '🃏', desc: 'Card Memorization' },
  { id: 'numbers', name: '数字马拉松', icon: '⚡', desc: 'Speed Numbers' },
  { id: 'numMemory', name: '数字记忆训练', icon: '🧠', desc: 'Number Memory' },
  { id: 'names', name: '人脸名字配对', icon: '👤', desc: 'Names & Faces' },
  { id: 'textMemory', name: '文章段落记忆', icon: '📖', desc: 'Text Memory' },
  { id: 'binary', name: '二进制/日期', icon: '🎲', desc: 'Binary & Dates' },
  { id: 'palace', name: '记忆宫殿图库', icon: '🏛️', desc: 'Memory Palace Gallery' },
  { id: 'challenge', name: '挑战与成就', icon: '🏆', desc: 'Challenge & Achievements' },
]

export default function App() {
  const [activeModule, setActiveModule] = useState('dashboard')
  // object 模块的子视图: 'train' | 'config'
  const [objectView, setObjectView] = useState('train')
  // Toast notification for API errors
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const unsubscribe = onApiError((msg) => {
      setToast(msg)
      setTimeout(() => setToast(null), 4000)
    })
    return unsubscribe
  }, [])

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <AnalyticsDashboard />
      case 'pao': return <PaoTrainer />
      case 'object': return objectView === 'train' ? <ObjectTrainer /> : <ObjectCrud />
      case 'words': return <WordsRecall />
      case 'cards': return <CardMemorization />
      case 'numbers': return <SpeedNumbers />
      case 'numMemory': return <NumberMemory />
      case 'names': return <NamesAndFaces />
      case 'textMemory': return <TextMemory />
      case 'binary': return <BinaryDatesTrainer />
      case 'palace': return <PalaceGallery />
      case 'challenge': return <ChallengeAchievements />
      default: return <AnalyticsDashboard />
    }
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-cyan-400">⚡ 闪电记忆大师</h1>
          <p className="text-xs text-gray-500 mt-1">Lightning Memory Master</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {modules.map((m) => (
            <div key={m.id}>
              <button
                onClick={() => setActiveModule(m.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeModule === m.id
                    ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <span className="text-lg mr-2">{m.icon}</span>
                <span className="text-sm font-medium">{m.name}</span>
              </button>

              {/* Object 模块的子导航 */}
              {m.id === 'object' && activeModule === 'object' && (
                <div className="flex mt-1 ml-4 gap-1">
                  <button
                    onClick={() => setObjectView('train')}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                      objectView === 'train'
                        ? 'bg-cyan-800/50 text-cyan-300'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    训练
                  </button>
                  <button
                    onClick={() => setObjectView('config')}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                      objectView === 'config'
                        ? 'bg-cyan-800/50 text-cyan-300'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    配置编码
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-600 text-center">v2.0 · Memory Sports Trainer</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderModule()}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-red-900/90 border border-red-700 text-red-200 px-5 py-3 rounded-lg shadow-xl animate-pulse max-w-sm">
          <div className="flex items-center gap-2">
            <span className="text-red-400">⚠</span>
            <span className="text-sm">{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}
