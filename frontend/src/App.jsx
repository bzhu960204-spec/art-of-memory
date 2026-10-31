import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { onApiError } from './api'
import { NAV_ITEMS } from './constants/modules'
import { useHashRoute } from './hooks/useHashRoute'

const PAGES = {
  dashboard: lazy(() => import('./modules/AnalyticsDashboard')),
  pao: lazy(() => import('./modules/PaoTrainer')),
  object: lazy(() => import('./modules/ObjectTrainer')),
  'object/config': lazy(() => import('./modules/ObjectCrud')),
  words: lazy(() => import('./modules/WordsRecall')),
  cards: lazy(() => import('./modules/CardMemorization')),
  numbers: lazy(() => import('./modules/SpeedNumbers')),
  numMemory: lazy(() => import('./modules/NumberMemory')),
  names: lazy(() => import('./modules/NamesAndFaces')),
  textMemory: lazy(() => import('./modules/TextMemory')),
  binary: lazy(() => import('./modules/BinaryDatesTrainer')),
  palace: lazy(() => import('./modules/PalaceGallery')),
  challenge: lazy(() => import('./modules/ChallengeAchievements')),
}

const DEFAULT_ROUTE = 'dashboard'

function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-cyan-400 text-xl animate-pulse">加载中...</div>
    </div>
  )
}

export default function App() {
  const [route, navigate] = useHashRoute(DEFAULT_ROUTE)
  const pageKey = PAGES[route] ? route : DEFAULT_ROUTE
  const [activeModule, subView] = pageKey.split('/')
  const Page = PAGES[pageKey]

  // Toast notification for API errors
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    const unsubscribe = onApiError((msg) => {
      setToast(msg)
      clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast(null), 4000)
    })
    return () => {
      unsubscribe()
      clearTimeout(toastTimer.current)
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-cyan-400">⚡ 闪电记忆大师</h1>
          <p className="text-xs text-gray-500 mt-1">Lightning Memory Master</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((m) => (
            <div key={m.id}>
              <button
                onClick={() => navigate(m.id)}
                aria-current={activeModule === m.id ? 'page' : undefined}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeModule === m.id
                    ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-700'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <span className="text-lg mr-2" aria-hidden="true">{m.icon}</span>
                <span className="text-sm font-medium">{m.name}</span>
              </button>

              {/* Object 模块的子导航 */}
              {m.id === 'object' && activeModule === 'object' && (
                <div className="flex mt-1 ml-4 gap-1">
                  <button
                    onClick={() => navigate('object')}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                      !subView
                        ? 'bg-cyan-800/50 text-cyan-300'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    训练
                  </button>
                  <button
                    onClick={() => navigate('object/config')}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                      subView === 'config'
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
        <Suspense fallback={<Loading />}>
          <Page key={pageKey} />
        </Suspense>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div role="alert" className="fixed top-4 right-4 z-50 bg-red-900/90 border border-red-700 text-red-200 px-5 py-3 rounded-lg shadow-xl animate-pulse max-w-sm">
          <div className="flex items-center gap-2">
            <span className="text-red-400">⚠</span>
            <span className="text-sm">{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}
