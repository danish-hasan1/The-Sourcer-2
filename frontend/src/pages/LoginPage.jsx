import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../utils/api'
import toast from 'react-hot-toast'

const BACKEND_URL = import.meta.env.VITE_API_URL || ''

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [show, setShow]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [warming, setWarming]     = useState(false)   // backend cold-start state
  const [retryCount, setRetryCount] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const { setAuth }   = useAuthStore()
  const navigate      = useNavigate()
  const countRef      = useRef(null)
  const retryRef      = useRef(null)

  useEffect(() => () => {
    clearInterval(countRef.current)
    clearTimeout(retryRef.current)
  }, [])

  async function doLogin(emailVal, passwordVal) {
    const res = await authApi.login(emailVal, passwordVal)
    setAuth(res.data.access_token, res.data.user)
    setWarming(false)
    navigate('/app/dashboard')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await doLogin(email, password)
    } catch (err) {
      handleLoginError(err, email, password)
    } finally {
      setLoading(false)
    }
  }

  function handleLoginError(err, emailVal, passwordVal) {
    if (!err.response) {
      // Network error = backend is cold-starting on Render free tier
      startWarmupRetry(emailVal, passwordVal)
    } else if (err.response.status === 401) {
      toast.error('Invalid email or password')
    } else if (err.response.status === 422) {
      toast.error('Please enter a valid email address')
    } else {
      toast.error(err.response?.data?.detail || 'Login failed — please try again')
    }
  }

  function startWarmupRetry(emailVal, passwordVal, attempt = 1) {
    setWarming(true)
    setRetryCount(attempt)
    // 30-second countdown then auto-retry
    let secs = 30
    setCountdown(secs)
    clearInterval(countRef.current)
    countRef.current = setInterval(() => {
      secs -= 1
      setCountdown(secs)
      if (secs <= 0) clearInterval(countRef.current)
    }, 1000)

    retryRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        await doLogin(emailVal, passwordVal)
      } catch (err) {
        setLoading(false)
        if (!err.response && attempt < 4) {
          // Still down — retry again
          startWarmupRetry(emailVal, passwordVal, attempt + 1)
        } else if (!err.response) {
          setWarming(false)
          toast.error('Backend is taking too long. Try again in a minute.')
        } else {
          setWarming(false)
          handleLoginError(err, emailVal, passwordVal)
        }
      }
    }, 30_000)
  }

  function cancelRetry() {
    clearInterval(countRef.current)
    clearTimeout(retryRef.current)
    setWarming(false)
    setCountdown(0)
    setLoading(false)
  }

  async function manualRetry(emailVal, passwordVal) {
    clearInterval(countRef.current)
    clearTimeout(retryRef.current)
    setCountdown(0)
    setLoading(true)
    try {
      await doLogin(emailVal, passwordVal)
    } catch (err) {
      setLoading(false)
      if (!err.response) {
        startWarmupRetry(emailVal, passwordVal, retryCount + 1)
      } else {
        setWarming(false)
        handleLoginError(err, emailVal, passwordVal)
      }
    }
  }

  async function demoLogin(role) {
    const demoEmail    = role === 'admin' ? 'admin@talentai.com' : 'recruiter@talentai.com'
    const demoPassword = 'demo123'
    setEmail(demoEmail)
    setPassword(demoPassword)
    setLoading(true)
    try {
      await doLogin(demoEmail, demoPassword)
    } catch (err) {
      setLoading(false)
      handleLoginError(err, demoEmail, demoPassword)
    }
  }

  // ── Warmup screen ──────────────────────────────────────────────────────────
  if (warming) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative w-full max-w-sm">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <WifiOff size={24} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Backend is waking up</h2>
            <p className="text-sm text-gray-500 mb-1 leading-relaxed">
              The server was asleep (Render free tier). It's warming up now.
            </p>
            <p className="text-xs text-gray-400 mb-6">This only happens after 15 min of inactivity.</p>

            {/* Countdown ring */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#F3F4F6" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#185FA5" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (countdown / 30)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-brand-600">{countdown}</span>
                <span className="text-[9px] text-gray-400">secs</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-5">
              {retryCount > 1 ? `Attempt ${retryCount}/4 — ` : ''}
              Auto-retrying in {countdown} seconds…
            </p>

            <div className="flex gap-2">
              <button onClick={() => manualRetry(email || 'admin@talentai.com', password || 'demo123')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Wifi size={14} />}
                {loading ? 'Connecting…' : 'Try now'}
              </button>
              <button onClick={cancelRetry}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal login screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/30 p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Zap size={17} className="text-white" />
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900">TalentAI</div>
              <div className="text-[11px] text-gray-400">Your Sourcing Agent</div>
            </div>
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
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          {/* Demo buttons */}
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
