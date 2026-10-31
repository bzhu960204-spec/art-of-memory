// Single source of truth for module metadata used across the app.
// Tailwind only generates classes that appear literally in source, so colour classes are spelled out in full.

/** Training-record module types (must match backend com.memory.common.ModuleType). */
export const MODULE_TYPES = {
  PAO: { label: '数字编码', icon: '🔢', text: 'text-cyan-400', bar: 'bg-cyan-500' },
  OBJECT: { label: '物品编码', icon: '🎯', text: 'text-green-400', bar: 'bg-green-500' },
  WORDS: { label: '随机词组', icon: '📝', text: 'text-purple-400', bar: 'bg-purple-500' },
  CARDS: { label: '扑克记忆', icon: '🃏', text: 'text-pink-400', bar: 'bg-pink-500' },
  NUMBERS: { label: '数字马拉松', icon: '⚡', text: 'text-yellow-400', bar: 'bg-yellow-500' },
  NUM_MEMORY: { label: '数字记忆', icon: '🧠', text: 'text-orange-400', bar: 'bg-orange-500' },
  NAMES: { label: '人脸名字', icon: '👤', text: 'text-rose-400', bar: 'bg-rose-500' },
  TEXT: { label: '文章段落', icon: '📖', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  BINARY: { label: '二进制', icon: '🎲', text: 'text-indigo-400', bar: 'bg-indigo-500' },
  DATES: { label: '历史日期', icon: '📅', text: 'text-amber-400', bar: 'bg-amber-500' },
}

const FALLBACK = { icon: '🎯', text: 'text-gray-400', bar: 'bg-gray-500' }

export function moduleTypeInfo(type) {
  return MODULE_TYPES[type] ?? { ...FALLBACK, label: type }
}

/** Sidebar navigation entries. `id` is also the URL hash route. */
export const NAV_ITEMS = [
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
