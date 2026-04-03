import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { candidatesApi } from '../utils/api'

export default function CandidatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    candidatesApi.get(id)
      .then(res => setCandidate(res.data))
      .catch(() => setCandidate(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
      <Loader size={16} className="animate-spin" /> Loading candidate…
    </div>
  )

  if (!candidate) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 mb-3">Candidate not found</p>
        <button onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">← Go back</button>
      </div>
    </div>
  )

  const scoreColor = candidate.score >= 75 ? '#185FA5' : candidate.score >= 60 ? '#BA7517' : '#A32D2D'
  const initials = (candidate.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">{candidate.name}</h1>
          <p className="text-xs text-gray-400">{candidate.headline} · {candidate.company}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {candidate.profile_url && (
            <a href={candidate.profile_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition">
              <ExternalLink size={12} /> View Profile
            </a>
          )}
          <div className="text-3xl font-bold" style={{ color: scoreColor }}>
            {Math.round(candidate.score)}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl space-y-4">
        {/* Profile card */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold bg-brand-50 text-brand-600">
              {initials}
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{candidate.name}</div>
              <div className="text-sm text-gray-500">{candidate.headline}</div>
              <div className="text-sm text-gray-400">{candidate.company}{candidate.location ? ` · ${candidate.location}` : ''}</div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              candidate.verdict === 'Strong fit' ? 'bg-green-100 text-green-700' :
              candidate.verdict === 'Moderate fit' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>{candidate.verdict}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              candidate.shortlist_decision === 'Yes' ? 'bg-brand-100 text-brand-700' :
              candidate.shortlist_decision === 'Borderline' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-500'
            }`}>Shortlist: {candidate.shortlist_decision}</span>
          </div>
        </div>

        {/* Strengths & Risks */}
        <div className="grid grid-cols-2 gap-3">
          {candidate.biggest_strength && (
            <div className="bg-green-50 border-l-2 border-green-400 rounded-r-xl p-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Biggest Strength</div>
              <p className="text-sm text-gray-700">{candidate.biggest_strength}</p>
            </div>
          )}
          {candidate.biggest_risk && (
            <div className="bg-amber-50 border-l-2 border-amber-400 rounded-r-xl p-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Biggest Risk</div>
              <p className="text-sm text-gray-700">{candidate.biggest_risk}</p>
            </div>
          )}
        </div>

        {/* Skills */}
        {candidate.skills?.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Skills Matched</div>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Gaps */}
        {candidate.gap_detail?.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Critical Gaps</div>
            <ul className="space-y-1.5">
              {candidate.gap_detail.map((g, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">⚠</span> {g}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interview question */}
        {candidate.interview_q && (
          <div className="bg-brand-50 border-l-2 border-brand-400 rounded-r-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Top Interview Question</div>
            <p className="text-sm text-gray-700 italic">"{candidate.interview_q}"</p>
          </div>
        )}

        {/* Category scores */}
        {candidate.category_scores && Object.keys(candidate.category_scores).length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Competency Scores</div>
            <div className="space-y-2">
              {Object.entries(candidate.category_scores).map(([name, score]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{name}</span><span className="font-medium">{score}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(score, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
