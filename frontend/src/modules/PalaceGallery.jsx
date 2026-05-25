import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'

export default function PalaceGallery() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [toast, setToast] = useState(null)
  const fileInputRef = useRef(null)

  const loadImages = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getPalaceList()
      setImages(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadImages() }, [loadImages])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleUpload = async (files) => {
    if (files.length === 0) return
    setUploading(true)
    try {
      let count = 0
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''))
        await api.uploadPalaceImage(formData)
        count++
      }
      await loadImages()
      setShowUploadModal(false)
      setPendingFiles([])
      showToast(`成功上传 ${count} 张图片`)
    } catch (err) {
      showToast(err.message || '上传失败', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) setPendingFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) setPendingFiles(prev => [...prev, ...files])
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false) }

  const removePendingFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDelete = async (id) => {
    try {
      await api.deletePalaceImage(id)
      setImages(prev => prev.filter(img => img.id !== id))
      if (lightbox && lightbox.id === id) setLightbox(null)
      showToast('已删除')
    } catch {
      showToast('删除失败', 'error')
    }
  }

  // 键盘导航 lightbox
  useEffect(() => {
    if (!lightbox) return
    const handler = (e) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const idx = images.findIndex(img => img.id === lightbox.id)
        if (idx < images.length - 1) setLightbox(images[idx + 1])
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const idx = images.findIndex(img => img.id === lightbox.id)
        if (idx > 0) setLightbox(images[idx - 1])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, images])

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

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-cyan-400">记忆宫殿图库</h2>
          <p className="text-xs text-gray-500 mt-1">上传记忆宫殿场景图，随时回顾路径</p>
        </div>
        <button
          onClick={() => { setPendingFiles([]); setShowUploadModal(true) }}
          className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors font-medium"
        >
          上传图片
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-cyan-400">上传记忆宫殿图片</h3>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-cyan-400 bg-cyan-900/20'
                  : 'border-gray-700 hover:border-gray-500 bg-gray-950'
              }`}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="text-gray-300 font-medium">拖拽图片到这里</p>
              <p className="text-gray-500 text-sm mt-1">或点击选择文件（支持多选）</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Pending files preview */}
            {pendingFiles.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-2">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <span className="text-sm text-gray-300 truncate flex-1">{file.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                    <button
                      onClick={() => removePendingFile(idx)}
                      className="text-gray-500 hover:text-red-400 text-lg flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleUpload(pendingFiles)}
                disabled={uploading || pendingFiles.length === 0}
                className="px-5 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {uploading ? '上传中...' : `上传 ${pendingFiles.length} 张图片`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <div className="text-6xl mb-4">🏛️</div>
          <p className="text-lg font-medium">还没有记忆宫殿图片</p>
          <p className="text-sm mt-1">点击上方按钮上传你的第一张记忆宫殿图</p>
        </div>
      )}

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map(img => (
              <div
                key={img.id}
                className="group relative aspect-square rounded-xl overflow-hidden border border-gray-800 hover:border-cyan-600 transition-colors cursor-pointer bg-gray-900"
                onClick={() => setLightbox(img)}
              >
                <img
                  src={`/api/palaces/image/${img.fileName}`}
                  alt={img.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <span className="text-white text-sm font-medium truncate">{img.title}</span>
                </div>
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(img.id) }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={`/api/palaces/image/${lightbox.fileName}`}
              alt={lightbox.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center">
              <h3 className="text-white text-lg font-medium">{lightbox.title}</h3>
              <p className="text-gray-400 text-xs mt-1">← → 键切换 · Esc 关闭</p>
            </div>
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-9 h-9 bg-gray-800 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-lg transition-colors"
            >
              ✕
            </button>
            {/* Prev / Next */}
            {images.findIndex(img => img.id === lightbox.id) > 0 && (
              <button
                onClick={() => {
                  const idx = images.findIndex(img => img.id === lightbox.id)
                  setLightbox(images[idx - 1])
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 bg-gray-800 hover:bg-gray-700 text-white rounded-full flex items-center justify-center text-xl"
              >
                ‹
              </button>
            )}
            {images.findIndex(img => img.id === lightbox.id) < images.length - 1 && (
              <button
                onClick={() => {
                  const idx = images.findIndex(img => img.id === lightbox.id)
                  setLightbox(images[idx + 1])
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 bg-gray-800 hover:bg-gray-700 text-white rounded-full flex items-center justify-center text-xl"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
