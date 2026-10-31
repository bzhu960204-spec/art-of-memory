import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

const responses = {
  '/api/analytics/summary': { modules: [], totalSessions: 0, heatmap: {} },
  '/api/analytics/trend': [],
  '/api/analytics/weakest': [],
  '/api/analytics/bests': {},
}

beforeEach(() => {
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

  it('loads the analytics dashboard by default', async () => {
    render(<App />)

    expect(await screen.findByText('训练仪表盘', { selector: 'h2' })).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/analytics/summary?days=30', expect.any(Object))
  })
})
