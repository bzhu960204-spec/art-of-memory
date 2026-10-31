import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'

const responses = {
  '/api/analytics/summary': { modules: [{ moduleType: 'TEXT', sessions: 2, avgAccuracy: 0.5, avgResponseMs: 0 }], totalSessions: 2, heatmap: {} },
  '/api/analytics/trend': [],
  '/api/analytics/weakest': [],
  '/api/analytics/bests': {},
  '/api/challenge/daily': { id: 1, challengeDate: '2026-10-31', moduleType: 'PAO', attempts: 0 },
  '/api/challenge/daily/history': [],
  '/api/challenge/streak': { currentStreak: 0, longestStreak: 0, lastTrainDate: null },
  '/api/challenge/achievements': [],
  '/api/records/list': [],
}

beforeEach(() => {
  window.location.hash = ''
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = url.split('?')[0]
    return { json: async () => ({ code: 200, data: responses[path] ?? null }) }
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the sidebar with all training modules', () => {
    render(<App />)

    expect(screen.getByText('⚡ 闪电记忆大师')).toBeInTheDocument()
    for (const name of ['训练仪表盘', '数字编码大师', '物品编码系统', '记忆宫殿图库', '挑战与成就']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('loads the analytics dashboard by default and shows Chinese names for all module types', async () => {
    render(<App />)

    expect(await screen.findByText('训练仪表盘', { selector: 'h2' })).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/analytics/summary?days=30', expect.any(Object))
    expect(await screen.findByText('文章段落')).toBeInTheDocument()
  })

  it('opens the page from the URL hash', async () => {
    window.location.hash = '#/challenge'
    render(<App />)

    expect(await screen.findByText('挑战与成就', { selector: 'h2' })).toBeInTheDocument()
  })

  it('updates the URL hash when navigating', async () => {
    render(<App />)

    fireEvent.click(screen.getByText('挑战与成就'))

    await waitFor(() => expect(window.location.hash).toBe('#/challenge'))
    expect(await screen.findByText('挑战与成就', { selector: 'h2' })).toBeInTheDocument()
  })

  it('falls back to the dashboard for unknown routes', async () => {
    window.location.hash = '#/nope'
    render(<App />)

    expect(await screen.findByText('训练仪表盘', { selector: 'h2' })).toBeInTheDocument()
  })
})
