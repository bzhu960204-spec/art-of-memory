import { describe, it, expect, vi, afterEach } from 'vitest'
import { api, onApiError } from './index'

function mockFetch(impl) {
  vi.stubGlobal('fetch', vi.fn(impl))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('unwraps data from successful responses', async () => {
    mockFetch(async () => ({ json: async () => ({ code: 200, msg: 'success', data: ['飞盘'] }) }))

    await expect(api.getWordsRandom(1)).resolves.toEqual(['飞盘'])
    expect(fetch).toHaveBeenCalledWith('/api/words/random?limit=1', expect.any(Object))
  })

  it('sends JSON bodies for POST requests', async () => {
    mockFetch(async () => ({ json: async () => ({ code: 200, data: 'ok' }) }))

    await api.saveRecord({ moduleType: 'PAO' })

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/records/save')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ moduleType: 'PAO' })
  })

  it('rejects and notifies listeners exactly once when the backend reports an error', async () => {
    mockFetch(async () => ({ json: async () => ({ code: 500, msg: '图片不存在' }) }))
    const listener = vi.fn()
    const unsubscribe = onApiError(listener)

    await expect(api.deletePalaceImage(1)).rejects.toThrow('图片不存在')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('图片不存在')
    unsubscribe()
  })

  it('reports a readable message for non-JSON responses', async () => {
    mockFetch(async () => ({ status: 502, json: async () => { throw new SyntaxError('Unexpected token <') } }))
    const listener = vi.fn()
    const unsubscribe = onApiError(listener)

    await expect(api.getWordsRandom()).rejects.toThrow('服务器响应异常（HTTP 502）')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('prefixes errors with context for record saving', async () => {
    mockFetch(async () => ({ json: async () => ({ code: 500, msg: '请求参数不合法' }) }))
    const listener = vi.fn()
    const unsubscribe = onApiError(listener)

    await expect(api.saveRecord({})).rejects.toThrow()
    expect(listener).toHaveBeenCalledWith('训练成绩保存失败：请求参数不合法')
    unsubscribe()
  })

  it('uploads FormData without forcing a JSON content type', async () => {
    mockFetch(async () => ({ json: async () => ({ code: 200, data: { id: 1 } }) }))
    const form = new FormData()
    form.append('title', 'x')

    await expect(api.uploadPalaceImage(form)).resolves.toEqual({ id: 1 })
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/palaces/upload')
    expect(options.body).toBe(form)
    expect(options.headers).toBeUndefined()
  })

  it('shows a friendly message when the backend is unreachable', async () => {
    mockFetch(async () => { throw new TypeError('Failed to fetch') })
    const listener = vi.fn()
    const unsubscribe = onApiError(listener)

    await expect(api.getWordsRandom()).rejects.toThrow()
    expect(listener).toHaveBeenCalledWith('网络连接失败，请检查后端服务')
    unsubscribe()
  })
})
