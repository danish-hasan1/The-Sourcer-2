import { useState, useEffect } from 'react'
import { Eye, EyeOff, Save, Check, Key, Sliders, Globe, Loader } from 'lucide-react'
import { settingsApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PROVIDERS = [
  { id:'anthropic', name:'Anthropic',     model:'claude-sonnet-4-6',       color:'bg-amber-100 text-amber-700',   dot:'bg-amber-500'  },
  { id:'openai',    name:'OpenAI',        model:'gpt-4o',                   color:'bg-green-100 text-green-700',   dot:'bg-green-500'  },
  { id:'groq',      name:'Groq',          model:'llama-3.3-70b-versatile',  color:'bg-purple-100 text-purple-700', dot:'bg-purple-500' },
  { id:'google',    name:'Google Gemini', model:'gemini-2.0-flash',         color:'bg-blue-100 text-blue-700',     dot:'bg-blue-500'   },
]

const SERP_PROVIDERS = [
  { id:'serpapi',    name:'SerpAPI',    url:'https://serpapi.com'         },
  { id:'valueserp',  name:'ValueSERP',  url:'https://www.valueserp.com'   },
  { id:'brightdata', name:'Bright Data',url:'https://brightdata.com'      },
]

export default function SettingsPage() {
  const [loading, setLoading]         = useState(true)
  const [keys, setKeys]               = useState({ anthropic:'', openai:'', groq:'', google:'', serpapi:'' })
  const [show, setShow]               = useState({})
  const [activeModel, setActiveModel] = useState('anthropic')
  const [serpProvider, setSerpProv]   = useState('serpapi')
  const [maxCandidates, setMax]       = useState(50)
  const [reqTimeout, setReqTimeout]   = useState(30)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  // Load saved settings on mount
  useEffect(() => {
    settingsApi.get()
      .then(res => {
        const s = res.data
        if (s.active_model)   setActiveModel(s.active_model)
        if (s.serp_provider)  setSerpProv(s.serp_provider)
        if (s.max_candidates) setMax(s.max_candidates)
        // Keys come back as { key: '***' } — don't overwrite local state with masked values
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleShow = k => setShow(p => ({...p,[k]:!p[k]}))
  const setKey     = k => e => setKeys(p => ({...p,[k]:e.target.value}))

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
      toast.success('Settings saved')
      setTimeout(() => setSaved(false), 2500)
    } catch {
      toast.error('Failed to save — is the backend running?')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
      <Loader size={16} className="animate-spin"/> Loading settings…
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configure AI providers, API keys, and sourcing parameters</p>
      </div>

      <div className="p-6 max-w-2xl space-y-6">
        {/* LLM Provider */}
        <Section icon={<Key size={15}/>} title="AI Language Model" sub="Select your preferred provider and enter your API key">
          <div className="space-y-3">
            {PROVIDERS.map(p => (
              <div key={p.id} onClick={() => setActiveModel(p.id)}
                className={clsx('border rounded-xl p-4 cursor-pointer transition',
                  activeModel===p.id ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={clsx('w-2 h-2 rounded-full', p.dot)} />
                  <span className="text-[13px] font-semibold text-gray-800">{p.name}</span>
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono ml-auto', p.color)}>{p.model}</span>
                  {activeModel===p.id && <Check size={14} className="text-brand-600"/>}
                </div>
                <div className="relative">
                  <input type={show[p.id]?'text':'password'} value={keys[p.id]}
                    onChange={setKey(p.id)} onClick={e=>e.stopPropagation()}
                    placeholder={`Enter ${p.name} API key…`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-400 pr-9 bg-white" />
                  <button type="button" onClick={e=>{e.stopPropagation();toggleShow(p.id)}}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show[p.id]?<EyeOff size={13}/>:<Eye size={13}/>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* SerpAPI */}
        <Section icon={<Globe size={15}/>} title="Search Provider" sub="Used to search candidate profiles across job platforms">
          <div className="space-y-2 mb-3">
            {SERP_PROVIDERS.map(p => (
              <div key={p.id} onClick={() => setSerpProv(p.id)}
                className={clsx('flex items-center gap-3 border rounded-xl p-3.5 cursor-pointer transition',
                  serpProvider===p.id ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', serpProvider===p.id?'bg-brand-500':'bg-gray-300')} />
                <span className="text-[13px] font-medium text-gray-700 flex-1">{p.name}</span>
                <a href={p.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                  className="text-[11px] text-brand-600 hover:underline">{p.url}</a>
                {serpProvider===p.id && <Check size={13} className="text-brand-600 flex-shrink-0"/>}
              </div>
            ))}
          </div>
          <div className="relative">
            <input type={show.serp?'text':'password'} value={keys.serpapi} onChange={setKey('serpapi')}
              placeholder="Enter SerpAPI key…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-400 pr-10"/>
            <button type="button" onClick={() => toggleShow('serp')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {show.serp?<EyeOff size={13}/>:<Eye size={13}/>}
            </button>
          </div>
        </Section>

        {/* Sourcing params */}
        <Section icon={<Sliders size={15}/>} title="Sourcing Parameters" sub="Default limits for all sourcing runs">
          <div className="space-y-4">
            <SliderRow label="Max candidates per run" value={maxCandidates} min={10} max={200} step={5} onChange={setMax} suffix=""/>
            <SliderRow label="Request timeout" value={reqTimeout} min={10} max={120} step={5} onChange={setReqTimeout} suffix="s"/>
          </div>
        </Section>

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-800 transition disabled:opacity-60">
          {saved ? <><Check size={15}/> Saved</> : saving ? <><Loader size={14} className="animate-spin"/> Saving…</> : <><Save size={14}/> Save settings</>}
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
        onChange={e => onChange(+e.target.value)} className="w-full accent-brand-600"/>
    </div>
  )
}
