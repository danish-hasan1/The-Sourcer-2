import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../utils/api'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.signup(form)
      setAuth(res.data.access_token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

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
              <div className="text-[11px] text-gray-400">Sourcing Platform</div>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-gray-500 mb-6">Start sourcing smarter</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key:'name',     label:'Full name',     type:'text',     placeholder:'Jane Smith' },
              { key:'company',  label:'Company',       type:'text',     placeholder:'Acme Corp' },
              { key:'email',    label:'Work email',    type:'email',    placeholder:'jane@acme.com' },
              { key:'password', label:'Password',      type:'password', placeholder:'Min. 8 characters' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  required
                  minLength={f.key === 'password' ? 8 : undefined}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
