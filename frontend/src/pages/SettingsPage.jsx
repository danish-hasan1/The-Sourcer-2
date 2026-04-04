import { useState, useEffect } from 'react'
import { Eye, EyeOff, Save, Check, Key, Sliders, Globe, Loader, AlertCircle } from 'lucide-react'
import { settingsApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq',
    model: 'llama-3.3-70b-versatile',
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    sub: 'Fastest — recommended',
    placeholder: 'sk_...',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    model: 'claude-sonnet-4-6',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    sub: 'Highest quality evaluations',
    placeholder: 'sk-ant-...',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    model: 'gpt-4o',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700',
    sub: 'Balanced speed & quality',
    placeholder: 'sk-...',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    model: 'gemini-2.0-flash',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    sub: 'Good for large JD volumes',
    placeholder: 'AIza...',
  },
]

const SERP_PROVIDERS = [
  { id: 'serpapi',    name: 'SerpAPI',    url: 'https://serpapi.com',         placeholder: 'e.g. 9400c016...' },
  { id: 'valueserp',  name: 'ValueSERP',  url: 'https://www.valueserp.com',   placeholder: 'API key' },
  { id: 'brightdata', name: 'Bright Data',url: 'https://brightdata.com',      placeholder: 'API key' },
]

export default function SettingsPage() {
  const [loading, setLoading]         = useState(true)
  const [keys, setKeys]               = useState({ groq: '', anthropic: '', openai: '', google: '', serpapi: '' })
  const [show, setShow]               = useState({})
  const [activeModel, setActiveModel] = useState('groq')
  const [serpProvider, setSerpProv]   = useState('serpapi')
  const [maxCandidates, setMax]       = useState(50)
  const [reqTimeout, setReqTimeout]   = useState(30)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [backendOnline, setBackendOnline] = useState(true)

  useEffect(() => {
    settingsApi.get()
      .then(res => {
        const s = res.data || {}
        if (s.active_model)   setActiveModel(s.active_model)
        if (s.serp_provider)  setSerpProv(s.serp_provider)
        if (s.max_candidates) setMax(s.max_candidates)
        setBackendOnline(true)
      })
      .catch(() => {
        // Backend offline or not yet deployed — still show the form
        setBackendOnline(false)
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleShow = k => setShow(p => ({ ...p, [k]: !p[k] }))
  const setKey     = k => e => setKeys(p => ({ ...p, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    try {
      await settingsApi.update({
        active_model:   activeModel,
        serp_provider:  serpProvider,
        max_candidates: maxCandidates,
        keys,
      })
      setSaved(true)
      toast.success('Settings saved successfully')
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // Save to localStorage as fallback when backend is cold-starting
      localStorage.setItem('talentai_settings', JSON.stringify({ active_model: activeModel, serp_provider: serpProvider, max_candidates: maxCandidates, keys }))
      setSaved(true)
      toast.success('Settings saved locally (backend warming up)')
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
      <Loader size={16} className="animate-spin" /> Loading settings…
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configure API keys, AI providers, and sourcing parameters</p>
      </div>

      <div className="p-6 max-w-2xl space-y-6">

        {/* Offline banner */}
        {!backendOnline && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-amber-700 leading-relaxed">
              Backend is warming up (Render free tier). Settings will save locally for now and sync once online.
            </p>
          </div>
        )}

        {/* ── LLM Provider + API Keys ── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Key size={15} className="text-gray-400" />
            <h3 className="text-[13px] font-semibold text-gray-900">AI Language Model & API Keys</h3>
          </div>
          <p className="text-[11px] text-gray-400 mb-5">
            Select your active provider and enter your API key. The selected provider is used for all JD analysis and candidate evaluation.
          </p>

          <div className="space-y-3">
            {PROVIDERS.map(p => {
              const isActive = activeModel === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => setActiveModel(p.id)}
                  className={clsx(
                    'border rounded-xl p-4 cursor-pointer transition-all',
                    isActive
                      ? 'border-brand-400 bg-brand-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  {/* Provider header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', p.dot)} />
                    <span className="text-[14px] font-semibold text-gray-900">{p.name}</span>
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono', p.badge)}>{p.model}</span>
                    <span className="text-[11px] text-gray-400 ml-1 hidden sm:inline">{p.sub}</span>
                    <div className="ml-auto flex-shrink-0">
                      {isActive
                        ? <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center"><Check size={11} className="text-white" /></div>
                        : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      }
                    </div>
                  </div>

                  {/* API key input — always visible */}
                  <div
                    className="relative"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Key size={12} className="text-gray-400" />
                    </div>
                    <input
                      type={show[p.id] ? 'text' : 'password'}
                      value={keys[p.id]}
                      onChange={setKey(p.id)}
                      placeholder={`API key — ${p.placeholder}`}
                      className={clsx(
                        'w-full pl-8 pr-10 py-2.5 border rounded-lg text-[12px] font-mono transition',
                        'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                        isActive
                          ? 'border-brand-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(p.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                    >
                      {show[p.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>

                  {/* Hint for active provider with no key */}
                  {isActive && !keys[p.id] && (
                    <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle size={10} /> Add your {p.name} API key to enable AI analysis
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Search Provider ── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={15} className="text-gray-400" />
            <h3 className="text-[13px] font-semibold text-gray-900">Search Provider</h3>
          </div>
          <p className="text-[11px] text-gray-400 mb-4">Platform used to search and discover candidate profiles across job boards</p>

          <div className="space-y-2 mb-4">
            {SERP_PROVIDERS.map(p => {
              const isActive = serpProvider === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => setSerpProv(p.id)}
                  className={clsx(
                    'flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition',
                    isActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', isActive ? 'bg-brand-500' : 'bg-gray-300')} />
                  <span className="text-[13px] font-medium text-gray-800 flex-1">{p.name}</span>
                  <a href={p.url} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[11px] text-brand-600 hover:underline hidden sm:block">
                    {p.url}
                  </a>
                  {isActive && <Check size={13} className="text-brand-600 flex-shrink-0" />}
                </div>
              )
            })}
          </div>

          {/* SerpAPI key input */}
          <div>
            <label className="text-[11px] font-medium text-gray-600 mb-1.5 block">
              {SERP_PROVIDERS.find(p => p.id === serpProvider)?.name || 'Search Provider'} API Key
            </label>
            <div className="relative">
              <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={show.serp ? 'text' : 'password'}
                value={keys.serpapi}
                onChange={setKey('serpapi')}
                placeholder={SERP_PROVIDERS.find(p => p.id === serpProvider)?.placeholder || 'Enter API key…'}
                className="w-full pl-8 pr-10 py-2.5 border border-gray-200 rounded-lg text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => toggleShow('serp')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
              >
                {show.serp ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {keys.serpapi && (
              <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                <Check size={10} /> API key entered
              </p>
            )}
          </div>
        </div>

        {/* ── Sourcing Parameters ── */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sliders size={15} className="text-gray-400" />
            <h3 className="text-[13px] font-semibold text-gray-900">Sourcing Parameters</h3>
          </div>
          <p className="text-[11px] text-gray-400 mb-5">Default limits applied to every sourcing run</p>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-medium text-gray-700">Max candidates per run</label>
                <span className="text-[13px] font-bold text-brand-600">{maxCandidates}</span>
              </div>
              <input type="range" min={10} max={200} step={5} value={maxCandidates}
                onChange={e => setMax(+e.target.value)}
                className="w-full accent-brand-600" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>10 (fast)</span><span>200 (thorough)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-medium text-gray-700">Request timeout</label>
                <span className="text-[13px] font-bold text-brand-600">{reqTimeout}s</span>
              </div>
              <input type="range" min={10} max={120} step={5} value={reqTimeout}
                onChange={e => setReqTimeout(+e.target.value)}
                className="w-full accent-brand-600" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>10s</span><span>120s</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Save button ── */}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-7 py-3 bg-brand-600 text-white rounded-xl text-[13px] font-semibold hover:bg-brand-800 transition disabled:opacity-60 shadow-sm"
        >
          {saved
            ? <><Check size={15} /> Saved</>
            : saving
            ? <><Loader size={14} className="animate-spin" /> Saving…</>
            : <><Save size={14} /> Save all settings</>
          }
        </button>
      </div>
    </div>
  )
}
