import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// In production (Vercel), VITE_API_URL points to your Render backend.
// In development, Vite proxies /api → localhost:8000 via vite.config.js.
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE,
  timeout: 120_000,
})

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    // Only force-logout on 401 from protected endpoints, NOT from /auth/login itself
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const isLoginAttempt = url.includes('/auth/login') || url.includes('/auth/signup')
      if (!isLoginAttempt) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login:  (email, password) => api.post('/auth/login',  { email, password }),
  signup: (data)            => api.post('/auth/signup', data),
  me:     ()                => api.get('/auth/me'),
}

// ─── Jobs ────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list:    ()     => api.get('/jobs'),
  get:     (id)   => api.get(`/jobs/${id}`),
  create:  (data) => api.post('/jobs', data),
  update:  (id, data) => api.put(`/jobs/${id}`, data),
  delete:  (id)   => api.delete(`/jobs/${id}`),
  analyze: (id)   => api.post(`/jobs/${id}/analyze`),
}

// ─── Sourcing ─────────────────────────────────────────────────────────────────
export const sourcingApi = {
  start:    (jobId, platforms) => api.post(`/sourcing/start`, { job_id: jobId, platforms }),
  status:   (runId)            => api.get(`/sourcing/status/${runId}`),
  results:  (jobId)            => api.get(`/sourcing/results/${jobId}`),
  refine:   (jobId, params)    => api.post(`/sourcing/refine`, { job_id: jobId, ...params }),
}

// ─── Candidates ───────────────────────────────────────────────────────────────
export const candidatesApi = {
  list:       (jobId, params) => api.get(`/candidates`, { params: { job_id: jobId, ...params } }),
  get:        (id)            => api.get(`/candidates/${id}`),
  updateStage:(id, stage)     => api.patch(`/candidates/${id}/stage`, { stage }),
  getContacts:(id)            => api.post(`/candidates/${id}/contacts`),
  questionnaire:(id)          => api.post(`/candidates/${id}/questionnaire`),
  outreach:   (id)            => api.post(`/candidates/${id}/outreach`),
  bulkUpdate: (ids, data)     => api.patch('/candidates/bulk', { ids, ...data }),
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
export const pipelineApi = {
  summary: () => api.get('/pipeline/summary'),
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsApi = {
  overview: () => api.get('/reports/overview'),
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  get:    ()     => api.get('/settings'),
  update: (data) => api.put('/settings', data),
}

// ─── Users (admin) ────────────────────────────────────────────────────────────
export const usersApi = {
  list:   ()          => api.get('/users'),
  create: (data)      => api.post('/users', data),
  update: (id, data)  => api.put(`/users/${id}`, data),
  delete: (id)        => api.delete(`/users/${id}`),
}
