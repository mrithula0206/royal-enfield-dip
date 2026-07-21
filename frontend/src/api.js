const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function request(path, params = {}, options = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

export const api = {
  health: () => request('/api/health'),

  kpis: (filters = {}) => request('/api/kpis', filters),

  drilldown: (dimension, filters = {}) => request(`/api/drilldowns/${dimension}`, filters),

  topBottom: (dimension, params = {}) => request(`/api/top-bottom/${dimension}`, params),

  monthOnMonth: (params = {}) => request('/api/comparisons/month-on-month', params),
  dayOnDay: (params = {}) => request('/api/comparisons/day-on-day', params),
  targetVsActual: (params = {}) => request('/api/comparisons/target-vs-actual', params),

  hygieneSummary: (params = {}) => request('/api/campaign-hygiene/summary', params),
  hygieneHistory: (campaignId, params = {}) => request(`/api/campaign-hygiene/${campaignId}/history`, params),
  hygieneStreaks: (campaignId) => request(`/api/campaign-hygiene/${campaignId}/streaks`),

  insights: (params = {}) => request('/api/ai-insights', params),
  insightCategories: () => request('/api/ai-insights/categories'),
  generateInsights: (params = {}) => request('/api/ai-insights/generate', params, { method: 'POST' }),

  leadJourney: (leadId) => request(`/api/lead-journey/${leadId}`),
  searchLeads: (params = {}) => request('/api/lead-journey', params),
  journeyMetrics: (params = {}) => request('/api/lead-journey/metrics/summary', params),

  dailyTrend: (params = {}) => request('/api/reports/daily-trend', params),
  dailySummary: (params = {}) => request('/api/reports/daily-summary', params),

  masterData: (entity) => request(`/api/master-data/${entity}`),
};
