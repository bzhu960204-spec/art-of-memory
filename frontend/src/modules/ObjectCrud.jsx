import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'

const IMPORT_TEMPLATE = `[
  {"numberString": "00", "objectName": "铃铛", "hint": "铃铛摇一摇"},
  {"numberString": "01", "objectName": "烟斗", "hint": ""},
  {"numberString": "02", "objectName": "恩人", "hint": ""},
  {"numberString": "03", "objectName": "扇子", "hint": ""},
  {"numberString": "04", "objectName": "司机", "hint": ""}
]`

/**
 * 解析用户上传的 JSON，统一转换为
 * [{ numberString, objectName, hint }] 格式。
 *
 * 支持两种格式：
 *   数组: [{"numberString":"00","objectName":"铃铛","hint":"..."},...]
 *   对象: {"00":"铃铛","05":{"objectName":"莲藕","hint":"..."}}
 */
function parseImportJson(raw) {
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) {
    return parsed.map(item => ({
      numberString: String(item.numberString ?? item.number ?? '').padStart(2, '0'),
      objectName: String(item.objectName ?? item.object ?? item.name ?? ''),
      hint: String(item.hint ?? item.tip ?? item.memo ?? ''),
    })).filter(i => i.numberString && i.objectName)
  }
  // plain object
  return Object.entries(parsed).map(([key, val]) => ({
    numberString: String(key).padStart(2, '0'),
    objectName: typeof val === 'string' ? val : String(val.objectName ?? val.object ?? val.name ?? ''),
    hint: typeof val === 'string' ? '' : String(val.hint ?? val.tip ?? val.memo ?? ''),
  })).filter(i => i.numberString && i.objectName)
}

export default function ObjectCrud() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingNum, setEditingNum] = useState(null)
  const [editForm, setEditForm] = useState({ objectName: '', hint: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [importing, setImporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [copied, setCopied] = useState(false)

  const loadCodes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getObjectAll()
      setCodes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCodes() }, [loadCodes])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const startEdit = (code) => {
    setEditingNum(code.numberString)
    setEditForm({ objectName: code.objectName, hint: code.hint || '' })
  }

  const cancelEdit = () => {
    setEditingNum(null)
    setEditForm({ objectName: '', hint: '' })
  }

  const saveEdit = async (numberString) => {
    if (!editForm.objectName.trim()) return
    setSaving(true)
    try {
      const updated = await api.putObject(numberString, {
        objectName: editForm.objectName.trim(),
        hint: editForm.hint.trim(),
      })
      setCodes(prev => prev.map(c => c.numberString === numberString ? updated : c))
      setEditingNum(null)
      showToast(`${numberString} 已保存`)
    } catch (e) {
      showToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── 导出当前配置为 JSON 模板 ──
  const handleExport = () => {
    const data = codes.map(c => ({
      numberString: c.numberString,
      objectName: c.objectName,
      hint: c.hint || '',
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'object-codes.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── 导入 JSON ──
  const openImportModal = () => {
    setImportText('')
    setCopied(false)
    setShowImportModal(true)
  }

  const copyTemplate = () => {
    navigator.clipboard.writeText(IMPORT_TEMPLATE).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleImportConfirm = async () => {
    if (!importText.trim()) return
    setImporting(true)
    try {
      const items = parseImportJson(importText.trim())
      if (items.length === 0) { showToast('JSON 中未找到有效编码', 'error'); return }
      await api.postObjectImport(items)
      await loadCodes()
      setShowImportModal(false)
      showToast(`成功导入 ${items.length} 条编码`)
    } catch (err) {
      showToast(err.message?.includes('JSON') ? 'JSON 格式错误，请检查内容' : '导入失败', 'error')
    } finally {
      setImporting(false)
    }
  }

  const weightColor = (w) => {
    if (w >= 7) return 'text-red-400 bg-red-900/30'
    if (w >= 4) return 'text-yellow-400 bg-yellow-900/30'
    return 'text-green-400 bg-green-900/30'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-cyan-400 text-xl animate-pulse">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'error' ? 'bg-red-800 text-red-100' : 'bg-green-800 text-green-100'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col gap-4 p-6">
            <h3 className="text-lg font-bold text-cyan-400">导入 JSON 编码</h3>

            {/* Template */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">导入模板（可直接复制修改）</span>
                <button
                  onClick={copyTemplate}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded-lg transition-colors"
                >
                  {copied ? '已复制 ✓' : '复制模板'}
                </button>
              </div>
              <pre className="text-xs text-cyan-500 overflow-x-auto whitespace-pre-wrap">{IMPORT_TEMPLATE}</pre>
              <p className="mt-2 text-xs text-gray-500">
                也支持简写格式：<code className="text-cyan-600">{`{"00":"铃铛","01":"烟斗"}`}</code>
              </p>
            </div>

            {/* Paste area */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">粘贴你的 JSON（将覆盖对应编号的数据）</label>
              <textarea
                autoFocus
                className="w-full h-48 bg-gray-950 border border-gray-700 focus:border-cyan-600 rounded-xl p-3 text-sm text-white font-mono resize-none outline-none transition-colors"
                placeholder="在此粘贴 JSON..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importing || !importText.trim()}
                className="px-5 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {importing ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-cyan-400">物品编码配置</h2>
          <p className="text-xs text-gray-500 mt-1">点击任意行编辑 · 可导入 JSON 批量替换</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            导出 JSON
          </button>
          <button
            onClick={openImportModal}
            className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
          >
            导入 JSON
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr className="text-gray-400 text-left">
              <th className="px-4 py-3 w-16 font-medium">编号</th>
              <th className="px-4 py-3 font-medium">物品</th>
              <th className="px-4 py-3 font-medium text-gray-500">联想提示</th>
              <th className="px-4 py-3 w-20 font-medium text-center">权重</th>
              <th className="px-4 py-3 w-20 font-medium text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code, idx) => (
              <tr
                key={code.numberString}
                className={`border-t border-gray-800 transition-colors ${
                  editingNum === code.numberString
                    ? 'bg-cyan-900/20'
                    : idx % 2 === 0 ? 'bg-gray-950 hover:bg-gray-900' : 'bg-gray-900/50 hover:bg-gray-900'
                }`}
              >
                <td className="px-4 py-2">
                  <span className="font-mono font-bold text-cyan-400 text-base">{code.numberString}</span>
                </td>

                {editingNum === code.numberString ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        autoFocus
                        className="w-full bg-gray-800 border border-cyan-600 rounded px-2 py-1 text-white text-sm outline-none"
                        value={editForm.objectName}
                        onChange={e => setEditForm(f => ({ ...f, objectName: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(code.numberString)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-300 text-sm outline-none"
                        value={editForm.hint}
                        placeholder="联想提示（选填）"
                        onChange={e => setEditForm(f => ({ ...f, hint: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(code.numberString)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${weightColor(code.weight)}`}>
                        {code.weight}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => saveEdit(code.numberString)}
                          disabled={saving}
                          className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2">
                      <span className="text-white font-medium">{code.objectName}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-gray-500 text-xs">{code.hint || '—'}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${weightColor(code.weight)}`}>
                        {code.weight}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => startEdit(code)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                      >
                        编辑
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}