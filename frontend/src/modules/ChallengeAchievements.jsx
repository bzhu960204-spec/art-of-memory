import { useState, useEffect } from 'react'
import { api } from '../api'

export default function ChallengeAchievements() {
  const [tab, setTab] = useState('daily') // 'daily' | 'achievements' | 'streak'
  const [daily, setDaily] = useState(null)
  const [history, setHistory] = useState([])
  const [streak, setStreak] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [d, h, s, a] = await Promise.all([
        api.getDailyChallenge(),
        api.getChallengeHistory(),
        api.getStreak(),
        api.getAchievements(),
      ])
      setDaily(d)
      setHistory(h)
      setStreak(s)
      setAchievements(a)
    } catch (e) {
      console.error('Failed to load challenge data:', e)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-cyan-400 text-xl animate-pulse">加载中...</div>
      </div>
    )
  }

  const MODULE_NAMES = {
    PAO: '数字编码', OBJECT: '物品编码', WORDS: '随机词组',
    CARDS: '扑克记忆', NUMBERS: '数字马拉松',
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-cyan-400">挑战与成就</h2>
          <p className="text-gray-400 text-sm mt-1">每日挑战、连续训练、荣誉徽章</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'daily', label: '📅 每日挑战' },
          { id: 'achievements', label: '🏆 成就徽章' },
          { id: 'streak', label: '🔥 连续训练' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg font-medium transition-colors ${
              tab === t.id ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Daily Challenge */}
      {tab === 'daily' && (
        <div className="space-y-6">
          {/* Today's Challenge */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">今日挑战</h3>
            {daily ? (
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="text-cyan-400 text-2xl font-bold mb-1">
                    {MODULE_NAMES[daily.moduleType] || daily.moduleType}
                  </div>
                  <div className="text-gray-400 text-sm">
                    日期: {daily.challengeDate} · 已尝试 {daily.attempts} 次
                  </div>
                  {daily.bestAccuracy != null && (
                    <div className="mt-2 text-sm">
                      <span className="text-green-400">最佳正确率: {Math.round(daily.bestAccuracy * 100)}%</span>
                      {daily.bestTimeSeconds && (
                        <span className="text-cyan-400 ml-4">最快用时: {daily.bestTimeSeconds}秒</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-6xl">
                  {daily.moduleType === 'NUMBERS' ? '⚡' :
                   daily.moduleType === 'WORDS' ? '📝' :
                   daily.moduleType === 'CARDS' ? '🃏' :
                   daily.moduleType === 'PAO' ? '🔢' : '🎯'}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">无法加载今日挑战</div>
            )}
            <p className="text-gray-500 text-xs mt-4">
              提示: 在对应模块完成训练后，成绩会自动记录到每日挑战
            </p>
          </div>

          {/* History */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">挑战历史</h3>
            {history.length === 0 ? (
              <div className="text-gray-500 text-center py-4">暂无历史记录</div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-4 bg-gray-800/50 rounded-lg px-4 py-3">
                    <span className="text-gray-400 font-mono text-sm w-24">{h.challengeDate}</span>
                    <span className="text-white font-medium flex-1">
                      {MODULE_NAMES[h.moduleType] || h.moduleType}
                    </span>
                    <span className="text-gray-400 text-sm">{h.attempts}次尝试</span>
                    {h.bestAccuracy != null && (
                      <span className="text-green-400 font-bold">
                        {Math.round(h.bestAccuracy * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Achievements */}
      {tab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map(ach => {
            const progress = Math.min(ach.progress / ach.target, 1)
            return (
              <div key={ach.key}
                className={`bg-gray-900 rounded-xl p-5 border transition-all ${
                  ach.unlocked ? 'border-yellow-600 shadow-lg shadow-yellow-900/20' : 'border-gray-800'
                }`}>
                <div className="flex items-center gap-4">
                  <div className={`text-4xl ${ach.unlocked ? '' : 'grayscale opacity-40'}`}>
                    {ach.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-bold ${ach.unlocked ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {ach.name}
                    </div>
                    <div className="text-gray-500 text-sm">{ach.description}</div>
                    {ach.unlocked && ach.unlockedTime && (
                      <div className="text-green-400 text-xs mt-1">
                        ✓ 已解锁 {ach.unlockedTime.split('T')[0]}
                      </div>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                {!ach.unlocked && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{ach.progress}/{ach.target}</span>
                      <span>{Math.round(progress * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-cyan-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Streak */}
      {tab === 'streak' && streak && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
              <div className="text-5xl font-bold text-orange-400">{streak.currentStreak}</div>
              <div className="text-gray-400 text-sm mt-2">当前连续天数</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
              <div className="text-5xl font-bold text-yellow-400">{streak.longestStreak}</div>
              <div className="text-gray-400 text-sm mt-2">最长连续天数</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
              <div className="text-5xl font-bold text-cyan-400">{streak.lastTrainDate || '—'}</div>
              <div className="text-gray-400 text-sm mt-2">上次训练日期</div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">🔥 连续训练里程碑</h3>
            <div className="space-y-3">
              {[
                { days: 3, label: '初露锋芒', icon: '⭐' },
                { days: 7, label: '周练达人', icon: '🌟' },
                { days: 14, label: '两周坚持', icon: '💫' },
                { days: 30, label: '月练大师', icon: '🏆' },
                { days: 60, label: '记忆修行者', icon: '👑' },
                { days: 100, label: '百日大师', icon: '🎖️' },
              ].map(milestone => {
                const achieved = streak.longestStreak >= milestone.days
                const progress = Math.min(streak.currentStreak / milestone.days, 1)
                return (
                  <div key={milestone.days} className="flex items-center gap-4">
                    <span className={`text-2xl ${achieved ? '' : 'grayscale opacity-40'}`}>
                      {milestone.icon}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className={achieved ? 'text-yellow-400 font-medium' : 'text-gray-400'}>
                          {milestone.label} ({milestone.days}天)
                        </span>
                        {achieved && <span className="text-green-400 text-sm">✓ 已达成</span>}
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
                        <div className={`h-1.5 rounded-full transition-all ${achieved ? 'bg-yellow-500' : 'bg-cyan-600'}`}
                          style={{ width: `${progress * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
