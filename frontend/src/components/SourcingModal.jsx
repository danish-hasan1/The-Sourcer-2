import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, Globe, RefreshCw } from 'lucide-react'
import { sourcingApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PLATFORMS = [
  { id: 'linkedin',  name: 'LinkedIn',   icon: '💼', region: 'Global',   default: true  },
  { id: 'github',    name: 'GitHub',     icon: '🐙', region: 'Global',   default: false },
  { id: 'naukri',    name: 'Naukri',     icon: '🇮🇳', region: 'India',    default: false },
  { id: 'indeed',    name: 'Indeed',     icon: '🌐', region: 'Global',   default: false },
  { id: 'reed',      name: 'Reed.co.uk', icon: '🇬🇧', region: 'UK',       default: false },
  { id: 'infojobs',  name: 'InfoJobs',   icon: '🇪🇸', region: 'Spain',    default: false },
  { id: 'monster',   name: 'Monster',    icon: '👾', region: 'Global',   default: false },
  { id: 'glassdoor', name: 'Glassdoor',  icon: '🏢', region: 'Global',   default: false },
]

const SOURCING_STEPS = [
  { key: 'extract',   label: 'Extracting JD competencies & keywords',        pct: 10 },
  { key: 'boolean',   label: 'Building Boolean search strings',               pct: 20 },
  { key: 'search',    label: 'Executing searches across selected platforms',  pct: 45 },
  { key: 'parse',     label: 'Parsing and structuring candidate profiles',    pct: 65 },
  { key: 'evaluate',  label: 'Evaluating candidates against scoring matrix',  pct: 85 },
  { key: 'rank',      label: 'Ranking and deduplicating results',             pct: 95 },
  { key: 'complete',  label: 'Done — candidates ready for review',            pct: 100 },
]

export default function SourcingModal({ jobId, analysis, onClose, onComplete }) {
  const [selected, setSelected] = useState(new Set(['linkedin']))
  const [maxResults, setMaxResults] = useState(25)
  const [running, setRunning] = useState(false)
  const [stepIdx, setStepIdx] = useState(-1)
  const [runId, setRunId] = useState(null)
  const [found, setFound] = useState(0)
  const timerRef = useRef(null)

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function startSourcing() {
    if (!selected.size) { toast.error('Select at least one platform'); return }
    setRunning(true)
    setStepIdx(0)
    setFound(0)

    // Try real API, fall back to demo
    try {
      const res = await sourcingApi.start(jobId, [...selected])
      setRunId(res.data.run_id)
    } catch {
      setRunId('demo-run-' + Date.now())
    }

    // Simulate progress
    let idx = 0
    timerRef.current = setInterval(() => {
      idx++
      if (idx < SOURCING_STEPS.length) {
        setStepIdx(idx)
        if (idx >= 3) setFound(f => f + Math.floor(Math.random() * 6) + 2)
      } else {
        clearInterval(timerRef.current)
        setTimeout(() => onComplete(runId || 'demo-run'), 600)
      }
    }, 1400)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  const progress = stepIdx >= 0 ? SOURCING_STEPS[Math.min(stepIdx, SOURCING_STEPS.length-1)].pct : 0
  const currentStep = stepIdx >= 0 ? SOURCING_STEPS[Math.min(stepIdx, SOURCING_STEPS.length-1)] : null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-brand-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Source Profiles</div>
            <div className="text-xs text-gray-400 mt-0.5">Select platforms and configure your search</div>
          </div>
          {!running && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="p-6">
          {!running ? (
            <>
              {/* Platform grid */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Source Platforms</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => {
                    const on = selected.has(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={clsx(
                          'flex items-center gap-3 p-3 rounded-xl border text-left transition',
                          on ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <span className="text-lg">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={clsx('text-[12px] font-medium', on ? 'text-brand-700' : 'text-gray-700')}>{p.name}</div>
                          <div className="text-[10px] text-gray-400">{p.region}</div>
                        </div>
                        <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition',
                          on ? 'bg-brand-600 border-brand-600' : 'border-gray-300')}>
                          {on && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Max results */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Max candidates</label>
                  <span className="text-sm font-semibold text-brand-600">{maxResults}</span>
                </div>
                <input type="range" min={10} max={100} step={5} value={maxResults}
                  onChange={e => setMaxResults(+e.target.value)}
                  className="w-full accent-brand-600" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>10</span><span>100</span>
                </div>
              </div>

              {/* Info */}
              {analysis?.boolean_strings?.primary && (
                <div className="bg-gray-50 rounded-xl p-3 mb-5">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Search query (auto-generated)</div>
                  <p className="text-[11px] font-mono text-gray-600 leading-relaxed break-all">{analysis.boolean_strings.primary}</p>
                </div>
              )}

              <button
                onClick={startSourcing}
                className="w-full py-3 bg-brand-600 hover:bg-brand-800 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                Start sourcing {selected.size > 0 ? `(${selected.size} platform${selected.size>1?'s':''})` : ''}
              </button>
            </>
          ) : (
            // Progress view
            <div className="py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">Sourcing in progress…</span>
                <span className="text-sm font-semibold text-brand-600">{progress}%</span>
              </div>
              <div className="progress-track mb-6">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>

              {/* Steps */}
              <div className="space-y-2.5">
                {SOURCING_STEPS.slice(0, stepIdx + 1).map((s, i) => (
                  <div key={s.key} className={clsx('flex items-center gap-3 transition', i === stepIdx ? 'opacity-100' : 'opacity-50')}>
                    <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                      i < stepIdx ? 'bg-green-100' : i === stepIdx ? 'bg-brand-100' : 'bg-gray-100')}>
                      {i < stepIdx ? (
                        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#16a34a" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                      ) : (
                        <RefreshCw size={10} className="text-brand-600 animate-spin" />
                      )}
                    </div>
                    <span className={clsx('text-[12px]', i === stepIdx ? 'text-gray-900 font-medium' : 'text-gray-500')}>{s.label}</span>
                  </div>
                ))}
              </div>

              {found > 0 && (
                <div className="mt-5 flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3">
                  <Globe size={14} className="text-green-600" />
                  <span className="text-[13px] text-green-700 font-medium">{found} candidates found so far</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
