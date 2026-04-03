import { useState } from 'react'
import { MapPin, ExternalLink, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const SOURCE_ICONS = {
  linkedin: '💼',
  github:   '🐙',
  naukri:   '🇮🇳',
  indeed:   '🌐',
  reed:     '🇬🇧',
  infojobs: '🇪🇸',
}

const STAGE_OPTIONS = ['sourced', 'shortlisted', 'in_review', 'contacted', 'rejected']

export default function CandidateList({ candidates, selected, onSelect, onStageChange }) {
  const [stagingId, setStagingId] = useState(null)

  if (!candidates?.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm">No candidates yet — click Source Profiles to start</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {candidates.map((c, i) => {
        const isSelected = selected?.id === c.id
        const scoreColor = c.score >= 75 ? 'text-brand-600' : c.score >= 60 ? 'text-amber-600' : 'text-red-500'
        const verdictCls = c.verdict === 'Strong fit' ? 'verdict-strong' : c.verdict === 'Moderate fit' ? 'verdict-moderate' : 'verdict-weak'

        return (
          <div
            key={c.id}
            onClick={() => onSelect(c)}
            className={clsx(
              'bg-white rounded-xl border px-3.5 py-3 cursor-pointer transition-all animate-fade-up card-hover',
              `delay-${Math.min(i+1,5)}`,
              isSelected ? 'border-brand-400 shadow-sm shadow-brand-100' : 'border-gray-100'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                style={{ background: c.bg, color: c.color }}>
                {c.initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-gray-900">{c.name}</span>
                  <span className="text-[10px]">{SOURCE_ICONS[c.source] || '🌐'}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {c.role} · {c.company} · {c.exp}
                </div>
              </div>

              {/* Score */}
              <div className="text-right flex-shrink-0">
                <div className={clsx('text-[18px] font-semibold leading-none', scoreColor)}>{c.score}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">/ 100</div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-2.5 mb-2">
              {c.skills?.slice(0,4).map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">{s}</span>
              ))}
              {c.gaps?.slice(0,2).map(g => (
                <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500">{g}</span>
              ))}
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-2">
              <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', verdictCls)}>{c.verdict}</span>

              {/* Stage pill + dropdown */}
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setStagingId(stagingId === c.id ? null : c.id)}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 hover:border-gray-300 transition capitalize"
                >
                  {c.stage?.replace('_',' ')}
                  <ChevronDown size={9} />
                </button>
                {stagingId === c.id && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                    {STAGE_OPTIONS.map(s => (
                      <button key={s} onClick={() => { onStageChange(c.id, s); setStagingId(null) }}
                        className={clsx('w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-50 capitalize first:rounded-t-lg last:rounded-b-lg', c.stage===s && 'text-brand-600 font-medium')}>
                        {s.replace('_',' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1" />
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <MapPin size={9} />
                {c.location}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
