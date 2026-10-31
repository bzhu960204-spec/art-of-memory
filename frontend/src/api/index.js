const API_BASE = '/api';

// Event-based error notification
const errorListeners = new Set();
export function onApiError(listener) {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}
function notifyError(msg) {
  errorListeners.forEach(fn => fn(msg));
}

async function request(url, options = {}, context) {
  const fail = (msg) => {
    const full = context ? `${context}：${msg}` : msg
    notifyError(full)
    return new Error(full)
  }

  const isForm = options.body instanceof FormData
  let response
  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...options,
      // Let the browser set the multipart boundary for FormData
      headers: isForm ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw fail('网络连接失败，请检查后端服务');
  }

  let result
  try {
    result = await response.json();
  } catch {
    throw fail(`服务器响应异常（HTTP ${response.status}）`);
  }
  if (result.code === 200) {
    return result.data;
  }
  throw fail(result.msg || '请求失败');
}

export const api = {
  getPaoRandom: (limit = 20) => request(`/pao/random?limit=${limit}`),
  getPaoSession: (limit = 20) => request(`/pao/session?limit=${limit}`),
  // Spaced repetition
  getSrsDue: (module, limit = 20) => request(`/srs/due?module=${module}&limit=${limit}`),
  getSrsStats: (module) => request(`/srs/stats?module=${module}`),
  // Full data export (download link, not a JSON request)
  backupExportUrl: `${API_BASE}/backup/export`,
  postPaoReview: (items) => request('/pao/review', { method: 'POST', body: JSON.stringify(items) }),
  getWordsRandom: (limit = 20) => request(`/words/random?limit=${limit}`),
  getCardsShuffle: () => request('/cards/shuffle'),
  saveRecord: (record) => request('/records/save', { method: 'POST', body: JSON.stringify(record) }, '训练成绩保存失败'),
  getRecords: (module) => request(`/records/list${module ? `?module=${module}` : ''}`),
  // Object codes (00-99 Object System)
  getObjectAll: () => request('/objects/all'),
  putObject: (num, body) => request(`/objects/${num}`, { method: 'PUT', body: JSON.stringify(body) }),
  postObjectWeights: (updates) => request('/objects/weights', { method: 'POST', body: JSON.stringify(updates) }),
  postObjectWeightsReset: () => request('/objects/weights/reset', { method: 'POST', body: '[]' }),
  postObjectReview: (items) => request('/objects/review', { method: 'POST', body: JSON.stringify(items) }),
  postObjectImport: (items) => request('/objects/import', { method: 'POST', body: JSON.stringify(items) }),
  // Palace images
  getPalaceList: () => request('/palaces/list'),
  uploadPalaceImage: (formData) => request('/palaces/upload', { method: 'POST', body: formData }, '上传失败'),
  deletePalaceImage: (id) => request(`/palaces/${id}`, { method: 'DELETE' }),
  // Analytics
  getAnalyticsTrend: (days = 30, module) => request(`/analytics/trend?days=${days}${module ? `&module=${module}` : ''}`),
  getAnalyticsSummary: (days = 30) => request(`/analytics/summary?days=${days}`),
  getAnalyticsWeakest: (limit = 10, module) => request(`/analytics/weakest?limit=${limit}${module ? `&module=${module}` : ''}`),
  getAnalyticsBests: () => request('/analytics/bests'),
  // Challenge & Achievements
  getDailyChallenge: () => request('/challenge/daily'),
  getChallengeHistory: () => request('/challenge/daily/history'),
  getStreak: () => request('/challenge/streak'),
  getAchievements: () => request('/challenge/achievements'),
};
