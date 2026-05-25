const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const result = await response.json();
  if (result.code === 200) {
    return result.data;
  }
  throw new Error(result.msg || 'Request failed');
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
  uploadPalaceImage: (formData) => fetch(`${API_BASE}/palaces/upload`, { method: 'POST', body: formData }).then(r => r.json()).then(r => { if (r.code === 200) return r.data; throw new Error(r.msg) }),
  deletePalaceImage: (id) => request(`/palaces/${id}`, { method: 'DELETE' }),
};
