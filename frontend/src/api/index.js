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

async function request(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const result = await response.json();
    if (result.code === 200) {
      return result.data;
    }
    const errMsg = result.msg || '请求失败';
    notifyError(errMsg);
    throw new Error(errMsg);
  } catch (e) {
    if (e.message && !e.message.includes('请求失败')) {
      notifyError(e.message === 'Failed to fetch' ? '网络连接失败，请检查后端服务' : e.message);
    }
    throw e;
  }
}

export const api = {
  getPaoRandom: (limit = 20) => request(`/pao/random?limit=${limit}`),
  postPaoReview: (items) => request('/pao/review', { method: 'POST', body: JSON.stringify(items) }),
  getWordsRandom: (limit = 20) => request(`/words/random?limit=${limit}`),
  getCardsShuffle: () => request('/cards/shuffle'),
  saveRecord: (record) => request('/records/save', { method: 'POST', body: JSON.stringify(record) }),
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
  uploadPalaceImage: (formData) => fetch(`${API_BASE}/palaces/upload`, { method: 'POST', body: formData }).then(r => r.json()).then(r => { if (r.code === 200) return r.data; const msg = r.msg || '上传失败'; notifyError(msg); throw new Error(msg) }),
  deletePalaceImage: (id) => request(`/palaces/${id}`, { method: 'DELETE' }),
  // Analytics
  getAnalyticsTrend: (days = 30, module) => request(`/analytics/trend?days=${days}${module ? `&module=${module}` : ''}`),
  getAnalyticsSummary: (days = 30) => request(`/analytics/summary?days=${days}`),
  getAnalyticsWeakest: (limit = 10, module) => request(`/analytics/weakest?limit=${limit}${module ? `&module=${module}` : ''}`),
  getAnalyticsBests: () => request('/analytics/bests'),
  // Challenge & Achievements
  getDailyChallenge: () => request('/challenge/daily'),
  submitDailyChallenge: (data) => request('/challenge/daily/submit', { method: 'POST', body: JSON.stringify(data) }),
  getChallengeHistory: () => request('/challenge/daily/history'),
  getStreak: () => request('/challenge/streak'),
  getAchievements: () => request('/challenge/achievements'),
};
