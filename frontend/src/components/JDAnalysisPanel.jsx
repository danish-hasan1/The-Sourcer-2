import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TABS = ['Analysis', 'Matrix', 'Boolean']

export default function JDAnalysisPanel({ analysis, jdText, onReanalyse }) {
  const [tab, setTab] = useState(0)
  const [expanded, setExpanded] = useState(true)

  if (!analysis) return null

  const totalWeight = (analysis.primary_competencies || []).reduce((s,c)=>s+c.weight,0)
    + (analysis.secondary_competencies || []).reduce((s,c)=>s+c.weight,0)

  function copyBoolean(str) {
    navigator.clipboard.writeText(str).then(() => toast.success('Copied to clipboard'))
  }

  return (
    <div className={clsx('flex-shrink-0 flex flex-col bg-white border-r border-gray-100 transition-all', expanded ? 'w-[300px]' : 'w-10')}>
      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute z-10 -right-3 top-24 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition"
        style={{ position: 'sticky', marginLeft: 'auto', marginRight: '-12px' }}
      />

      {expanded && (
        <>
          <div className="flex border-b border-gray-100 flex-shrink-0">
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                className={clsx('flex-1 py-2.5 text-[12px] font-medium transition border-b-2',
                  tab===i ? 'text-brand-600 border-brand-500' : 'text-gray-400 border-transparent hover:text-gray-600')}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {tab === 0 && (
              <>
                <Section label="Role Objective" value={analysis.role_objective} />
                <Section label="Seniority" value={analysis.seniority} />
                <Section label="Ownership" value={analysis.ownership} />
                <div>
                  <Label>Core Competencies</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {analysis.primary_competencies?.map(c => (
                      <span key={c.name} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{c.name}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Secondary / Nice-to-have</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {analysis.secondary_competencies?.map(c => (
                      <span key={c.name} className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">{c.name}</span>
                    ))}
                  </div>
                </div>
                <Section label="Implicit Expectations" value={analysis.implicit_expectations} />
                <Section label="Evaluation Signals" value={analysis.evaluation_biases} />
                {analysis.non_negotiables?.length > 0 && (
                  <div>
                    <Label>Non-negotiables</Label>
                    <div className="mt-1.5 space-y-1">
                      {analysis.non_negotiables.map(n => (
                        <div key={n} className="flex items-center gap-2 text-[12px] text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 1 && (
              <>
                <p className="text-[11px] text-gray-400">Total weight: {totalWeight}/100</p>
                <div className="space-y-3">
                  {[...(analysis.primary_competencies||[]), ...(analysis.secondary_competencies||[])].map(c => (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-gray-700 font-medium">{c.name}</span>
                        <span className="text-[12px] text-brand-600 font-semibold">{c.weight}pts</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${c.weight}%` }} />
                      </div>
                      {c.why && <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{c.why}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 2 && analysis.boolean_strings && (
              <div className="space-y-4">
                {[
                  { label: 'Primary (balanced)', key: 'primary' },
                  { label: 'Broad (discovery)', key: 'broad' },
                  { label: 'Narrow (precision)', key: 'narrow' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label>{label}</Label>
                      <button onClick={() => copyBoolean(analysis.boolean_strings[key])}
                        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-brand-600 transition">
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-[10px] text-gray-600 leading-relaxed break-all">
                      {analysis.boolean_strings[key]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Label({ children }) {
  return <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-0.5">{children}</div>
}

function Section({ label, value }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-[12px] text-gray-700 leading-relaxed">{value}</p>
    </div>
  )
}
