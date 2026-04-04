import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MOCK_CANDIDATES } from './SourcePage'

export default function CandidatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const c = MOCK_CANDIDATES.find(x => x.id === +id)
  if (!c) return <div className="p-6 text-gray-400">Candidate not found</div>

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">{c.name}</h1>
          <p className="text-xs text-gray-400">{c.role} · {c.company} · {c.exp}</p>
        </div>
      </div>
      <div className="p-6 max-w-2xl">
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ background: c.bg, color: c.color }}>{c.initials}</div>
            <div>
              <div className="text-lg font-semibold">{c.name}</div>
              <div className="text-sm text-gray-500">{c.role} · {c.company}</div>
              <div className="text-sm text-gray-400">{c.location}</div>
            </div>
            <div className="ml-auto text-3xl font-bold" style={{ color: c.score>=75?'#185FA5':c.score>=60?'#BA7517':'#A32D2D' }}>{c.score}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Strengths</div>
            <ul className="space-y-1">{c.str?.map((s,i)=><li key={i} className="text-sm text-gray-700">✓ {s}</li>)}</ul>
          </div>
          {c.gap_detail?.length>0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Gaps</div>
              <ul className="space-y-1">{c.gap_detail.map((g,i)=><li key={i} className="text-sm text-gray-700">⚠ {g}</li>)}</ul>
            </div>
          )}
          <div className="bg-brand-50 border-l-2 border-brand-400 rounded-r-xl p-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Top interview question</div>
            <p className="text-sm text-gray-700 italic">{c.interview_q}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
