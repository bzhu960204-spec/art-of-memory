import { useState } from 'react'
import PaoTrainer from './modules/PaoTrainer'
import WordsRecall from './modules/WordsRecall'
import CardMemorization from './modules/CardMemorization'
import SpeedNumbers from './modules/SpeedNumbers'
import ObjectTrainer from './modules/ObjectTrainer'
import ObjectCrud from './modules/ObjectCrud'

const modules = [
  { id: 'pao', name: '数字编码大师', icon: '🔢', desc: 'PAO System' },
  { id: 'object', name: '物品编码系统', icon: '🎯', desc: 'Object System 00-99' },
  { id: 'words', name: '随机词组闪训', icon: '📝', desc: 'Words Recall' },
  { id: 'cards', name: '虚拟马拉松扑克', icon: '🃏', desc: 'Card Memorization' },
  { id: 'numbers', name: '数字马拉松', icon: '⚡', desc: 'Speed Numbers' },
]

export default function App() {
  const [activeModule, setActiveModule] = useState('pao')
  // object 模块的子视图: 'train' | 'config'
  const [objectView, setObjectView] = useState('train')

  const renderModule = () => {
    switch (activeModule) {
      case 'pao': return <PaoTrainer />
      case 'object': return objectView === 'train' ? <ObjectTrainer /> : <ObjectCrud />
      case 'words': return <WordsRecall />
      case 'cards': return <CardMemorization />
      case 'numbers': return <SpeedNumbers />
      default: return <PaoTrainer />
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
        <nav className="flex-1 p-4 space-y-2">
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
          <p className="text-xs text-gray-600 text-center">v1.0 · Memory Sports Trainer</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderModule()}
      </main>
    </div>
  )
}
