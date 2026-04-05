import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../utils/api'
import toast from 'react-hot-toast'
import axios from 'axios'

// Check if the API is reachable at all
async function checkApiHealth() {
  try {
    const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}` : ''
    await axios.get(`${base}/api/health`, { timeout: 8000 })
    return true
  } catch {
    return false
  }
}

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [show, setShow]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [checking, setChecking]   = useState(true)  // check health on mount
  const [apiReady, setApiReady]   = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const { setAuth } = useAuthStore()
  const navigate    = useNavigate()
  const pollRef     = useRef(null)

  // On mount — poll until /api/health responds
  useEffect(() => {
    let attempts = 0
    async function poll() {
      const ok = await checkApiHealth()
      if (ok) {
        setApiReady(true)
        setChecking(false)
        clearInterval(pollRef.current)
      } else {
        attempts++
        setRetryCount(attempts)
        if (attempts >= 10) {
          // Give up polling, show form anyway
          setChecking(false)
          clearInterval(pollRef.current)
        }
      }
    }
    poll() // immediate first check
    pollRef.current = setInterval(poll, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      setAuth(res.data.access_token, res.data.user)
      navigate('/app/dashboard')
    } catch (err) {
      if (!err.response) {
        toast.error('Cannot reach the API. Check your connection.')
      } else if (err.response.status === 401) {
        toast.error('Invalid email or password')
      } else {
        toast.error(err.response?.data?.detail || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  async function demoLogin(role) {
    const demoEmail = role === 'admin' ? 'admin@talentai.com' : 'recruiter@talentai.com'
    setEmail(demoEmail)
    setPassword('demo123')
    setLoading(true)
    try {
      const res = await authApi.login(demoEmail, 'demo123')
      setAuth(res.data.access_token, res.data.user)
      navigate('/app/dashboard')
    } catch (err) {
      if (!err.response) {
        toast.error('API not reachable yet — wait a moment and try again')
      } else if (err.response.status === 401) {
        toast.error('Demo account credentials invalid')
      } else {
        toast.error(err.response?.data?.detail || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Loading screen while polling health ──────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 text-center w-full max-w-xs">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Wifi size={20} className="text-brand-600 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-gray-800 mb-1">Connecting to API…</p>
          <p className="text-xs text-gray-400 mb-4">
            {retryCount === 0 ? 'Starting up…' : `Attempt ${retryCount} — please wait`}
          </p>
          <div className="flex gap-1 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Normal login form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/30 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Zap size={17} className="text-white" />
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">TalentAI</div>
              <div className="text-[11px] text-gray-400">Your Sourcing Agent</div>
            </div>
          </div>

          {/* API status pill */}
          <div className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full w-fit mb-5 ${apiReady ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${apiReady ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
            {apiReady ? 'API connected' : 'API connecting…'}
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition pr-10" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 text-center mb-2.5">Quick demo access</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => demoLogin('standard')} disabled={loading}
                className="py-2 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                Recruiter demo
              </button>
              <button onClick={() => demoLogin('admin')} disabled={loading}
                className="py-2 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                Admin demo
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-600 hover:underline font-medium">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
