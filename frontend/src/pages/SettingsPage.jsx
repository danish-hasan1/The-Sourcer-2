import { useState, useEffect } from 'react'
import { Save, Check, Sliders, Globe, Cpu, Loader, Info } from 'lucide-react'
import { settingsApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const LLM_OPTIONS = [
  { id: 'groq',      name: 'Groq',          model: 'llama-3.3-70b-versatile',  desc: 'Fastest — recommended',        color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { id: 'anthropic', name: 'Anthropic',     model: 'claude-3-5-sonnet',         desc: 'Highest quality evaluations',  color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500'  },
  { id: 'openai',    name: 'OpenAI',        model: 'gpt-4o',                    desc: 'Balanced speed & quality',     color: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  { id: 'google',    name: 'Google Gemini', model: 'gemini-2.0-flash',          desc: 'Good for large JD volumes',    color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'   },
]

const SERP_OPTIONS = [
  { id: 'serpapi',    name: 'SerpAPI',    url: 'https://serpapi.com',           desc: 'Default. Real-time Google results.' },
  { id: 'valueserp',  name: 'ValueSERP', url: 'https://www.valueserp.com',     desc: 'Cost-effective alternative.'        },
  { id: 'brightdata', name: 'Bright Data',url: 'https://brightdata.com',       desc: 'Enterprise-grade scraping.'        },
]

export default function SettingsPage() {
  const [loading, setLoading]         = useState(true)
  const [activeModel, setActiveModel] = useState('groq')
  const [serpProvider, setSerpProv]   = useState('serpapi')
  const [maxCandidates, setMax]       = useState(50)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  useEffect(() => {
    settingsApi.get()
      .then(res => {
        const s = res.data
        if (s.active_model)   setActiveModel(s.active_model)
        if (s.serp_provider)  setSerpProv(s.serp_provider)
        if (s.max_candidates) setMax(s.max_candidates)
      })
      .catch(() => {}) // silently use defaults if backend unavailable
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await settingsApi.update({
        active_model:   activeModel,
        serp_provider:  serpProvider,
        max_candidates: maxCandidates,
      })
      setSaved(true)
      toast.success('Preferences saved')
      setTimeout(() => setSaved(false), 2500)
    } catch {
      toast.error('Could not save — backend may be starting up, try again in a moment')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
      <Loader size={16} className="animate-spin" /> Loading…
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configure your preferred AI provider and sourcing parameters</p>
      </div>

      <div className="p-6 max-w-2xl space-y-5">

        {/* Info banner — API keys live in backend env vars */}
        <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-[12px] text-blue-700">
          <Info size={15} className="flex-shrink-0 mt-0.5" />
          <p>
            API keys (Groq, SerpAPI, etc.) are securely configured on the server — you don't need to manage them here.
            These preferences control which model is used and how many candidates are sourced per run.
          </p>
        </div>

        {/* LLM Provider */}
        <Section icon={<Cpu size={15}/>} title="AI Language Model" sub="Select your preferred provider for JD analysis and candidate evaluation">
          <div className="space-y-2">
            {LLM_OPTIONS.map(p => (
              <div key={p.id} onClick={() => setActiveModel(p.id)}
                className={clsx('flex items-center gap-3 border rounded-xl p-3.5 cursor-pointer transition',
                  activeModel === p.id ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', p.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-gray-800">{p.name}</span>
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono', p.color)}>{p.model}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.desc}</p>
                </div>
                {activeModel === p.id && <Check size={14} className="text-brand-600 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </Section>

        {/* Search Provider */}
        <Section icon={<Globe size={15}/>} title="Search Provider" sub="Platform used to search and discover candidate profiles">
          <div className="space-y-2">
            {SERP_OPTIONS.map(p => (
              <div key={p.id} onClick={() => setSerpProv(p.id)}
                className={clsx('flex items-center gap-3 border rounded-xl p-3.5 cursor-pointer transition',
                  serpProvider === p.id ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', serpProvider === p.id ? 'bg-brand-500' : 'bg-gray-300')} />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-gray-700">{p.name}</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.desc}</p>
                </div>
                {serpProvider === p.id && <Check size={13} className="text-brand-600 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </Section>

        {/* Sourcing Parameters */}
        <Section icon={<Sliders size={15}/>} title="Sourcing Parameters" sub="Default limits applied to every sourcing run">
          <div className="space-y-4">
            <SliderRow label="Max candidates per run" value={maxCandidates} min={10} max={200} step={5} onChange={setMax} suffix="" />
          </div>
        </Section>

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-800 transition disabled:opacity-60">
          {saved ? <><Check size={15} /> Saved</> : saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save preferences</>}
        </button>
      </div>
    </div>
  )
}

function Section({ icon, title, sub, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400">{icon}</span>
        <h3 className="text-[13px] font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-[11px] text-gray-400 mb-4">{sub}</p>
      {children}
    </div>
  )
}

function SliderRow({ label, value, min, max, step, onChange, suffix }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] text-gray-600">{label}</label>
        <span className="text-[12px] font-semibold text-brand-600">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} className="w-full accent-brand-600" />
    </div>
  )
}
