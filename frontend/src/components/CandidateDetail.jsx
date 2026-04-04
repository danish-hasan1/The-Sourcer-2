import { useState } from 'react'
import { X, CheckCircle, XCircle, MessageSquare, Star, ExternalLink, Clipboard, Send, RefreshCw } from 'lucide-react'
import { candidatesApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STAGE_OPTIONS = ['sourced','shortlisted','in_review','contacted','rejected']

export default function CandidateDetail({ candidate: c, analysis, onClose, onStageChange }) {
  const [loadingQ, setLoadingQ] = useState(false)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [showQ, setShowQ] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contacts, setContacts] = useState(null)
  const [loadingOutreach, setLoadingOutreach] = useState(false)
  const [outreach, setOutreach] = useState(null)
  const [tab, setTab] = useState(0)

  if (!c) {
    return (
      <div className="w-[260px] flex-shrink-0 bg-white border-l border-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-300 px-6">
          <div className="text-3xl mb-2">👤</div>
          <p className="text-xs">Select a candidate to see their evaluation</p>
        </div>
      </div>
    )
  }

  const scoreColor = c.score >= 75 ? '#185FA5' : c.score >= 60 ? '#BA7517' : '#A32D2D'
  const verdictCls = c.verdict === 'Strong fit' ? 'verdict-strong' : c.verdict === 'Moderate fit' ? 'verdict-moderate' : 'verdict-weak'
  const circumference = 2 * Math.PI * 28
  const strokeDash = (c.score / 100) * circumference

  // Build category score bars from real evaluation data
  const categoryScores = c.category_scores || {}
  const analysisCategories = analysis?.primary_competencies || []
  const scoreEntries = Object.entries(categoryScores)

  async function generateQuestionnaire() {
    setLoadingQ(true)
    try {
      const res = await candidatesApi.questionnaire(c.id)
      setQuestionnaire(res.data.questionnaire)
      setShowQ(true)
    } catch {
      setQuestionnaire(MOCK_QUESTIONNAIRE(c))
      setShowQ(true)
    } finally {
      setLoadingQ(false)
    }
  }

  async function extractContacts() {
    setLoadingContacts(true)
    try {
      const res = await candidatesApi.getContacts(c.id)
      setContacts(res.data)
    } catch {
      setContacts({ linkedin: c.profile_url || null, email: null, note: 'Only public profile data is shown.' })
    } finally {
      setLoadingContacts(false)
    }
  }

  async function handleGenerateOutreach() {
    setLoadingOutreach(true)
    try {
      const res = await candidatesApi.generateOutreach(c.id)
      setOutreach(res.data.outreach)
    } catch {
      toast.error('Failed to generate outreach — ensure this job has been analysed')
    } finally {
      setLoadingOutreach(false)
    }
  }

  async function shortlistCandidate() {
    onStageChange('shortlisted')
    try { await candidatesApi.updateStage(c.id, 'shortlisted') } catch {}
    toast.success(`${c.name} shortlisted`)
  }

  function copyText(text, label = 'Copied') {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  return (
    <div className="w-[280px] flex-shrink-0 bg-white border-l border-gray-100 flex flex-col animate-slide-in overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start gap-2 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-gray-900 truncate">{c.name}</div>
          <div className="text-[11px] text-gray-400 truncate">{c.headline || c.role} · {c.company}</div>
        </div>
        {c.profile_url && (
          <a href={c.profile_url} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5" title="Open profile">
            <ExternalLink size={12} />
          </a>
        )}
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {['Evaluation','Interview','Outreach'].map((t,i) => (
          <button key={t} onClick={() => setTab(i)}
            className={clsx('flex-1 py-2 text-[11px] font-medium border-b-2 transition',
              tab===i ? 'text-brand-600 border-brand-500' : 'text-gray-400 border-transparent hover:text-gray-600')}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Tab 0: Evaluation ── */}
        {tab === 0 && (
          <div className="p-4 space-y-4">
            {/* Score ring */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#F3F4F6" strokeWidth="5" />
                  <circle
                    cx="32" cy="32" r="28" fill="none"
                    stroke={scoreColor} strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    transform="rotate(-90 32 32)"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[15px] font-bold" style={{ color: scoreColor }}>{Math.round(c.score)}</span>
                  <span className="text-[8px] text-gray-400">/ 100</span>
                </div>
              </div>
              <div>
                <span className={clsx('text-[11px] font-semibold px-2 py-1 rounded-full', verdictCls)}>{c.verdict}</span>
                <div className="text-[11px] text-gray-500 mt-1.5">{c.location}</div>
                {c.shortlist_decision && (
                  <div className={clsx('text-[10px] mt-0.5 font-medium',
                    c.shortlist_decision === 'Yes' ? 'text-green-600' :
                    c.shortlist_decision === 'No' ? 'text-red-500' : 'text-amber-600')}>
                    Shortlist: {c.shortlist_decision}
                  </div>
                )}
              </div>
            </div>

            {/* Category scores — dynamic from any role */}
            {scoreEntries.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Competency Scores</div>
                <div className="space-y-2">
                  {scoreEntries.map(([name, score]) => {
                    const cat = analysisCategories.find(c => c.name === name)
                    const max = cat?.weight || 100
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <div className="text-[11px] text-gray-600 flex-1 min-w-0 truncate">{name}</div>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                          <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${Math.min((score/Math.max(max,1))*100, 100)}%` }} />
                        </div>
                        <div className="text-[11px] text-gray-500 w-12 text-right flex-shrink-0">{score}/{max}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Strengths */}
            {(c.str || c.strengths)?.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Strengths</div>
                <div className="space-y-2">
                  {(c.str || c.strengths).map((s, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <CheckCircle size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-600 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps */}
            {c.gap_detail?.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Gaps</div>
                <div className="space-y-2">
                  {c.gap_detail.map((g, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <XCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-600 leading-relaxed">{g}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision snapshot */}
            {(c.biggest_strength || c.biggest_risk) && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Decision Snapshot</div>
                {c.biggest_strength && (
                  <div className="text-[11px] text-gray-600"><span className="text-gray-400">Strength: </span>{c.biggest_strength}</div>
                )}
                {c.biggest_risk && (
                  <div className="text-[11px] text-gray-600"><span className="text-gray-400">Risk: </span>{c.biggest_risk}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 1: Interview ── */}
        {tab === 1 && (
          <div className="p-4 space-y-4">
            {c.interview_q && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">Top Question</div>
                <div className="bg-brand-50 border-l-2 border-brand-400 rounded-r-xl p-3">
                  <p className="text-[12px] text-gray-700 leading-relaxed italic">{c.interview_q}</p>
                </div>
              </div>
            )}

            <div>
              <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">CV Enrichment Questionnaire</div>
              {!showQ ? (
                <button
                  onClick={generateQuestionnaire}
                  disabled={loadingQ}
                  className="w-full py-2.5 border border-gray-200 rounded-lg text-[12px] text-gray-600 hover:bg-gray-50 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loadingQ ? 'Generating…' : <><MessageSquare size={13} /> Generate questionnaire</>}
                </button>
              ) : (
                <div className="space-y-3">
                  {questionnaire?.sections?.map((sec, si) => (
                    <div key={si}>
                      <div className="text-[11px] font-semibold text-gray-700 mb-1.5">{sec.title}</div>
                      <div className="space-y-2">
                        {sec.questions?.map((q, qi) => (
                          <div key={qi} className="bg-gray-50 rounded-lg p-2.5">
                            <span className="text-[10px] text-gray-400 font-medium">{si+1}.{qi+1}</span>
                            <p className="text-[11px] text-gray-700 mt-0.5 leading-relaxed">{q}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => copyText(questionnaire?.sections?.flatMap(s=>s.questions).join('\n\n'), 'Questions copied')}
                    className="w-full py-2 border border-gray-200 rounded-lg text-[11px] text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition"
                  >
                    <Clipboard size={11} /> Copy all questions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 2: Outreach ── */}
        {tab === 2 && (
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Generate a personalised AI outreach message for this candidate, grounded in their specific profile and the role requirements.
            </p>

            {!outreach ? (
              <button
                onClick={handleGenerateOutreach}
                disabled={loadingOutreach}
                className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-[12px] font-medium hover:bg-brand-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loadingOutreach ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><Send size={13} /> Generate outreach message</>}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Connection note */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">LinkedIn connection note</div>
                    <button onClick={() => copyText(outreach.subject, 'Connection note copied')}
                      className="text-[10px] text-brand-600 hover:underline flex items-center gap-1">
                      <Clipboard size={10} /> Copy
                    </button>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-[12px] text-gray-700 leading-relaxed border border-blue-100">
                    {outreach.subject}
                  </div>
                </div>

                {/* Full message */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">InMail / Email</div>
                    <button onClick={() => copyText(outreach.message, 'Message copied')}
                      className="text-[10px] text-brand-600 hover:underline flex items-center gap-1">
                      <Clipboard size={10} /> Copy
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-[12px] text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-wrap">
                    {outreach.message}
                  </div>
                </div>

                {/* Follow-up */}
                {outreach.follow_up && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Follow-up (5 days)</div>
                      <button onClick={() => copyText(outreach.follow_up, 'Follow-up copied')}
                        className="text-[10px] text-brand-600 hover:underline flex items-center gap-1">
                        <Clipboard size={10} /> Copy
                      </button>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-[12px] text-gray-700 leading-relaxed border border-amber-100 whitespace-pre-wrap">
                      {outreach.follow_up}
                    </div>
                  </div>
                )}

                {/* Regen + LinkedIn link */}
                <div className="flex gap-2">
                  <button onClick={() => { setOutreach(null); handleGenerateOutreach() }}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-[11px] text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition">
                    <RefreshCw size={11} /> Regenerate
                  </button>
                  {c.profile_url && (
                    <a href={c.profile_url} target="_blank" rel="noreferrer"
                      className="flex-1 py-2 border border-brand-200 bg-brand-50 rounded-lg text-[11px] text-brand-600 hover:bg-brand-100 flex items-center justify-center gap-1.5 transition">
                      <ExternalLink size={11} /> Open profile
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-gray-100 space-y-2 flex-shrink-0">
        <button
          onClick={shortlistCandidate}
          disabled={c.stage === 'shortlisted'}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-800 text-white rounded-lg text-[12px] font-medium transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Star size={13} />
          {c.stage === 'shortlisted' ? 'Shortlisted ✓' : 'Shortlist Candidate'}
        </button>
        <select
          value={c.stage}
          onChange={e => onStageChange(e.target.value)}
          className="w-full py-2 px-3 border border-gray-200 rounded-lg text-[12px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400 capitalize bg-white"
        >
          {STAGE_OPTIONS.map(s => (
            <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function MOCK_QUESTIONNAIRE(c) {
  return {
    sections: [
      {
        title: '1. Role-Relevant Experience Clarification',
        questions: [
          `Can you walk me through a specific project you owned end-to-end — from problem definition through to post-launch metrics?`,
          `What has been your most complex cross-functional initiative and how did you drive alignment across teams?`,
        ]
      },
      {
        title: '2. Depth, Complexity & Proficiency',
        questions: [
          `How deeply have you worked in this domain and at what scale?`,
          `What tools and methodologies do you use when evaluating performance and prioritising work?`,
        ]
      },
      {
        title: '3. Ownership, Impact & Outcomes',
        questions: [
          `What is the most significant business outcome you can point to from a project you owned — and what was your specific contribution?`,
          `Describe a situation where you had to influence a direction without direct authority — how did you approach it?`,
        ]
      },
    ]
  }
}
