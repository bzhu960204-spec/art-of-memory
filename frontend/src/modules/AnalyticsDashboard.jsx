import { useState, useEffect } from 'react'
import { api } from '../api'

const MODULE_NAMES = {
  PAO: '数字编码',
  OBJECT: '物品编码',
  WORDS: '随机词组',
  CARDS: '扑克记忆',
  NUMBERS: '数字马拉松',
}

const MODULE_COLORS = {
  PAO: 'cyan',
  OBJECT: 'green',
  WORDS: 'purple',
  CARDS: 'pink',
  NUMBERS: 'yellow',
}

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [weakest, setWeakest] = useState([])
  const [bests, setBests] = useState({})
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [days])

  const loadData = async () => {
    setLoading(true)
    try {
      const [s, t, w, b] = await Promise.all([
        api.getAnalyticsSummary(days),
        api.getAnalyticsTrend(days),
        api.getAnalyticsWeakest(10),
        api.getAnalyticsBests(),
      ])
      setSummary(s)
      setTrend(t)
      setWeakest(w)
      setBests(b)
    } catch (e) {
      console.error('Failed to load analytics:', e)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-cyan-400 text-xl animate-pulse">加载分析数据...</div>
      </div>
    )
  }

  const maxSessions = Math.max(...(trend.map(t => t.sessions) || [1]), 1)
  const maxAccuracy = 1

  return (
    <div className="flex flex-col h-full p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-cyan-400">训练仪表盘</h2>
          <p className="text-gray-400 text-sm mt-1">全方位追踪你的记忆训练进度</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                days === d ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {d}天
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="text-4xl font-bold text-cyan-400">{summary?.totalSessions || 0}</div>
          <div className="text-gray-400 text-sm mt-1">总训练次数</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="text-4xl font-bold text-green-400">
            {summary?.modules?.length || 0}
          </div>
          <div className="text-gray-400 text-sm mt-1">活跃模块数</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="text-4xl font-bold text-purple-400">
            {trend.length > 0 ? Math.round(trend[trend.length - 1]?.avgAccuracy * 100) : 0}%
          </div>
          <div className="text-gray-400 text-sm mt-1">最近正确率</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <div className="text-4xl font-bold text-yellow-400">
            {Object.keys(summary?.heatmap || {}).length}
          </div>
          <div className="text-gray-400 text-sm mt-1">训练天数</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Trend Chart (CSS-based bar chart) */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">训练趋势</h3>
          {trend.length === 0 ? (
            <div className="text-gray-500 text-center py-8">暂无数据</div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-end gap-1 h-32">
                {trend.slice(-14).map((point, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-cyan-600 rounded-t transition-all hover:bg-cyan-500"
                      style={{ height: `${(point.avgAccuracy / maxAccuracy) * 100}%`, minHeight: '4px' }}
                      title={`${point.date}: ${Math.round(point.avgAccuracy * 100)}% 正确率, ${point.sessions}次训练`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {trend.slice(-14).map((point, i) => (
                  <div key={i} className="flex-1 text-center text-xs text-gray-600 truncate">
                    {point.date.slice(5)}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>■ 每日平均正确率</span>
                <span>最近14天</span>
              </div>
            </div>
          )}
        </div>

        {/* Module Performance */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">模块表现</h3>
          {!summary?.modules?.length ? (
            <div className="text-gray-500 text-center py-8">暂无数据</div>
          ) : (
            <div className="space-y-3">
              {summary.modules.map(mod => {
                const color = MODULE_COLORS[mod.moduleType] || 'gray'
                return (
                  <div key={mod.moduleType} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{MODULE_NAMES[mod.moduleType] || mod.moduleType}</span>
                      <span className={`text-${color}-400 font-medium`}>
                        {Math.round(mod.avgAccuracy * 100)}% · {mod.sessions}次
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`bg-${color}-500 h-2 rounded-full transition-all`}
                        style={{ width: `${mod.avgAccuracy * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Weakest Items */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">🎯 薄弱项目 Top 10</h3>
          {weakest.length === 0 ? (
            <div className="text-gray-500 text-center py-8">暂无错误记录</div>
          ) : (
            <div className="space-y-2">
              {weakest.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 rounded-lg">
                  <span className="text-red-400 font-bold w-6">{i + 1}</span>
                  <span className="flex-1 text-gray-200 font-mono">{item.itemContent}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
                    {MODULE_NAMES[item.moduleType] || item.moduleType}
                  </span>
                  <span className="text-red-400 font-bold">{item.errorCount}次错误</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personal Bests */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">🏆 个人最佳</h3>
          {Object.keys(bests).length === 0 ? (
            <div className="text-gray-500 text-center py-8">完成训练后这里将显示你的最佳记录</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(bests).map(([mod, data]) => (
                <div key={mod} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-sm text-gray-400 mb-1">{MODULE_NAMES[mod] || mod}</div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-green-400 font-bold text-lg">
                        {Math.round(data.bestAccuracy * 100)}%
                      </span>
                      <span className="text-gray-500 text-xs ml-1">最高正确率</span>
                    </div>
                    {data.bestResponseMs > 0 && (
                      <div>
                        <span className="text-cyan-400 font-bold text-lg">
                          {(data.bestResponseMs / 1000).toFixed(1)}s
                        </span>
                        <span className="text-gray-500 text-xs ml-1">最快响应</span>
                      </div>
                    )}
                    <div>
                      <span className="text-purple-400 font-bold text-lg">
                        {data.totalSessions}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">总次数</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Training Heatmap */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">📅 训练热力图</h3>
        <div className="flex flex-wrap gap-1">
          {(() => {
            const cells = []
            const today = new Date()
            for (let i = days - 1; i >= 0; i--) {
              const d = new Date(today)
              d.setDate(d.getDate() - i)
              const dateStr = d.toISOString().split('T')[0]
              const count = summary?.heatmap?.[dateStr] || 0
              const intensity = count === 0 ? 'bg-gray-800' :
                count <= 2 ? 'bg-green-900' :
                count <= 4 ? 'bg-green-700' : 'bg-green-500'
              cells.push(
                <div key={dateStr} className={`w-4 h-4 rounded-sm ${intensity}`}
                  title={`${dateStr}: ${count}次训练`} />
              )
            }
            return cells
          })()}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
          <span>少</span>
          <div className="w-3 h-3 rounded-sm bg-gray-800" />
          <div className="w-3 h-3 rounded-sm bg-green-900" />
          <div className="w-3 h-3 rounded-sm bg-green-700" />
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>多</span>
        </div>
      </div>
    </div>
  )
}
